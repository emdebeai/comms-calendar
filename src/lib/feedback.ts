import type { FeedbackEntry } from "../data/types";
import { STANDALONE } from "./loadComms";

export type FeedbackStore = Record<string, FeedbackEntry[]>;

// Notes are shared through /api/feedback whenever an API is reachable: the
// local Express server in dev (server/dataStore.ts), or the Vercel function
// on the deployed site (api/feedback.ts). Both end up in the same place —
// the SharePoint workbook once Graph is configured, Redis/KV until then.
//
// Only the true single-file build (double-click HTML, no server at all)
// falls back to the viewer's own localStorage; there, notes persist for them
// but are not shared. That build sets VITE_STANDALONE without
// VITE_FEEDBACK_API. The deployed site sets BOTH: comms stay baked into the
// bundle (fast, no cold start) while notes go to the API.

const LS_KEY = "comms-calendar-feedback";

/** True when notes should go to /api/feedback rather than localStorage. */
export const FEEDBACK_API =
  import.meta.env.VITE_FEEDBACK_API === "true" || !STANDALONE;

function readLocal(): FeedbackStore {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "{}") as FeedbackStore;
  } catch {
    return {};
  }
}

export async function loadFeedback(): Promise<FeedbackStore> {
  if (!FEEDBACK_API) return readLocal();
  const res = await fetch("/api/feedback");
  if (!res.ok) throw new Error(`API returned ${res.status} loading feedback`);
  return (await res.json()) as FeedbackStore;
}

export async function addFeedbackEntry(
  commId: string,
  entry: Omit<FeedbackEntry, "id" | "createdAt">,
): Promise<FeedbackEntry> {
  if (!FEEDBACK_API) {
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
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || `API returned ${res.status} saving this note`);
  }
  return (await res.json()) as FeedbackEntry;
}
