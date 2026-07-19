import { getSupabasePublicConfig } from "./config";

const AUTH_REQUEST_TIMEOUT_MS = 8_000;

export type AuthenticatedUser = {
  id: string;
  email: string | null;
  isAnonymous: boolean;
  hasUnlimitedTestGenerations: boolean;
};

export async function getAuthenticatedUser(accessToken: string): Promise<AuthenticatedUser | null> {
  const config = getSupabasePublicConfig();
  if (!config || !accessToken) return null;

  try {
    const response = await fetch(`${config.url}/auth/v1/user`, {
      headers: {
        apikey: config.publishableKey,
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(AUTH_REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) return null;

    const user = (await response.json()) as {
      id?: unknown;
      email?: unknown;
      is_anonymous?: unknown;
      app_metadata?: unknown;
    };

    if (typeof user.id !== "string" || !user.id) return null;

    return {
      id: user.id,
      email: typeof user.email === "string" ? user.email : null,
      isAnonymous: user.is_anonymous === true,
      // Only app metadata is eligible for privileged access. User metadata is user-editable.
      hasUnlimitedTestGenerations:
        typeof user.app_metadata === "object"
        && user.app_metadata !== null
        && (user.app_metadata as Record<string, unknown>).sprityful_unlimited_test === true,
    };
  } catch {
    return null;
  }
}
