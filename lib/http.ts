import { NextResponse } from "next/server";

export const MAX_GENERATION_REQUEST_BYTES = 8 * 1024;
export const MAX_SESSION_REQUEST_BYTES = 9 * 1024;

type JsonBodyResult<T> =
  | { body: T; error: null }
  | { body: null; error: "invalid" | "too_large" };

function declaredBodySize(request: Request) {
  const value = request.headers.get("content-length");
  if (!value) return null;

  const size = Number(value);
  return Number.isSafeInteger(size) && size >= 0 ? size : null;
}

export function hasJsonContentType(request: Request) {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  return contentType === "application/json" || Boolean(contentType?.endsWith("+json"));
}

export async function readJsonBody<T>(request: Request, maximumBytes: number): Promise<JsonBodyResult<T>> {
  const declaredSize = declaredBodySize(request);
  if (declaredSize !== null && declaredSize > maximumBytes) {
    return { body: null, error: "too_large" };
  }

  if (!request.body) return { body: null, error: "invalid" };

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let receivedBytes = 0;
  let text = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      receivedBytes += value.byteLength;
      if (receivedBytes > maximumBytes) {
        try {
          await reader.cancel();
        } catch {
          // The request has already exceeded its limit; closing a broken stream is best effort.
        }
        return { body: null, error: "too_large" };
      }

      text += decoder.decode(value, { stream: true });
    }

    text += decoder.decode();
    return { body: JSON.parse(text) as T, error: null };
  } catch {
    return { body: null, error: "invalid" };
  } finally {
    reader.releaseLock();
  }
}

export function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
  response.headers.set("Pragma", "no-cache");
  return response;
}
