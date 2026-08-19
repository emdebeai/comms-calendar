// Vercel serverless function — reads and appends to any registered collection.
//
// One dynamic route covers every review workflow, so adding one never adds a
// function. See server/registry.ts for the list and the two read modes.
//
// Writes are append-only and never silently dropped: with no store configured
// this answers 503 with the reason so the page can say "not saved" honestly.
//
// Relative imports carry explicit .js extensions — package.json sets
// "type": "module" and Node's ESM loader can't resolve extensionless ones.
import { COLLECTIONS } from "../../server/registry.js";
import { appendToCollection, readCollection } from "../../server/stores.js";
import { isRedisConfigured } from "../../server/redis.js";

interface Req {
  method?: string;
  body?: unknown;
  query?: Record<string, string | string[] | undefined>;
}
interface Res {
  status(code: number): Res;
  json(body: unknown): void;
}

export default async function handler(req: Req, res: Res) {
  const raw = req.query?.name;
  const name = Array.isArray(raw) ? raw[0] : raw;
  const def = name ? COLLECTIONS[name] : undefined;
  if (!name || !def) {
    return res.status(404).json({ error: `Unknown collection "${name ?? ""}"` });
  }

  if (!isRedisConfigured()) {
    return res.status(503).json({
      error:
        "No store is configured for this deployment. Add a Redis (Vercel KV / Upstash) integration.",
    });
  }

  try {
    if (req.method === "GET") {
      return res.status(200).json(await readCollection(name));
    }

    if (req.method === "POST") {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const itemId = body[def.itemKey];
      if (typeof itemId !== "string" || !itemId.trim()) {
        return res.status(400).json({ error: `${def.itemKey} is required` });
      }
      const entry = { ...body, [def.itemKey]: itemId.trim(), updatedAt: new Date().toISOString() };
      await appendToCollection(name, entry);
      return res.status(201).json(entry);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
}
