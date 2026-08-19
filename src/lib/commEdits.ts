import type { Comm } from "../data/types";
import { STANDALONE } from "./loadComms";

// Per-comm field overrides made in the detail panel. Same store story as
// feedback: the /api/collection/comm-edits endpoint (dev + serverless) when an
// API is reachable, else the viewer's own localStorage in the single-file
// build. Overrides are merged onto the baked/CSV comms at load time, so they
// work even though the deployed comms are baked into the bundle.
export type CommPatch = Partial<Comm>;
export type CommEdits = Record<string, CommPatch>;

const LS_KEY = "comms-calendar-edits";
const API = import.meta.env.VITE_FEEDBACK_API === "true" || !STANDALONE;

function readLocal(): CommEdits {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "{}") as CommEdits;
  } catch {
    return {};
  }
}

/** All overrides, keyed by comm id (store bookkeeping fields stripped). */
export async function loadCommEdits(): Promise<CommEdits> {
  if (!API) return readLocal();
  try {
    const res = await fetch("/api/collection/comm-edits");
    if (!res.ok) return {};
    const raw = (await res.json()) as Record<string, Record<string, unknown>>;
    const out: CommEdits = {};
    for (const [id, entry] of Object.entries(raw)) {
      const { commId: _c, updatedAt: _u, ...patch } = entry;
      out[id] = patch as CommPatch;
    }
    return out;
  } catch {
    return {};
  }
}

/** Persist the FULL accumulated patch for a comm (latest-wins collection). */
export async function saveCommEdit(commId: string, patch: CommPatch): Promise<void> {
  if (!API) {
    const store = readLocal();
    store[commId] = patch;
    localStorage.setItem(LS_KEY, JSON.stringify(store));
    return;
  }
  const res = await fetch("/api/collection/comm-edits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ commId, ...patch }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error || `API returned ${res.status} saving this edit`);
  }
}
