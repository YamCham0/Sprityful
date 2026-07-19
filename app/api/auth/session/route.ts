import { hasJsonContentType, MAX_SESSION_REQUEST_BYTES, noStoreJson, readJsonBody } from "../../../../lib/http";
import { getAuthenticatedUser } from "../../../../lib/supabase/auth";
import { authCookieName, getAccessTokenFromCookieHeader, MAX_ACCESS_TOKEN_LENGTH } from "../../../../lib/supabase/config";

export const runtime = "nodejs";

function unauthorized() {
  return noStoreJson({ error: "Please sign in to generate sprites." }, { status: 401 });
}

export async function GET(request: Request) {
  const token = getAccessTokenFromCookieHeader(request.headers.get("cookie"));

  const user = token ? await getAuthenticatedUser(token) : null;
  if (!user || user.isAnonymous) return unauthorized();

  return noStoreJson({ user: { id: user.id, email: user.email } });
}

export async function POST(request: Request) {
  if (!hasJsonContentType(request)) {
    return noStoreJson({ error: "The sign-in response was invalid." }, { status: 400 });
  }

  const parsed = await readJsonBody<{ accessToken?: unknown }>(request, MAX_SESSION_REQUEST_BYTES);
  if (parsed.error === "too_large") {
    return noStoreJson({ error: "The sign-in response was invalid." }, { status: 413 });
  }
  if (parsed.error) {
    return noStoreJson({ error: "The sign-in response was invalid." }, { status: 400 });
  }

  const accessToken = typeof parsed.body.accessToken === "string" ? parsed.body.accessToken : "";
  if (!accessToken || accessToken.length > MAX_ACCESS_TOKEN_LENGTH) return unauthorized();

  const user = await getAuthenticatedUser(accessToken);
  if (!user || user.isAnonymous) return unauthorized();

  const response = noStoreJson({ user: { id: user.id, email: user.email } });
  response.cookies.set({
    name: authCookieName,
    value: accessToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60,
  });
  return response;
}

export async function DELETE() {
  const response = noStoreJson({ ok: true });
  response.cookies.set({
    name: authCookieName,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
