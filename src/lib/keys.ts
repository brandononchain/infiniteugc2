import jwt from "jsonwebtoken";
import { getSupabaseAdmin } from "./supabase";

const MAX_FAILURE_COUNT = 5;

/**
 * Get the least-recently-used active key for a provider from system_keys table.
 * Updates last_used_at to round-robin across keys.
 */
export async function getRotatedKey(provider: string): Promise<{ id: string; apiKey: string }> {
  const supabase = getSupabaseAdmin();

  const { data: key, error } = await supabase
    .from("system_keys")
    .select("id, api_key")
    .eq("provider", provider)
    .eq("is_active", true)
    .order("last_used_at", { ascending: true })
    .limit(1)
    .single();

  if (error || !key) {
    throw new Error(`No active ${provider} keys available`);
  }

  await supabase
    .from("system_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", key.id);

  return { id: key.id, apiKey: key.api_key };
}

/**
 * Mark a key as failed. Increments failure_count and deactivates if threshold reached.
 */
export async function markKeyFailed(keyId: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  // Fetch current failure_count
  const { data: key } = await supabase
    .from("system_keys")
    .select("failure_count")
    .eq("id", keyId)
    .single();

  const newCount = (key?.failure_count || 0) + 1;

  const update: Record<string, unknown> = { failure_count: newCount };
  if (newCount >= MAX_FAILURE_COUNT) {
    update.is_active = false;
    console.warn(`[KEYS] Key ${keyId} deactivated after ${newCount} failures`);
  }

  await supabase.from("system_keys").update(update).eq("id", keyId);
}

/**
 * Reset failure count for a key (called on successful use).
 */
async function resetKeyFailures(keyId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase
    .from("system_keys")
    .update({ failure_count: 0 })
    .eq("id", keyId);
}

/**
 * Check if an error is likely an API key / auth / rate-limit issue
 * that warrants rotating to a different key.
 */
function isKeyRelatedError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    msg.includes("401") ||
    msg.includes("403") ||
    msg.includes("429") ||
    msg.includes("unauthorized") ||
    msg.includes("forbidden") ||
    msg.includes("rate limit") ||
    msg.includes("quota") ||
    msg.includes("invalid api key") ||
    msg.includes("invalid_api_key") ||
    msg.includes("insufficient")
  );
}

// ── Generic key getter (DB rotation with env fallback) ──────────────────

async function getKeyForProvider(provider: string, envFallbackKey: string): Promise<string> {
  try {
    const { apiKey } = await getRotatedKey(provider);
    return apiKey;
  } catch {
    const envKey = process.env[envFallbackKey];
    if (!envKey) {
      throw new Error(
        `No ${provider} API keys available (no system_keys and no ${envFallbackKey} env var)`
      );
    }
    return envKey;
  }
}

// ── Provider-specific getters ───────────────────────────────────────────

export async function getOpenAIKey(): Promise<string> {
  return getKeyForProvider("openai", "OPENAI_API_KEY");
}

export async function getKieApiKey(): Promise<string> {
  return getKeyForProvider("kie", "KIE_AI_API_KEY");
}

export async function getElevenLabsKey(): Promise<string> {
  return getKeyForProvider("elevenlabs", "ELEVENLABS_API_KEY");
}

export async function getHedraKey(): Promise<string> {
  return getKeyForProvider("hedra", "HEDRA_API_KEY");
}

export async function getArkApiKey(): Promise<string> {
  return getKeyForProvider("ark", "ARK_API_KEY");
}

export async function getGeminiKey(): Promise<string> {
  return getKeyForProvider("gemini", "GEMINI_API_KEY");
}

export async function getSyncApiKey(): Promise<string> {
  return getKeyForProvider("sync", "SYNC_API_KEY");
}

export async function getAnthropicKey(): Promise<string> {
  return getKeyForProvider("anthropic", "ANTHROPIC_API_KEY");
}

/**
 * Get BytePlus credentials (key pair stored as JSON in api_key column).
 * JSON format: {"accessKeyId":"...","secretAccessKey":"..."}
 */
export async function getBytePlusCredentials(): Promise<{
  accessKeyId: string;
  secretAccessKey: string;
}> {
  try {
    const { apiKey } = await getRotatedKey("byteplus");
    const parsed = JSON.parse(apiKey);
    if (!parsed.accessKeyId || !parsed.secretAccessKey) {
      throw new Error("Invalid BytePlus credentials format in system_keys");
    }
    return parsed;
  } catch (err: any) {
    // Fall back to env vars
    const accessKeyId = process.env.BYTEPLUS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.BYTEPLUS_SECRET_ACCESS_KEY;
    if (!accessKeyId || !secretAccessKey) {
      throw new Error(
        "No BytePlus credentials available (no system_keys and no BYTEPLUS_ACCESS_KEY_ID/SECRET_ACCESS_KEY env vars)"
      );
    }
    return { accessKeyId, secretAccessKey };
  }
}

// ── Retry wrapper with key rotation on failure ──────────────────────────

/**
 * Execute an API call with automatic key rotation on auth/rate-limit failures.
 * 1. Tries DB-rotated keys (up to 3 attempts with different keys)
 * 2. Falls back to env var key
 * 3. If all fail, throws the last error
 */
