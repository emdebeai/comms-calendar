import type { FeedbackEntry } from "../data/types";

export type FeedbackStore = Record<string, FeedbackEntry[]>;

// Feedback is shared through the local API server now — see
// server/dataStore.ts. It persists to the SharePoint Excel workbook once
// that's configured, or to server/data/feedback.json locally until then.
// Either way it's no longer per-browser: anyone hitting the same server
// sees the same notes.

export async function loadFeedback(): Promise<FeedbackStore> {
  const res = await fetch("/api/feedback");
  if (!res.ok) throw new Error(`API returned ${res.status} loading feedback`);
  return (await res.json()) as FeedbackStore;
}

export async function addFeedbackEntry(
  commId: string,
  entry: Omit<FeedbackEntry, "id" | "createdAt">,
): Promise<FeedbackEntry> {
  const res = await fetch("/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ commId, ...entry }),
  });
  if (!res.ok) throw new Error(`API returned ${res.status} saving feedback`);
  return (await res.json()) as FeedbackEntry;
}
