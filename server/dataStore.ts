import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsvRows } from "../src/lib/csv.js";
import {
  COMMS_COLUMNS,
  normalizeCommRow,
  parseCommRows,
  type CommsParseResult,
} from "../src/lib/commsSchema.js";
import type { Comm, FeedbackEntry } from "../src/data/types.js";
import { appendTableRow, isGraphConfigured, readTable, tableNames } from "./graph.js";
import { isRedisConfigured } from "./redis.js";
import { appendToCollection, readCollection, removeFromCollection } from "./stores.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.join(__dirname, "..", "data", "comms.csv");
const FEEDBACK_PATH = path.join(__dirname, "data", "feedback.json");
const EDM_REVIEW_PATH = path.join(__dirname, "data", "edm-review.json");

export type FeedbackStore = Record<string, FeedbackEntry[]>;
export type NewCommInput = Record<(typeof COMMS_COLUMNS)[number], string>;

// ── Comms ───────────────────────────────────────────────────────────────

// Returns parsed comms plus any rows that failed validation (skipped, not
// fatal) so the client can surface a "N rows couldn't be imported" notice.
export async function getComms(): Promise<CommsParseResult> {
  return isGraphConfigured() ? readCommsFromGraph() : readCommsFromCsv();
}

async function readCommsFromCsv(): Promise<CommsParseResult> {
  const text = await readFile(CSV_PATH, "utf-8");
  return parseCommRows(parseCsvRows(text));
}

async function readCommsFromGraph(): Promise<CommsParseResult> {
  const { header, rows } = await readTable(tableNames().comms);
  const objectRows = rows.map((values) =>
    Object.fromEntries(header.map((h, j) => [h, values[j] ?? ""])),
  );
  return parseCommRows(objectRows);
}

export async function addComm(input: NewCommInput): Promise<Comm> {
  const usedIds = new Set((await getComms()).comms.map((c) => c.id));
  const comm = normalizeCommRow(input, 0, usedIds);

  if (isGraphConfigured()) {
    await appendTableRow(tableNames().comms, COMMS_COLUMNS.map((col) => input[col] ?? ""));
  } else {
    const line = COMMS_COLUMNS.map((col) => csvEscape(col === "id" ? comm.id : input[col] ?? "")).join(",");
    await appendFileLine(CSV_PATH, line);
  }
  return comm;
}

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

async function appendFileLine(filePath: string, line: string): Promise<void> {
  const existing = await readFile(filePath, "utf-8");
  const withNewline = existing.endsWith("\n") ? existing : `${existing}\n`;
  await writeFile(filePath, `${withNewline}${line}\n`, "utf-8");
}

// ── Feedback ────────────────────────────────────────────────────────────

// Same precedence as the deployed Vercel function (api/feedback.ts):
// SharePoint Graph → Redis (Vercel KV / Upstash) → local JSON file. So
// `npm run dev` with KV env vars set captures to the same Upstash the
// deployed site uses; with none set it stays on server/data/feedback.json.
export async function getFeedback(): Promise<FeedbackStore> {
  if (isGraphConfigured()) return readFeedbackFromGraph();
  if (isRedisConfigured()) return (await readCollection("feedback")) as FeedbackStore;
  return readFeedbackFromJson();
}

async function readFeedbackFromJson(): Promise<FeedbackStore> {
  try {
    const text = await readFile(FEEDBACK_PATH, "utf-8");
    return JSON.parse(text) as FeedbackStore;
  } catch {
    return {};
  }
}

async function readFeedbackFromGraph(): Promise<FeedbackStore> {
  const { header, rows } = await readTable(tableNames().feedback);
  const idx = (name: string) => header.indexOf(name);
  const store: FeedbackStore = {};
  for (const values of rows) {
    const commId = values[idx("comm_id")];
    if (!commId) continue;
    const entry: FeedbackEntry = {
      id: values[idx("id")] || randomUUID(),
      author: values[idx("author")] || "Anonymous",
      comment: values[idx("comment")] || "",
      metricLabel: values[idx("metric_label")] || undefined,
      metricValue: values[idx("metric_value")] || undefined,
      createdAt: values[idx("created_at")] || new Date().toISOString(),
    };
    (store[commId] ??= []).push(entry);
  }
  return store;
}

export async function addFeedback(
  commId: string,
  input: Omit<FeedbackEntry, "id" | "createdAt">,
): Promise<FeedbackEntry> {
  const entry: FeedbackEntry = {
    ...input,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };

  if (isGraphConfigured()) {
    await appendTableRow(tableNames().feedback, [
      entry.id,
      commId,
      entry.author,
      entry.comment,
      entry.metricLabel ?? "",
      entry.metricValue ?? "",
      entry.createdAt,
    ]);
  } else if (isRedisConfigured()) {
    await appendToCollection("feedback", { commId, ...entry });
  } else {
    const store = await readFeedbackFromJson();
    (store[commId] ??= []).push(entry);
    await writeFile(FEEDBACK_PATH, JSON.stringify(store, null, 2), "utf-8");
  }
  return entry;
}

/** Delete one comment. Redis uses an append-only tombstone; the local JSON
 *  store removes it in place. SharePoint deletion isn't supported yet. */
export async function deleteFeedback(commId: string, entryId: string): Promise<void> {
  if (isGraphConfigured()) {
    throw new Error("Deleting from the SharePoint workbook is not supported yet.");
  }
  if (isRedisConfigured()) {
    await removeFromCollection("feedback", commId, entryId);
    return;
  }
  const store = await readFeedbackFromJson();
  if (store[commId]) {
    store[commId] = store[commId].filter((e) => e.id !== entryId);
    if (store[commId].length === 0) delete store[commId];
    await writeFile(FEEDBACK_PATH, JSON.stringify(store, null, 2), "utf-8");
  }
}

// ── eDM question review (/marketing-edms) ─────────────────────────────────
// Marketing's answers to "does this eDM answer the question we've assigned
// it?". Local dev writes a JSON file; the deployed site uses the serverless
// api/edm-review.ts (SharePoint or Redis). Keyed by comm id, last write wins.
export interface EdmAnswer {
  commId: string;
  verdict: string;
  question?: string;
  notes?: string;
  ctaPrimary?: string;
  ctaSecondary?: string;
  ctaTertiary?: string;
  reviewer?: string;
  updatedAt: string;
}

export async function getEdmReview(): Promise<Record<string, EdmAnswer>> {
  // Same precedence as feedback: Redis when configured (so dev and the
  // deployed site share one store), otherwise the local JSON file.
  if (isRedisConfigured()) {
    return (await readCollection("edm-review")) as Record<string, EdmAnswer>;
  }
  try {
    return JSON.parse(await readFile(EDM_REVIEW_PATH, "utf-8")) as Record<string, EdmAnswer>;
  } catch {
    return {};
  }
}

export async function saveEdmAnswer(input: EdmAnswer): Promise<EdmAnswer> {
  const entry: EdmAnswer = { ...input, updatedAt: new Date().toISOString() };
  if (isRedisConfigured()) {
    await appendToCollection("edm-review", { ...entry });
    return entry;
  }
  // Local file is read-modify-write, which is fine for a single dev machine.
  const store = await getEdmReview();
  store[entry.commId] = entry;
  await writeFile(EDM_REVIEW_PATH, JSON.stringify(store, null, 2), "utf-8");
  return entry;
}
