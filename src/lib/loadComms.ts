import type { Comm } from "../data/types";

// Comms come from the local API server (server/index.ts), which itself
// reads either the shared SharePoint Excel workbook (once configured) or
// the local server/data/comms.csv fallback. The browser never talks to
// either data source directly — see server/dataStore.ts for that schema.
//
// Rows/lane-heights are NOT assigned here — App runs layoutTimeline() over
// the raw comms whenever the data or the expanded month changes.
export async function loadComms(): Promise<Comm[]> {
  const res = await fetch("/api/comms");
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API returned ${res.status}${body ? ` — ${body}` : ""}`);
  }
  return (await res.json()) as Comm[];
}
