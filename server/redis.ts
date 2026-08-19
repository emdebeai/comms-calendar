// Shared Redis-over-REST client (Vercel KV / Upstash) for the feedback store.
//
// This is the same store the deployed Vercel function uses; it's factored out
// here so BOTH entry points share one implementation and one key:
//   - api/feedback.ts   — the deployed serverless function
//   - server/dataStore.ts — the local Express dev server (npm run dev)
//
// It sits alongside server/graph.ts (the SharePoint/Graph client) as the second
// "remote store" the app can talk to. Notes are RPUSHed to a single list, one
// JSON item per note carrying its commId, then grouped on read — append-only, so
// two people commenting at once can't overwrite each other (no read-modify-write).
import type { FeedbackEntry } from "../src/data/types";

export type FeedbackStore = Record<string, FeedbackEntry[]>;

export const FEEDBACK_LIST_KEY = "comms-calendar:feedback";

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

/** True once a Redis (Vercel KV / Upstash) is configured via env. */
export function isRedisConfigured(): boolean {
  return redisEnv() !== null;
}

async function redis(command: unknown[]): Promise<unknown> {
  const env = redisEnv();
  if (!env) throw new Error("redis not configured");
  const res = await fetch(env.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
  if (!res.ok) throw new Error(`redis ${res.status}: ${await res.text().catch(() => "")}`);
  return ((await res.json()) as { result?: unknown }).result;
}

/** Entries are stored one-per-list-item with their commId, then grouped on
 *  read — append-only, so concurrent notes never clobber each other. */
export async function readFeedbackFromRedis(): Promise<FeedbackStore> {
  const items = (await redis(["LRANGE", FEEDBACK_LIST_KEY, "0", "-1"])) as string[];
  const store: FeedbackStore = {};
  for (const raw of items ?? []) {
    try {
      const { commId, ...entry } = JSON.parse(raw) as FeedbackEntry & { commId: string };
      if (commId) (store[commId] ??= []).push(entry as FeedbackEntry);
    } catch {
      // one malformed row shouldn't lose the rest of the thread
    }
  }
  return store;
}

/** Append one already-built entry (id + createdAt set by the caller). */
export async function appendFeedbackToRedis(commId: string, entry: FeedbackEntry): Promise<void> {
  await redis(["RPUSH", FEEDBACK_LIST_KEY, JSON.stringify({ commId, ...entry })]);
}
