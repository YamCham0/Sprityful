export const authCookieName = "sprityful_access_token";
export const MAX_ACCESS_TOKEN_LENGTH = 8_000;

export type SupabasePublicConfig = {
  url: string;
  publishableKey: string;
};

export function getSupabasePublicConfig(): SupabasePublicConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "");
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey) return null;

  return { url, publishableKey };
}

export function getAccessTokenFromCookieHeader(cookieHeader: string | null) {
  if (!cookieHeader) return null;

  const prefix = `${authCookieName}=`;
  for (const segment of cookieHeader.split(";")) {
    const value = segment.trim();
    if (!value.startsWith(prefix)) continue;

    const encodedToken = value.slice(prefix.length);
    if (!encodedToken || encodedToken.length > MAX_ACCESS_TOKEN_LENGTH) return null;

    try {
      const token = decodeURIComponent(encodedToken);
      return token && token.length <= MAX_ACCESS_TOKEN_LENGTH ? token : null;
    } catch {
      return null;
    }
  }

  return null;
}

export function getSupabaseSecretKeys() {
  return [process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(), process.env.SUPABASE_SECRET_KEY?.trim()].filter(
    (key): key is string => Boolean(key),
  );
}
