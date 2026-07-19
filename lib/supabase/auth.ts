import { getSupabasePublicConfig } from "./config";

export type AuthenticatedUser = {
  id: string;
  email: string | null;
  isAnonymous: boolean;
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
    });

    if (!response.ok) return null;

    const user = (await response.json()) as {
      id?: unknown;
      email?: unknown;
      is_anonymous?: unknown;
    };

    if (typeof user.id !== "string" || !user.id) return null;

    return {
      id: user.id,
      email: typeof user.email === "string" ? user.email : null,
      isAnonymous: user.is_anonymous === true,
    };
  } catch {
    return null;
  }
}
