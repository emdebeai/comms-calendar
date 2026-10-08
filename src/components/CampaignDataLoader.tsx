import { useRef, useState } from "react";
import { Check, Upload } from "lucide-react";
import { CAMPAIGN, CAMPAIGN_FILES, CURRENT_FILES, DATA_LABEL, FILE_CONTENTS, FILE_SOURCE } from "../lib/campaign";
import { clearLoaded, readLoaded, writeLoaded, type LoadedFiles } from "../lib/campaignLoaded";
import { parseCsv, parseCsvRows, tidyExport } from "../lib/csv";
import { GENESYS_HEADER, genesysToDaily, isGenesys } from "../lib/genesys";
import { CTAS_HEADER, isCtasSheet, isSendsSheet, marketoToCampaign, SENDS_HEADER, type Sheet } from "../lib/marketo";
import { EYEBROW, FOCUS_RING } from "../lib/styles";
import { DetailPanelShell } from "./DetailPanelShell";

// Load campaign data into the page — the exports each team hands over,
// picked or pasted. They're read by the browser's File API and stored in
// the browser; this component makes no network request. A file is
// recognised by its column headers, wherever its header row sits, not by
// its name. Each export is folded into the campaign's own files here:
//   Marketing's eDM sends sheet + CTAs sheet → touchpoints, chains, metrics
//   Study@'s Genesys daily exports (any number) → studyat-daily
//   Digital's page files → used as they are (no CJA ingest yet)
// The list the user sees is by export, not by internal file.

/** Set before the reload that follows Apply, so the panel reopens with the result. */
export const REOPEN = "cc-campaign-data-reopen";
/** Sidecar in the loaded set: what each source export contributed, in words. */
const SOURCES_KEY = "_sources";
type Sources = { sends?: string; ctas?: string; genesys?: string; pages?: string };

const PAGE_FILES = ["page-referrers.csv", "page-next-steps.csv", "web-daily-by-page.csv"];
const EDM_FILES = ["touchpoints.csv", "chains.csv", "metric-values.csv"];

