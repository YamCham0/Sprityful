import { getSupabasePublicConfig, getSupabaseSecretKeys } from "./config";

export const DAILY_GENERATION_LIMIT = 1;

const QUOTA_REQUEST_TIMEOUT_MS = 10_000;

export type GenerationQuota = {
  allowed: boolean;
  used: number;
  remaining: number;
  unlimited?: boolean;
};

export class QuotaConfigurationError extends Error {}

function isQuota(value: unknown): value is GenerationQuota {
  if (!value || typeof value !== "object") return false;
  const quota = value as Record<string, unknown>;
  return (
    typeof quota.allowed === "boolean" &&
    typeof quota.used === "number" &&
    Number.isInteger(quota.used) &&
    typeof quota.remaining === "number" &&
    Number.isInteger(quota.remaining)
  );
}

export async function reserveDailyGeneration(userId: string): Promise<GenerationQuota> {
  const config = getSupabasePublicConfig();
  const secretKeys = getSupabaseSecretKeys();

  if (!config || secretKeys.length === 0) {
    throw new QuotaConfigurationError("Supabase quota settings are missing.");
  }

  let response: Response | null = null;
  for (const secretKey of secretKeys) {
    response = await fetch(`${config.url}/rest/v1/rpc/reserve_daily_generation`, {
      method: "POST",
      headers: {
        apikey: secretKey,
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_user_id: userId }),
      cache: "no-store",
      signal: AbortSignal.timeout(QUOTA_REQUEST_TIMEOUT_MS),
    });

    if (response.ok || response.status !== 401) break;
  }

  if (!response || !response.ok) {
    throw new Error(`Supabase quota RPC failed with ${response?.status ?? "no response"}.`);
  }

  const result = (await response.json()) as unknown;
  const quota = Array.isArray(result) ? result[0] : result;

  if (!isQuota(quota)) {
    throw new Error("Supabase quota RPC returned an invalid response.");
  }

  return quota;
}