export async function withKeyRotation<T>(
  provider: string,
  envFallbackKey: string,
  fn: (apiKey: string) => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  const triedKeyIds: string[] = [];

  // Try DB keys
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const { id, apiKey } = await getRotatedKey(provider);
      if (triedKeyIds.includes(id)) break; // no more unique keys
      triedKeyIds.push(id);

      const result = await fn(apiKey);
      // Success — reset failure count
      await resetKeyFailures(id).catch(() => {});
      return result;
    } catch (err) {
      if (isKeyRelatedError(err) && triedKeyIds.length > 0) {
        const failedId = triedKeyIds[triedKeyIds.length - 1];
        console.warn(`[KEYS] Key ${failedId} failed for ${provider}, rotating...`);
        await markKeyFailed(failedId);
        continue;
      }
      // Not a key error — rethrow immediately (don't waste other keys)
      throw err;
    }
  }

  // All DB keys exhausted, try env fallback
  const envKey = process.env[envFallbackKey];
  if (envKey) {
    console.warn(`[KEYS] All DB keys for ${provider} failed, trying env fallback`);
    return fn(envKey);
  }

  throw new Error(`All ${provider} API keys exhausted (tried ${triedKeyIds.length} DB keys, no env fallback)`);
}

/**
 * Same as withKeyRotation but for BytePlus key pairs (JSON credentials).
 */
export async function withBytePlusRotation<T>(
  fn: (creds: { accessKeyId: string; secretAccessKey: string }) => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  const triedKeyIds: string[] = [];

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const { id, apiKey } = await getRotatedKey("byteplus");
      if (triedKeyIds.includes(id)) break;
      triedKeyIds.push(id);

      const creds = JSON.parse(apiKey);
      const result = await fn(creds);
      await resetKeyFailures(id).catch(() => {});
      return result;
    } catch (err) {
      if (isKeyRelatedError(err) && triedKeyIds.length > 0) {
        const failedId = triedKeyIds[triedKeyIds.length - 1];
        console.warn(`[KEYS] BytePlus key ${failedId} failed, rotating...`);
        await markKeyFailed(failedId);
        continue;
      }
      throw err;
    }
  }

  // Env fallback
  const accessKeyId = process.env.BYTEPLUS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.BYTEPLUS_SECRET_ACCESS_KEY;
  if (accessKeyId && secretAccessKey) {
    console.warn("[KEYS] All DB BytePlus keys failed, trying env fallback");
    return fn({ accessKeyId, secretAccessKey });
  }

  throw new Error(`All BytePlus API keys exhausted (tried ${triedKeyIds.length} DB keys, no env fallback)`);
}

// ── Kling API (JWT-based auth with Access Key + Secret Key) ─────────

const klingTokenCache = new Map<string, { token: string; expiresAt: number }>();

/**
 * Generate a JWT token for the Kling API using HMAC-SHA256.
 * Caches per access key for 30 minutes, refreshes 5 minutes before expiry.
 */
export function generateKlingJWT(accessKey: string, secretKey: string): string {
  const now = Math.floor(Date.now() / 1000);
  const cached = klingTokenCache.get(accessKey);
  if (cached && cached.expiresAt > now + 300) {
    return cached.token;
  }
  const payload = { iss: accessKey, iat: now, exp: now + 1800, nbf: now - 5 };
  const token = jwt.sign(payload, secretKey, { algorithm: "HS256" });
  klingTokenCache.set(accessKey, { token, expiresAt: now + 1800 });
  return token;
}

/**
 * Get Kling credentials (key pair stored as JSON in api_key column).
 * JSON format: {"accessKey":"...","secretKey":"..."}
 */
export async function getKlingCredentials(): Promise<{
  accessKey: string;
  secretKey: string;
}> {
  try {
    const { apiKey } = await getRotatedKey("kling");
    const parsed = JSON.parse(apiKey);
    if (!parsed.accessKey || !parsed.secretKey) {
      throw new Error("Invalid Kling credentials format in system_keys");
    }
    return parsed;
  } catch (err: any) {
    const accessKey = process.env.KLING_ACCESS_KEY;
    const secretKey = process.env.KLING_SECRET_KEY;
    if (!accessKey || !secretKey) {
      throw new Error(
        "No Kling credentials available (no system_keys and no KLING_ACCESS_KEY/KLING_SECRET_KEY env vars)"
      );
    }
    return { accessKey, secretKey };
  }
}

/**
 * Execute an API call with automatic Kling key rotation.
 * Generates JWT from credentials and passes it to the callback.
 */
export async function withKlingRotation<T>(
  fn: (jwtToken: string) => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  const triedKeyIds: string[] = [];

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const { id, apiKey } = await getRotatedKey("kling");
      if (triedKeyIds.includes(id)) break;
      triedKeyIds.push(id);

      const creds = JSON.parse(apiKey);
      console.log(`[KEYS] Kling credentials parsed: accessKey=${creds.accessKey?.substring(0, 8)}...`);
      const token = generateKlingJWT(creds.accessKey, creds.secretKey);
      console.log(`[KEYS] Kling JWT generated: ${token.substring(0, 30)}...`);
      const result = await fn(token);
      await resetKeyFailures(id).catch(() => {});
      return result;
    } catch (err) {
      console.error(`[KEYS] Kling attempt failed:`, err instanceof Error ? err.message : err);
      if (isKeyRelatedError(err) && triedKeyIds.length > 0) {
        const failedId = triedKeyIds[triedKeyIds.length - 1];
        console.warn(`[KEYS] Kling key ${failedId} failed, rotating...`);
        await markKeyFailed(failedId);
        klingTokenCache.clear();
        continue;
      }
      throw err;
    }
  }

  // Env fallback
  const accessKey = process.env.KLING_ACCESS_KEY;
  const secretKey = process.env.KLING_SECRET_KEY;
  if (accessKey && secretKey) {
    console.warn("[KEYS] All DB Kling keys failed, trying env fallback");
    klingTokenCache.clear();
    const token = generateKlingJWT(accessKey, secretKey);
    return fn(token);
  }

  throw new Error(`All Kling API keys exhausted (tried ${triedKeyIds.length} DB keys, no env fallback)`);
}
