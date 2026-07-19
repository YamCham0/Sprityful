import { getSupabasePublicConfig, getSupabaseSecretKey } from "./config";

export const DAILY_GENERATION_LIMIT = 7;

export type GenerationQuota = {
  allowed: boolean;
  used: number;
  remaining: number;
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
  const secretKey = getSupabaseSecretKey();

  if (!config || !secretKey) {
    throw new QuotaConfigurationError("Supabase quota settings are missing.");
  }

  const response = await fetch(`${config.url}/rest/v1/rpc/reserve_daily_generation`, {
    method: "POST",
    headers: {
      apikey: secretKey,
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_user_id: userId }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Supabase quota RPC failed with ${response.status}.`);
  }

  const result = (await response.json()) as unknown;
  const quota = Array.isArray(result) ? result[0] : result;

  if (!isQuota(quota)) {
    throw new Error("Supabase quota RPC returned an invalid response.");
  }

  return quota;
}
