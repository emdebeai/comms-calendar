import { parseCsvRows } from "./csv";
import { parseCommRows, type CommsParseResult } from "./commsSchema";
// Baked-in copy of the CSV — only used by the standalone (single-file) build,
// where there's no API server. Bundled either way (a few KB).
import commsCsvRaw from "../../data/comms.csv?raw";

// STANDALONE (single double-click HTML) mode: no Node/API server, so the
// comms are parsed straight from the CSV baked into the bundle.
export const STANDALONE = import.meta.env.VITE_STANDALONE === "true";

// Normal mode: comms come from the local API server (server/index.ts), which
// reads either the shared SharePoint workbook (once configured) or the local
// data/comms.csv fallback.
//
// Returns { comms, issues } — issues are rows that failed validation and were
// skipped (surfaced as a notice), not a fatal error. Rows/lane-heights are
// NOT assigned here — App runs layoutTimeline() over the raw comms.
export async function loadComms(): Promise<CommsParseResult> {
  if (STANDALONE) {
    return parseCommRows(parseCsvRows(commsCsvRaw));
  }
  const res = await fetch("/api/comms");
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API returned ${res.status}${body ? ` — ${body}` : ""}`);
  }
  return (await res.json()) as CommsParseResult;
}
