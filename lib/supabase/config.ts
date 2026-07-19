export const authCookieName = "sprityful_access_token";

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

export function getSupabaseSecretKeys() {
  return [process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(), process.env.SUPABASE_SECRET_KEY?.trim()].filter(
    (key): key is string => Boolean(key),
  );
}