/** Which campaign file a CSV is, from its header row — and what's missing. */
function recognise(text: string): { name: string; missing: string[] } | null {
  const header = (parseCsv(text)[0] ?? []).map((h) => h.trim().toLowerCase());
  if (!header.length) return null;
  const scored = CAMPAIGN_FILES.map((f) => ({
    name: f.name,
    missing: f.header.filter((h) => !header.includes(h.toLowerCase())),
    hits: f.header.filter((h) => header.includes(h.toLowerCase())).length / f.header.length,
  })).sort((a, b) => b.hits - a.hits);
  return scored[0].hits >= 0.6 ? { name: scored[0].name, missing: scored[0].missing } : null;
}
const readSources = (files: LoadedFiles): Sources => {
  try { return JSON.parse(files[SOURCES_KEY] ?? "{}") as Sources; } catch { return {}; }
};
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function CampaignDataLoader({ onClose }: { onClose: () => void }) {
  const current = readLoaded();
  const applied = readSources(current.files);
  const [staged, setStaged] = useState<LoadedFiles>(current.files);
  const [sources, setSources] = useState<Sources>(applied);
  const [keep, setKeep] = useState(current.kept);
  const [notes, setNotes] = useState<string[]>([]);
  const [rejected, setRejected] = useState<{ name: string; line: string } | null>(null);
  const [paste, setPaste] = useState("");
  const [genesys, setGenesys] = useState<string[]>([]);
  const [edm, setEdm] = useState<{ sends?: Sheet; ctas?: Sheet }>({});
  const input = useRef<HTMLInputElement>(null);

  const stage = (files: Record<string, string | undefined>, src: Partial<Sources>) => {
    setStaged((s) => {
      const n = { ...s };
      for (const [k, v] of Object.entries(files)) { if (v === undefined) delete n[k]; else n[k] = v; }
      return n;
    });
    setSources((s) => ({ ...s, ...src }));
  };

  // Study@: any number of Genesys daily files, folded into one.
  const foldGenesys = (texts: string[]) => {
    setGenesys(texts);
    const r = genesysToDaily(texts);
    if (!r.days) return `${plural(texts.length, "Genesys file")}: no Study@ rows found.`;
    const summary = `${plural(r.files, "daily file")} → ${plural(r.days, "day")}, ${r.from} to ${r.to}, ${r.channels.join(" and ")}`;
    stage({ "studyat-daily.csv": r.csv }, { genesys: summary });
    const outside = r.to < CAMPAIGN.from || r.from > CAMPAIGN.to
      ? ` — NOTE: these days fall outside the campaign window (${CAMPAIGN.from} to ${CAMPAIGN.to}), so they won't show on the map`
      : "";
    return `Study@: ${summary}${r.skipped ? ` (${r.skipped} rows from other queues or media types left out)` : ""}${outside}`;
  };
  // Marketing: the sends sheet and the CTAs sheet, as two CSVs (together or
  // one at a time) or one workbook; whichever is held is folded.
  const foldEdm = (next: { sends?: Sheet; ctas?: Sheet }, label: string) => {
    setEdm(next);
    if (!next.sends) {
      setSources((s) => ({ ...s, ctas: `${plural(next.ctas?.length ?? 0, "link row")} held — add the sends file` }));
      return `${label} → CTAs held; add the sends file to load them.`;
    }
    const r = marketoToCampaign(next.sends, next.ctas ?? [], CURRENT_FILES, CAMPAIGN.id);
    const src: Partial<Sources> = { sends: `${plural(r.sends, "send")}` };
    if (next.ctas) src.ctas = `${plural(r.links, "link")}${r.pagesAdded.length ? `, ${plural(r.pagesAdded.length, "destination page")} added` : ""}`;
    stage({ "touchpoints.csv": r.touchpoints, "chains.csv": r.chains, "metric-values.csv": r.values }, src);
    const bits = [plural(r.sends, "send"), next.ctas ? plural(r.links, "link") : "no CTAs file yet"];
    if (r.pagesAdded.length) bits.push(`${plural(r.pagesAdded.length, "destination page")} added: ${r.pagesAdded.join(", ")}`);
    if (r.unmatched.length) bits.push(`${plural(r.unmatched.length, "CTA row")} with no matching send: ${r.unmatched.join(", ")}`);
    return `${label} → Marketing (${bits.join(" · ")})`;
  };
  const takeWorkbook = async (file: File): Promise<string> => {
    const XLSX = await import("xlsx"); // only when a workbook is picked
    const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true });
    const sheets: Sheet[] = wb.SheetNames.map((n) => XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[n], { defval: "" }));
    const sends = sheets.find(isSendsSheet), ctas = sheets.find(isCtasSheet);
    if (!sends && !ctas) return reject(file.name, wb.SheetNames.join(" · "));
    return foldEdm({ sends: sends ?? edm.sends, ctas: ctas ?? edm.ctas }, file.name);
  };
  const reject = (name: string, line: string) => {
    setRejected({ name, line });
    return `${name}: NOT LOADED — no row in it matches any export's columns.`;
  };
  const KNOWN = [...CAMPAIGN_FILES.map((f) => f.header), SENDS_HEADER, CTAS_HEADER, GENESYS_HEADER];
  /** Any text file in: find its header row, then route it. A Genesys file
   *  comes back as text to fold with the others; anything else, a note. */
  const take = (raw: string, label: string): { note: string } | { genesys: string } => {
    const tidy = tidyExport(raw, KNOWN);
    if (!tidy) {
      const first = raw.replace(/^﻿/, "").split(/\r?\n/).find((l) => l.trim()) ?? "";
      return { note: reject(label, first.slice(0, 160)) };
    }
    const text = tidy.text;
    const where = tidy.headerLine > 1 ? ` (header on line ${tidy.headerLine})` : "";
    if (isGenesys(parseCsv(text)[0] ?? [])) return { genesys: text };
    const rows: Sheet = parseCsvRows(text);
    if (isSendsSheet(rows)) return { note: foldEdm({ ...edm, sends: rows }, label + where) };
    if (isCtasSheet(rows)) return { note: foldEdm({ ...edm, ctas: rows }, label + where) };
    const hit = recognise(text);
    if (!hit) return { note: reject(label, (parseCsv(text)[0] ?? []).join(", ").slice(0, 160)) };
    if (parseCsv(text).length < 2) return { note: `${label}: recognised as ${hit.name}, but it has no rows.` };
    stage({ [hit.name]: text }, PAGE_FILES.includes(hit.name) ? { pages: "tool-format files" } : {});
    return { note: `${label}${where} → ${hit.name}${hit.missing.length ? ` (missing columns: ${hit.missing.join(", ")})` : ""}` };
  };
  const onFiles = async (list: FileList | null) => {
    if (!list) return;
    const out: string[] = [];
    const daily: string[] = [];
    for (const file of Array.from(list)) {
      if (/\.xlsx?$/i.test(file.name)) { out.push(await takeWorkbook(file)); continue; }
      const r = take(await file.text(), file.name);
      if ("note" in r) out.push(r.note);
      else daily.push(r.genesys);
    }
    if (daily.length) out.push(foldGenesys([...genesys, ...daily]));
    setNotes((n) => [...out, ...n].slice(0, 12)); // newest first; earlier results stay visible
  };
  const removeSource = (which: keyof Sources) => {
    if (which === "genesys") { setGenesys([]); stage({ "studyat-daily.csv": undefined }, { genesys: undefined }); }
    if (which === "pages") stage(Object.fromEntries(PAGE_FILES.map((f) => [f, undefined])), { pages: undefined });
    if (which === "sends") { setEdm({}); stage(Object.fromEntries(EDM_FILES.map((f) => [f, undefined])), { sends: undefined, ctas: undefined }); }
    if (which === "ctas") { if (edm.sends) foldEdm({ sends: edm.sends }, "Sends only"); else { setEdm({}); setSources((s) => ({ ...s, ctas: undefined })); } }
  };
  const apply = () => {
    const files = { ...staged, [SOURCES_KEY]: JSON.stringify(sources) };
    if (Object.keys(staged).length) writeLoaded(files, keep);
    else clearLoaded();
    sessionStorage.setItem(REOPEN, "1"); // come back to this panel: it states what loaded
    window.location.reload();
  };
  const dirty = JSON.stringify(staged) !== JSON.stringify(current.files) || keep !== current.kept;

  // One row per export the teams hand over. Status: what's applied (shown on
  // the map now), what's staged (Ready, needs Apply), or nothing.
  const status = (which: keyof Sources, files: string[]) => {
    // The Marketing and Study@ rows go by what their export contributed
    // (several rows can write the same internal file); Digital's by its files.
    const stagedNow = which === "pages"
      ? files.some((f) => staged[f] !== undefined && staged[f] !== current.files[f])
      : Boolean(sources[which]) && sources[which] !== applied[which];
    const appliedNow = which === "pages" ? files.some((f) => FILE_SOURCE[f] === "loaded" || FILE_SOURCE[f] === "local") : Boolean(applied[which]);
    if (stagedNow) return { state: "ready" as const, text: `${sources[which] ?? "ready"} · not applied yet` };
    if (appliedNow) return { state: "loaded" as const, text: applied[which] ?? files.map((f) => FILE_CONTENTS[f]).join(", ") };
    return { state: "none" as const, text: "Not loaded" };
  };
  const rows: { which: keyof Sources; team: string; name: string; expects: string; files: string[] }[] = [
    { which: "sends", team: "Marketing", name: "eDM sends sheet", expects: "Email Name, Date, Objective, Sent, Delivered, % Opened …", files: ["touchpoints.csv", "metric-values.csv"] },
    { which: "ctas", team: "Marketing", name: "CTAs sheet (click report)", expects: "Email Name, CTA, Primary/Secondary, Link, People …", files: ["chains.csv"] },
    { which: "pages", team: "Digital", name: "Page traffic, referrers, next steps", expects: "tool-format CSVs for now — no CJA ingest yet", files: PAGE_FILES },
    { which: "genesys", team: "Study@", name: "Genesys daily queue exports", expects: "Interval Start, Media Type, Queue Name, Offer … any number of days at once", files: ["studyat-daily.csv"] },
  ];

  return (
    <DetailPanelShell
      overline="Campaign data"
      title="Load data"
      iconChipClass="bg-tint-blue text-rmit-blue"
      icon={<Upload size={16} strokeWidth={1.75} aria-hidden />}
      onClose={onClose}
    >
      <div className="flex-1 overflow-y-auto p-6">
        <p className={`rounded-md px-3 py-2 text-sm text-grey-90 ${DATA_LABEL === "proxy data" || DATA_LABEL === "no data loaded yet" ? "bg-tint-amber" : "bg-tint-green"}`}>
          <span className="font-semibold">{DATA_LABEL === "proxy data" ? "Showing proxy data: nothing loaded yet." : DATA_LABEL === "no data loaded yet" ? "Nothing loaded yet for this campaign." : "Showing your data only."}</span>{" "}
          {DATA_LABEL === "proxy data" ? "Load any export and the proxy figures go; what you don't load stays empty." : DATA_LABEL === "no data loaded yet" ? "The map is empty until you load exports." : "What you haven't loaded is empty, never proxy."}
        </p>
        <p className="mt-2 text-xs text-grey-70">Files are read by your browser and stay in it. Nothing is sent to Vercel, GitHub or any server.</p>

        <h3 className={`mt-6 text-grey-70 ${EYEBROW}`}>Exports</h3>
        <ul className="mt-2 divide-y divide-grey-30">
          {rows.map((r) => {
            const s = status(r.which, r.files);
            return (
              <li key={r.which} className="flex items-start justify-between gap-3 py-2.5">
                <span className="min-w-0">
                  <span className="block text-sm text-grey-90"><span className="font-semibold">{r.team}</span> · {r.name}</span>
                  <span className={`block text-xs ${s.state === "none" ? "text-grey-60" : "text-grey-80"}`}>{s.state === "none" ? r.expects : s.text}</span>
                </span>
                {s.state === "none" ? (
                  <span className="shrink-0 text-xs text-grey-60">Not loaded</span>
                ) : (
                  <span className={`flex shrink-0 items-center gap-2 text-xs ${s.state === "loaded" ? "text-success" : "text-grey-90"}`}>
                    <Check size={13} strokeWidth={2.5} aria-hidden /> {s.state === "loaded" ? "On the map" : "Ready"}
                    <button type="button" onClick={() => removeSource(r.which)} className={`rounded text-grey-70 underline-offset-2 hover:underline ${FOCUS_RING}`}>Remove</button>
                  </span>
                )}
              </li>
            );
          })}
        </ul>

        {rejected && (
          <div className="mt-3 rounded-md bg-tint-red px-3 py-2 text-sm text-grey-90" role="alert">
            <span className="font-semibold">{rejected.name} was not loaded.</span> No row in it matches any export above. Its first line is:
            <code className="mt-1 block truncate font-mono text-xs">{rejected.line}</code>
          </div>
        )}

        <h3 className={`mt-6 text-grey-70 ${EYEBROW}`}>Add exports</h3>
        <input ref={input} type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" multiple className="sr-only" onChange={(e) => void onFiles(e.target.files)} />
        <button type="button" onClick={() => input.current?.click()} className={`mt-2 rounded-md border border-grey-30 bg-card px-3 py-2 text-sm font-medium text-grey-90 hover:bg-grey-10 ${FOCUS_RING}`}>
          Choose files
        </button>
        <p className="mt-2 text-xs text-grey-70">Any of the exports above, several at once. Each is recognised by its columns, so file names don't matter.</p>

        <label htmlFor="campaign-paste" className="sr-only">Paste CSV text, header row included</label>
        <textarea
          id="campaign-paste"
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          rows={3}
          placeholder="Or paste one export's CSV text, header row included"
          spellCheck={false}
          className="mt-3 w-full rounded-md border border-grey-30 bg-card px-3 py-2 font-mono text-xs text-grey-90 placeholder:text-grey-70 focus:border-rmit-blue-interactive focus:outline-2 focus:outline-offset-0 focus:outline-rmit-blue-interactive"
        />
        <button
          type="button"
          disabled={!paste.trim()}
          onClick={() => { const r = take(paste, "Pasted text"); const note = "note" in r ? r.note : foldGenesys([...genesys, r.genesys]); setNotes((n) => [note, ...n].slice(0, 12)); setPaste(""); }}
          className={`mt-2 rounded-md border border-grey-30 bg-card px-3 py-2 text-sm font-medium text-grey-90 hover:bg-grey-10 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
        >
          Add pasted text
        </button>

        {notes.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1 text-xs text-grey-80" aria-live="polite">
            {notes.map((n, i) => <li key={`${i}-${n}`} className={n.includes("NOT LOADED") ? "font-medium text-danger" : ""}>{n}</li>)}
          </ul>
        )}

        <label className="mt-5 flex items-start gap-2 text-sm text-grey-90">
          <input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} className={`mt-0.5 size-4 accent-rmit-blue ${FOCUS_RING}`} />
          <span>
            Keep on this device
            <span className="block text-xs text-grey-70">Off: the data is gone when this tab closes. On: it stays in this browser until you remove it.</span>
          </span>
        </label>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-grey-30 p-5">
        <button type="button" onClick={() => { clearLoaded(); window.location.reload(); }} disabled={!Object.keys(current.files).length} className={`rounded text-sm text-danger hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline ${FOCUS_RING}`}>
          Remove loaded data
        </button>
        <button type="button" onClick={apply} disabled={!dirty} className={`rounded-full bg-rmit-blue px-4 py-2 text-sm font-medium text-on-accent disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}>
          Apply and reload
        </button>
      </div>
    </DetailPanelShell>
  );
}
