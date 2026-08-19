// Vercel serverless function — serves any registered dataset by name.
//
// One dynamic route covers every dataset, so adding a CSV ingestion never adds
// a function (Vercel caps how many a project may have). See server/registry.ts.
//
// Read-only by design: datasets are built from git-canonical sources and pushed
// by scripts/seed-datasets.ts, so there is nothing here that can write.
//
// Relative imports carry explicit .js extensions — package.json sets
// "type": "module" and Node's ESM loader can't resolve extensionless ones.
import { DATASETS } from "../../server/registry.js";
import { readDataset } from "../../server/stores.js";
import { isRedisConfigured } from "../../server/redis.js";

interface Req {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
}
interface Res {
  status(code: number): Res;
  json(body: unknown): void;
}

export default async function handler(req: Req, res: Res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const raw = req.query?.name;
  const name = Array.isArray(raw) ? raw[0] : raw;
  if (!name || !DATASETS[name]) {
    return res.status(404).json({ error: `Unknown dataset "${name ?? ""}"` });
  }

  if (!isRedisConfigured()) {
    // The page falls back to its bundled snapshot, so say why rather than 500.
    return res.status(503).json({
      error:
        "No store is configured for this deployment. Add a Redis (Vercel KV / Upstash) integration.",
    });
  }

  try {
    const envelope = await readDataset(name);
    if (!envelope) {
      return res.status(404).json({ error: `Dataset "${name}" has not been seeded yet.` });
    }
    return res.status(200).json(envelope);
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
}
