import { parseCsvRows } from "./csv";
import { parseCommRows, type CommsParseResult } from "./commsSchema";

// Baked-in copies of the per-team CSVs — only used by the standalone
// (single-file) build, where there's no API server. Bundled either way (a
// few KB). The FILENAME is the team; rows carry it injected at parse.
const commsCsvFiles = import.meta.glob("../../data/comms/*.csv", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

// STANDALONE (single double-click HTML) mode: no Node/API server, so the
// comms are parsed straight from the CSVs baked into the bundle.
export const STANDALONE = import.meta.env.VITE_STANDALONE === "true";

// The persona whose journey this map currently shows. Comms are a shared
// pool tagged per persona (data/comms/*: the `personas` column) — the map
// reads them through this lens, so persona 02 becomes a different filter
// over the same files, not a second copy of the data.
export const ACTIVE_PERSONA = "domsl";

function filterPersona(result: CommsParseResult): CommsParseResult {
  return {
    ...result,
    comms: result.comms.filter((c) => !c.personas || c.personas.includes(ACTIVE_PERSONA)),
  };
}

function parseBakedComms(): CommsParseResult {
  const rows: Record<string, string>[] = [];
  for (const [file, raw] of Object.entries(commsCsvFiles).sort()) {
    const team = file.split("/").pop()!.replace(/\.csv$/, "");
    for (const row of parseCsvRows(raw)) rows.push({ ...row, team });
  }
  return parseCommRows(rows);
}

// Normal mode: comms come from the local API server (server/index.ts), which
// reads either the shared SharePoint workbook (once configured) or the local
// data/comms/*.csv files.
//
// Returns { comms, issues } — issues are rows that failed validation and were
// skipped (surfaced as a notice), not a fatal error. Rows/lane-heights are
// NOT assigned here — App runs layoutTimeline() over the raw comms.
export async function loadComms(): Promise<CommsParseResult> {
  if (STANDALONE) {
    return filterPersona(parseBakedComms());
  }
  const res = await fetch("/api/comms");
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API returned ${res.status}${body ? ` — ${body}` : ""}`);
  }
  return filterPersona((await res.json()) as CommsParseResult);
}
