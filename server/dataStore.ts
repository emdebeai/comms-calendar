import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsvRows } from "../src/lib/csv";
import {
  COMMS_COLUMNS,
  normalizeCommRow,
  parseCommRows,
  type CommsParseResult,
} from "../src/lib/commsSchema";
import type { Comm, FeedbackEntry } from "../src/data/types";
import { appendTableRow, isGraphConfigured, readTable, tableNames } from "./graph";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.join(__dirname, "data", "comms.csv");
const FEEDBACK_PATH = path.join(__dirname, "data", "feedback.json");

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

export async function getFeedback(): Promise<FeedbackStore> {
  return isGraphConfigured() ? readFeedbackFromGraph() : readFeedbackFromJson();
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
  } else {
    const store = await readFeedbackFromJson();
    (store[commId] ??= []).push(entry);
    await writeFile(FEEDBACK_PATH, JSON.stringify(store, null, 2), "utf-8");
  }
  return entry;
}
