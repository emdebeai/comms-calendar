// The two storage shapes this app keeps in Redis. See server/registry.ts for
// what exists and how to add more; server/redis.ts is the transport underneath.
//
// DATASET — one JSON document under one key. Read-mostly reference data built
// from a git-canonical source (a CSV) and pushed by scripts/seed-datasets.ts.
// Because git stays canonical, a page that can't reach Redis falls back to its
// committed snapshot rather than showing nothing.
//
// COLLECTION — an append-only list of entries, one JSON item per write. Never
// read-modify-write, so two people answering at once can't clobber each other.
// Read modes: "thread" keeps every entry per item, "latest" keeps the newest.
//
// Graph/SharePoint is deliberately NOT generalised here: its column mapping is
// per-collection, so it stays in the route handlers that own those columns.
import { redisCommand } from "./redis.js";
import { COLLECTIONS, collectionKey, datasetKey } from "./registry.js";

// ── Datasets ──────────────────────────────────────────────────────────────

export interface DatasetEnvelope<T = unknown> {
  /** The document itself. */
  data: T;
  /** When the seed script last pushed it, so a page can show staleness. */
  seededAt: string;
  /** Which snapshot file it was built from, for traceability. */
  source: string;
}

/** Null when nothing has been seeded yet — the caller falls back to its snapshot. */
export async function readDataset<T = unknown>(name: string): Promise<DatasetEnvelope<T> | null> {
  const raw = await redisCommand<string | null>(["GET", datasetKey(name)]);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DatasetEnvelope<T>;
  } catch {
    // A corrupt document should read as "not seeded" rather than break the page.
    return null;
  }
}

export async function writeDataset<T>(
  name: string,
  data: T,
  source: string,
): Promise<DatasetEnvelope<T>> {
  const envelope: DatasetEnvelope<T> = { data, seededAt: new Date().toISOString(), source };
  await redisCommand(["SET", datasetKey(name), JSON.stringify(envelope)]);
  return envelope;
}

// ── Collections ───────────────────────────────────────────────────────────

type Entry = Record<string, unknown>;

/** "thread" → every entry per item; "latest" → the newest entry per item. */
export type CollectionStore = Record<string, Entry[]> | Record<string, Entry>;

export async function readCollection(name: string): Promise<CollectionStore> {
  const def = COLLECTIONS[name];
  if (!def) throw new Error(`unknown collection "${name}"`);

  const items = await redisCommand<string[] | null>(["LRANGE", collectionKey(name), "0", "-1"]);
  const parsed: Entry[] = [];
  for (const raw of items ?? []) {
    try {
      parsed.push(JSON.parse(raw) as Entry);
    } catch {
      // one malformed row shouldn't lose the rest
    }
  }

  if (def.mode === "thread") {
    // Deletions are append-only tombstones ({__deletedId}), so the log stays
    // clobber-free. Collect them first, then drop the matching entries.
    const deleted = new Set<string>();
    for (const entry of parsed) {
      if (typeof entry.__deletedId === "string") deleted.add(entry.__deletedId);
    }
    // The item id is the grouping key, so it's stripped from each entry —
    // callers get Record<itemId, Entry[]>, which is the shape the pages expect.
    const out: Record<string, Entry[]> = {};
    for (const entry of parsed) {
      if (typeof entry.__deletedId === "string") continue; // tombstone, not a comment
      const id = entry[def.itemKey];
      if (typeof id !== "string" || !id) continue;
      const { [def.itemKey]: _omit, ...rest } = entry;
      if (typeof rest.id === "string" && deleted.has(rest.id)) continue; // deleted
      (out[id] ??= []).push(rest);
    }
    return out;
  }

  // "latest": last write per item wins. Entries arrive in append order, so a
  // later position wins ties when updatedAt is equal or missing.
  const out: Record<string, Entry> = {};
  for (const entry of parsed) {
    const id = entry[def.itemKey];
    if (typeof id !== "string" || !id) continue;
    const prev = out[id];
    const at = typeof entry.updatedAt === "string" ? entry.updatedAt : "";
    const prevAt = prev && typeof prev.updatedAt === "string" ? prev.updatedAt : "";
    if (!prev || at >= prevAt) out[id] = entry;
  }
  return out;
}

/** Append one entry. The caller supplies a complete entry including its item id. */
export async function appendToCollection(name: string, entry: Entry): Promise<void> {
  const def = COLLECTIONS[name];
  if (!def) throw new Error(`unknown collection "${name}"`);
  if (typeof entry[def.itemKey] !== "string" || !entry[def.itemKey]) {
    throw new Error(`${def.itemKey} is required`);
  }
  await redisCommand(["RPUSH", collectionKey(name), JSON.stringify(entry)]);
}

/** Delete one entry by id — append-only, via a {__deletedId} tombstone that
 *  readCollection filters out. "thread" collections only. */
export async function removeFromCollection(
  name: string,
  itemId: string,
  entryId: string,
): Promise<void> {
  const def = COLLECTIONS[name];
  if (!def) throw new Error(`unknown collection "${name}"`);
  await redisCommand([
    "RPUSH",
    collectionKey(name),
    JSON.stringify({ [def.itemKey]: itemId, __deletedId: entryId }),
  ]);
}
