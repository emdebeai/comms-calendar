// Redis-over-REST transport (Vercel KV / Upstash).
//
// Pure plumbing: find the credentials, run one command. The data *shapes* that
// sit on top — datasets and collections — live in server/stores.ts.
//
// This is the single place that knows how to reach Redis, shared by every entry
// point: the Express dev server (server/index.ts), the Vercel functions under
// api/, and the seed script (scripts/seed-datasets.ts). Keeping it in one file
// is why the store-name prefix handling below only had to be solved once.

function redisEnv(): { url: string; token: string } | null {
  // Standard Vercel KV / Upstash names first.
  let url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  let token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  // Vercel's Upstash marketplace integration prefixes the injected vars with
  // the store name (e.g. rmit_KV_REST_API_URL / rmit_KV_REST_API_TOKEN). Accept
  // any such prefix by pairing a <prefix>KV_REST_API_URL with its matching
  // <prefix>KV_REST_API_TOKEN (the read-write token, not the READ_ONLY one).
  if (!url || !token) {
    const SUFFIX = "KV_REST_API_URL";
    for (const key of Object.keys(process.env)) {
      if (!key.endsWith(SUFFIX)) continue;
      const prefix = key.slice(0, -SUFFIX.length);
      const candUrl = process.env[key];
      const candToken = process.env[`${prefix}KV_REST_API_TOKEN`];
      if (candUrl && candToken) {
        url = candUrl;
        token = candToken;
        break;
      }
    }
  }

  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

/** True once a Redis (Vercel KV / Upstash) is reachable via env. */
export function isRedisConfigured(): boolean {
  return redisEnv() !== null;
}

/** Run one command, e.g. ["SET", key, json] or ["LRANGE", key, "0", "-1"]. */
export async function redisCommand<T = unknown>(command: unknown[]): Promise<T> {
  const env = redisEnv();
  if (!env) throw new Error("redis not configured");
  const res = await fetch(env.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
  if (!res.ok) throw new Error(`redis ${res.status}: ${await res.text().catch(() => "")}`);
  return ((await res.json()) as { result?: T }).result as T;
}
