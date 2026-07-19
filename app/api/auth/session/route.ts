import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "../../../../lib/supabase/auth";
import { authCookieName } from "../../../../lib/supabase/config";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "Please sign in to generate sprites." }, { status: 401 });
}

export async function GET(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  const token = cookie
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${authCookieName}=`))
    ?.slice(authCookieName.length + 1);

  const user = token ? await getAuthenticatedUser(token) : null;
  if (!user || user.isAnonymous) return unauthorized();

  return NextResponse.json({ user: { id: user.id, email: user.email } });
}

export async function POST(request: Request) {
  let body: { accessToken?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The sign-in response was invalid." }, { status: 400 });
  }

  const accessToken = typeof body.accessToken === "string" ? body.accessToken : "";
  if (!accessToken || accessToken.length > 8_000) return unauthorized();

  const user = await getAuthenticatedUser(accessToken);
  if (!user || user.isAnonymous) return unauthorized();

  const response = NextResponse.json({ user: { id: user.id, email: user.email } });
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
  const response = NextResponse.json({ ok: true });
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
