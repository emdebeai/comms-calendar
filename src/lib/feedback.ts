import type { FeedbackEntry } from "../data/types";
import { STANDALONE } from "./loadComms";

export type FeedbackStore = Record<string, FeedbackEntry[]>;

// Normal mode: feedback is shared through the local API server (see
// server/dataStore.ts) — everyone hitting the same server sees the same notes.
//
// STANDALONE (single-file) mode: there's no server, so notes are kept in the
// viewer's own browser (localStorage). They persist for them, but aren't
// shared with anyone else.

const LS_KEY = "comms-calendar-feedback";

function readLocal(): FeedbackStore {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "{}") as FeedbackStore;
  } catch {
    return {};
  }
}

export async function loadFeedback(): Promise<FeedbackStore> {
  if (STANDALONE) return readLocal();
  const res = await fetch("/api/feedback");
  if (!res.ok) throw new Error(`API returned ${res.status} loading feedback`);
  return (await res.json()) as FeedbackStore;
}

export async function addFeedbackEntry(
  commId: string,
  entry: Omit<FeedbackEntry, "id" | "createdAt">,
): Promise<FeedbackEntry> {
  if (STANDALONE) {
    const saved: FeedbackEntry = {
      ...entry,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    const store = readLocal();
    (store[commId] ??= []).push(saved);
    localStorage.setItem(LS_KEY, JSON.stringify(store));
    return saved;
  }
  const res = await fetch("/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ commId, ...entry }),
  });
  if (!res.ok) throw new Error(`API returned ${res.status} saving feedback`);
  return (await res.json()) as FeedbackEntry;
}
