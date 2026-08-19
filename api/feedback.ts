// Vercel serverless function — the deployed site's comment store.
//
// The Vite build ships as static files, so there is no Express server in
// production; without this, feedback fell back to each visitor's own
// localStorage and nobody ever saw anyone else's notes. Storage order:
//
//   1. SharePoint Excel via Microsoft Graph — the intended long-term home
//      (server/graph.ts, shared with the local dev server). Used as soon as
//      the AZURE_* / EXCEL_* env vars are set.
//   2. Redis over its REST API (Vercel KV / Upstash) — works today with no
//      Azure dependency. Notes are RPUSHed to one list, so two people
//      commenting at once can't overwrite each other (no read-modify-write).
//   3. Neither configured → 503 with a plain message, so the UI can say
//      "not saved" instead of pretending.
//
// The site-wide Basic Auth middleware also covers /api/*, so these writes
// are only reachable by someone who already has the prototype password.
import type { FeedbackEntry } from "../src/data/types";
import { appendTableRow, isGraphConfigured, readTable, tableNames } from "../server/graph";

type Store = Record<string, FeedbackEntry[]>;

interface Req {
  method?: string;
  body?: unknown;
}
interface Res {
  status(code: number): Res;
  json(body: unknown): void;
}

const LIST_KEY = "comms-calendar:feedback";

function redisEnv(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
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
async function readFromRedis(): Promise<Store> {
  const items = (await redis(["LRANGE", LIST_KEY, "0", "-1"])) as string[];
  const store: Store = {};
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

async function readFromGraph(): Promise<Store> {
  const { header, rows } = await readTable(tableNames().feedback);
  const idx = (name: string) => header.indexOf(name);
  const store: Store = {};
  for (const values of rows) {
    const commId = values[idx("comm_id")];
    if (!commId) continue;
    (store[commId] ??= []).push({
      id: values[idx("id")] || crypto.randomUUID(),
      author: values[idx("author")] || "Anonymous",
      comment: values[idx("comment")] || "",
      metricLabel: values[idx("metric_label")] || undefined,
      metricValue: values[idx("metric_value")] || undefined,
      createdAt: values[idx("created_at")] || new Date().toISOString(),
    });
  }
  return store;
}

export default async function handler(req: Req, res: Res) {
  const graph = isGraphConfigured();
  const kv = redisEnv() !== null;

  if (!graph && !kv) {
    return res.status(503).json({
      error:
        "No comment store is configured for this deployment. Add a Redis (Vercel KV / Upstash) " +
        "integration, or set the AZURE_* and EXCEL_* variables to use the SharePoint workbook.",
    });
  }

  try {
    if (req.method === "GET") {
      return res.status(200).json(graph ? await readFromGraph() : await readFromRedis());
    }

    if (req.method === "POST") {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const commId = typeof body.commId === "string" ? body.commId.trim() : "";
      const comment = typeof body.comment === "string" ? body.comment.trim() : "";
      if (!commId || !comment) {
        return res.status(400).json({ error: "commId and comment are required" });
      }
      const entry: FeedbackEntry = {
        id: crypto.randomUUID(),
        author: (typeof body.author === "string" && body.author.trim()) || "Anonymous",
        comment,
        metricLabel: typeof body.metricLabel === "string" ? body.metricLabel || undefined : undefined,
        metricValue: typeof body.metricValue === "string" ? body.metricValue || undefined : undefined,
        createdAt: new Date().toISOString(),
      };

      if (graph) {
        await appendTableRow(tableNames().feedback, [
          entry.id,
          commId,
          entry.author,
          entry.comment,
          entry.metricLabel ?? "",
          entry.metricValue ?? "",
          entry.createdAt,
        ]);
      } else {
        await redis(["RPUSH", LIST_KEY, JSON.stringify({ commId, ...entry })]);
      }
      return res.status(201).json(entry);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
}
