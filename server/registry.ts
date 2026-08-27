// The registry — what data this app stores remotely.
//
// ── ADDING A NEW CSV INGESTION (a "dataset") ──────────────────────────────
// 1. Write a build script that turns the git-canonical source (a CSV, a TS
//    data file) into one JSON document, the way scripts/build-edm-review.mjs
//    does. Have it write to a snapshot file committed alongside the page.
// 2. Add an entry to DATASETS below.
// 3. `npm run seed` pushes it to Redis. The page reads it from
//    /api/dataset/<name>, falling back to the committed snapshot.
// No new serverless function is needed — /api/dataset/[name] serves them all.
//
// ── ADDING A NEW REVIEW (a "collection") ──────────────────────────────────
// 1. Add an entry to COLLECTIONS below, choosing a read mode:
//      "thread" — keep every entry per item (a comment thread)
//      "latest" — collapse to the newest entry per item (a review answer)
// 2. Post entries to /api/collection/<name>; read them back from the same URL.
// Again, no new function — /api/collection/[name] serves them all.
//
// Git stays the source of truth for datasets: Redis is a serving layer, so a
// bad ingest is fixed by correcting the source and reseeding, never by hand-
// editing the store. Collections are the opposite — they are user input, so
// Redis IS canonical for them, and scripts/apply-edm-review.mjs is how answers
// get folded back into git.

export interface DatasetDef {
  /** Script that regenerates the snapshot from git-canonical sources. */
  build: string;
  /** Committed JSON the build script writes; also the fallback the page bundles. */
  snapshot: string;
  /** Shown in seed output and error messages. */
  label: string;
}

export interface CollectionDef {
  /** "thread" keeps every entry per item; "latest" keeps only the newest. */
  mode: "thread" | "latest";
  /** Field on each entry naming the item it belongs to. */
  itemKey: string;
  /** Excel table name, used when SharePoint/Graph is configured. */
  table?: string;
  label: string;
}

export const DATASETS: Record<string, DatasetDef> = {
  "edm-review": {
    build: "scripts/build-edm-review.mjs",
    snapshot: "marketing-edms/data.json",
    label: "Marketing eDM sends + student question set",
  },
};

export const COLLECTIONS: Record<string, CollectionDef> = {
  feedback: {
    mode: "thread",
    itemKey: "commId",
    table: process.env.EXCEL_FEEDBACK_TABLE || "FeedbackTable",
    label: "Comments on the comms map",
  },
  "edm-review": {
    mode: "latest",
    itemKey: "commId",
    table: process.env.EXCEL_EDM_REVIEW_TABLE || "EdmReviewTable",
    label: "Marketing's eDM question answers",
  },
  // Per-comm field overrides edited in the detail panel. "latest" so each
  // save holds the full accumulated patch and the newest wins on read.
  "comm-edits": {
    mode: "latest",
    itemKey: "commId",
    label: "Detail-panel edits to comms",
  },
};

const NS = "comms-calendar";
export const datasetKey = (name: string) => `${NS}:dataset:${name}`;
export const collectionKey = (name: string) => `${NS}:collection:${name}`;
