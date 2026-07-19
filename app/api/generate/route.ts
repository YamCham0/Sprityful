import { hasJsonContentType, MAX_GENERATION_REQUEST_BYTES, noStoreJson, readJsonBody } from "../../../lib/http";
import { getAuthenticatedUser } from "../../../lib/supabase/auth";
import { getAccessTokenFromCookieHeader } from "../../../lib/supabase/config";
import { DAILY_GENERATION_LIMIT, QuotaConfigurationError, reserveDailyGeneration } from "../../../lib/supabase/quota";

export const runtime = "nodejs";
export const maxDuration = 120;

const model = "@cf/black-forest-labs/flux-1-schnell";
const IMAGE_REQUEST_TIMEOUT_MS = 110_000;

const allowedStyles = ["16-bit adventure", "Cozy fantasy", "Neon arcade", "Pocket horror"];
const allowedActions = ["Idle + run", "Walk cycle", "Attack combo", "Spell cast"];
const allowedFrames = [4, 6, 8];

type GenerationRequest = {
  prompt?: unknown;
  style?: unknown;
  action?: unknown;
  frames?: unknown;
};

function cleanPrompt(value: unknown) {
  if (typeof value !== "string") return null;
  const prompt = value.trim().replace(/\s+/g, " ");
  return prompt.length >= 4 && prompt.length <= 480 ? prompt : null;
}

export async function POST(request: Request) {
  const accessToken = getAccessTokenFromCookieHeader(request.headers.get("cookie"));
  const user = accessToken ? await getAuthenticatedUser(accessToken) : null;

  if (!user || user.isAnonymous) {
    return noStoreJson({ error: "Sign in with an email address to generate sprites." }, { status: 401 });
  }

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !token) {
    return noStoreJson(
      { error: "Generation is not configured yet. Add your Cloudflare Account ID and Workers AI API token to Vercel." },
      { status: 503 },
    );
  }

  if (!hasJsonContentType(request)) {
    return noStoreJson({ error: "The request body must be valid JSON." }, { status: 400 });
  }

  const parsed = await readJsonBody<GenerationRequest>(request, MAX_GENERATION_REQUEST_BYTES);
  if (parsed.error === "too_large") {
    return noStoreJson({ error: "The request is too large. Please try a shorter character description." }, { status: 413 });
  }
  if (parsed.error) {
    return noStoreJson({ error: "The request body must be valid JSON." }, { status: 400 });
  }

  const body = parsed.body;
  const prompt = cleanPrompt(body.prompt);
  const style = typeof body.style === "string" && allowedStyles.includes(body.style) ? body.style : null;
  const action = typeof body.action === "string" && allowedActions.includes(body.action) ? body.action : null;
  const frames = typeof body.frames === "number" && allowedFrames.includes(body.frames) ? body.frames : null;

  if (!prompt || !style || !action || !frames) {
    return noStoreJson({ error: "Please provide a valid character prompt and generator settings." }, { status: 400 });
  }

  let quota;
  if (user.hasUnlimitedTestGenerations) {
    quota = { allowed: true, used: 0, remaining: 0, unlimited: true };
  } else {
    try {
      quota = await reserveDailyGeneration(user.id);
    } catch (error) {
      console.error("Supabase generation quota check failed", error);
      const message =
        error instanceof QuotaConfigurationError
          ? "Sign-in and daily quota protection are not configured yet."
          : "Daily quota protection is temporarily unavailable. Please try again shortly.";
      return noStoreJson({ error: message }, { status: 503 });
    }
  }

  if (!quota.allowed) {
    return noStoreJson(
      {
        error: `You have reached your ${DAILY_GENERATION_LIMIT} generations for today. Come back tomorrow.`,
        quota: { limit: DAILY_GENERATION_LIMIT, used: quota.used, remaining: quota.remaining },
      },
      { status: 429 },
    );
  }

  const imagePrompt = [
    "Create a production-ready 2D game sprite sheet.",
    `Character brief: ${prompt}`,
    `Art direction: ${style} pixel art, crisp nearest-neighbor pixels, tightly controlled palette, readable silhouette.`,
    `Animation request: ${action}. Show exactly ${frames} clearly separated sequential character poses in a horizontal row.`,
    "Keep the exact same character, outfit, proportions, and palette across every pose.",
    "Use a perfectly flat, solid #00ff00 chroma-key background with no gradients, shadows, floor, scenery, or texture.",
    "Do not use bright green anywhere on the character or props. Center each pose within an evenly spaced cell, with generous padding.",
    "No title, labels, letters, numbers, UI, watermark, borders, cast shadows, or additional characters.",
  ].join(" ");

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${model}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: imagePrompt,
          steps: 4,
          seed: Math.floor(Math.random() * 2_147_483_647),
        }),
        signal: AbortSignal.timeout(IMAGE_REQUEST_TIMEOUT_MS),
      },
    );

    const payload = (await response.json()) as {
      success?: boolean;
      result?: { image?: string };
      errors?: Array<{ code?: number; message?: string }>;
    };

    if (!response.ok || !payload.success || !payload.result?.image) {
      const blockedBySafetyFilter = payload.errors?.some((error) => /nsfw/i.test(error.message ?? ""));
      const fallback = response.status === 429
        ? "Today's free generation capacity is busy. Please try again tomorrow."
        : blockedBySafetyFilter
          ? "The image service blocked this prompt. Try a more neutral character description."
          : "Generation did not complete. Please try a simpler character description.";
      console.error("Cloudflare image generation failed", {
        status: response.status,
        errors: payload.errors,
        requestId: response.headers.get("cf-ray"),
      });
      return noStoreJson({ error: fallback }, { status: response.status || 502 });
    }

    return noStoreJson({
      image: `data:image/jpeg;base64,${payload.result.image}`,
      createdAt: new Date().toISOString(),
      quota: { limit: DAILY_GENERATION_LIMIT, used: quota.used, remaining: quota.remaining },
    });
  } catch (error) {
    console.error("Cloudflare image generation request failed", error);
    return noStoreJson({ error: "We could not reach the image service. Please try again." }, { status: 502 });
  }
}
