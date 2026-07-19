import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "../../../lib/supabase/auth";
import { authCookieName } from "../../../lib/supabase/config";
import { DAILY_GENERATION_LIMIT, QuotaConfigurationError, reserveDailyGeneration } from "../../../lib/supabase/quota";

export const runtime = "nodejs";
export const maxDuration = 120;

const model = "@cf/black-forest-labs/flux-1-schnell";

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
  const cookie = request.headers.get("cookie") || "";
  const accessToken = cookie
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${authCookieName}=`))
    ?.slice(authCookieName.length + 1);
  const user = accessToken ? await getAuthenticatedUser(accessToken) : null;

  if (!user || user.isAnonymous) {
    return NextResponse.json({ error: "Sign in with an email address to generate sprites." }, { status: 401 });
  }

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !token) {
    return NextResponse.json(
      { error: "Generation is not configured yet. Add your Cloudflare Account ID and Workers AI API token to Vercel." },
      { status: 503 },
    );
  }

  let body: GenerationRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The request body must be valid JSON." }, { status: 400 });
  }

  const prompt = cleanPrompt(body.prompt);
  const style = typeof body.style === "string" && allowedStyles.includes(body.style) ? body.style : null;
  const action = typeof body.action === "string" && allowedActions.includes(body.action) ? body.action : null;
  const frames = typeof body.frames === "number" && allowedFrames.includes(body.frames) ? body.frames : null;

  if (!prompt || !style || !action || !frames) {
    return NextResponse.json({ error: "Please provide a valid character prompt and generator settings." }, { status: 400 });
  }

  let quota;
  try {
    quota = await reserveDailyGeneration(user.id);
  } catch (error) {
    console.error("Supabase generation quota check failed", error);
    const message =
      error instanceof QuotaConfigurationError
        ? "Sign-in and daily quota protection are not configured yet."
        : "Daily quota protection is temporarily unavailable. Please try again shortly.";
    return NextResponse.json({ error: message }, { status: 503 });
  }

  if (!quota.allowed) {
    return NextResponse.json(
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
    `Animation request: ${action}. Show exactly ${frames} clearly separated sequential animation poses in a horizontal row.`,
    "Keep the exact same character, outfit, proportions, and palette across every pose.",
    "Use a perfectly flat, solid #00ff00 chroma-key background with no gradients, shadows, floor, scenery, or texture.",
    "Do not use bright green anywhere on the character or props. Center each full-body pose within an evenly spaced cell, with generous padding.",
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
      },
    );

    const payload = (await response.json()) as {
      success?: boolean;
      result?: { image?: string };
      errors?: Array<{ code?: number; message?: string }>;
    };

    if (!response.ok || !payload.success || !payload.result?.image) {
      const fallback =
        response.status === 429
          ? "Today's free generation capacity is busy. Please try again tomorrow."
          : "Generation did not complete. Please try a simpler character description.";
      console.error("Cloudflare image generation failed", {
        status: response.status,
        errors: payload.errors,
        requestId: response.headers.get("cf-ray"),
      });
      return NextResponse.json({ error: fallback }, { status: response.status || 502 });
    }

    return NextResponse.json({
      image: `data:image/jpeg;base64,${payload.result.image}`,
      createdAt: new Date().toISOString(),
      quota: { limit: DAILY_GENERATION_LIMIT, used: quota.used, remaining: quota.remaining },
    });
  } catch (error) {
    console.error("Cloudflare image generation request failed", error);
    return NextResponse.json({ error: "We could not reach the image service. Please try again." }, { status: 502 });
  }
}
