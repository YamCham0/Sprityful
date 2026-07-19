import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

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
  const key = process.env.OPENAI_API_KEY;

  if (!key) {
    return NextResponse.json(
      { error: "Generation is not configured yet. Add OPENAI_API_KEY to your Vercel environment variables." },
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

  const imagePrompt = [
    "Create a production-ready 2D game sprite sheet.",
    `Character brief: ${prompt}`,
    `Art direction: ${style} pixel art, crisp nearest-neighbor pixels, tightly controlled palette, readable silhouette.`,
    `Animation request: ${action}. Show exactly ${frames} clearly separated sequential animation poses in a horizontal row.`,
    "Keep the exact same character, outfit, proportions, and palette across every pose.",
    "Use a perfectly flat transparent background. Center each full-body pose within an evenly spaced cell, with generous padding.",
    "No title, labels, letters, numbers, UI, watermark, borders, floor, scenery, cast shadows, or additional characters.",
  ].join(" ");

  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-image-1.5",
        prompt: imagePrompt,
        size: "1536x1024",
        quality: "medium",
        background: "transparent",
        output_format: "png",
        moderation: "auto",
      }),
    });

    const payload = (await response.json()) as {
      data?: Array<{ b64_json?: string }>;
      error?: { code?: string; message?: string };
    };

    if (!response.ok || !payload.data?.[0]?.b64_json) {
      const fallback =
        payload.error?.code === "moderation_blocked"
          ? "That prompt could not be generated. Try a different character description."
          : "Generation did not complete. Please try again in a moment.";
      console.error("Image generation failed", {
        status: response.status,
        code: payload.error?.code,
        message: payload.error?.message,
        requestId: response.headers.get("x-request-id"),
      });
      return NextResponse.json({ error: fallback }, { status: response.status || 502 });
    }

    return NextResponse.json({
      image: `data:image/png;base64,${payload.data[0].b64_json}`,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Image generation request failed", error);
    return NextResponse.json({ error: "We could not reach the image service. Please try again." }, { status: 502 });
  }
}
