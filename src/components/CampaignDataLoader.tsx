import { useRef, useState } from "react";
import { Check, Upload } from "lucide-react";
import { CAMPAIGN, CAMPAIGN_FILES, CURRENT_FILES, FILE_SOURCE } from "../lib/campaign";
import { clearLoaded, readLoaded, writeLoaded, type LoadedFiles } from "../lib/campaignLoaded";
import { parseCsv } from "../lib/csv";
import { genesysToDaily, isGenesys } from "../lib/genesys";
import { isCtasSheet, isSendsSheet, marketoToCampaign, type Sheet } from "../lib/marketo";
import { EYEBROW, FOCUS_RING } from "../lib/styles";
import { DetailPanelShell } from "./DetailPanelShell";

// Load campaign CSVs into the page — picked or pasted. They're read by the
// browser's File API and stored in the browser; this component makes no
// network request. A file is recognised by its column headers, not its name.
// Genesys queue exports (one per day, any number of them) are folded into
// studyat-daily.csv here, in the browser, before anything is stored; the
// eDM workbook (.xlsx, sends + CTAs sheets) is folded into touchpoints,
// chains and metric values the same way.

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

export function CampaignDataLoader({ onClose }: { onClose: () => void }) {
  const current = readLoaded();
  const [staged, setStaged] = useState<LoadedFiles>(current.files);
  const [keep, setKeep] = useState(current.kept);
  const [notes, setNotes] = useState<string[]>([]);
  const [paste, setPaste] = useState("");
  const [genesys, setGenesys] = useState<string[]>([]);
  const [genesysNote, setGenesysNote] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const foldGenesys = (texts: string[]) => {
    setGenesys(texts);
    const r = genesysToDaily(texts);
    if (!r.days) { setGenesysNote(""); return `${texts.length} Genesys file${texts.length === 1 ? "" : "s"}: no Study@ rows found.`; }
    setStaged((s) => ({ ...s, "studyat-daily.csv": r.csv }));
    const note = `${r.files} Genesys daily file${r.files === 1 ? "" : "s"} → ${r.days} day${r.days === 1 ? "" : "s"}, ${r.from} to ${r.to}, ${r.channels.join(" and ")}`;
    setGenesysNote(note);
    return note + (r.skipped ? ` (${r.skipped} rows from other queues or media types left out)` : "");
  };
  // The eDM workbook: SheetJS is loaded only when an .xlsx is picked, so the
  // map's own bundle doesn't carry it. Parsed here, in the browser.
  const takeWorkbook = async (file: File): Promise<string> => {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true });
    const sheets: Sheet[] = wb.SheetNames.map((n) => XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[n], { defval: "" }));
    const sends = sheets.find(isSendsSheet), ctas = sheets.find(isCtasSheet);
    if (!sends) return `${file.name}: no sheet with Email Name, Sent, Delivered and Opened columns.`;
    const r = marketoToCampaign(sends, ctas ?? [], CURRENT_FILES, CAMPAIGN.id);
    setStaged((s) => ({ ...s, "touchpoints.csv": r.touchpoints, "chains.csv": r.chains, "metric-values.csv": r.values }));
    const bits = [`${r.sends} sends`, ctas ? `${r.links} links` : "no CTA sheet"];
    if (r.pagesAdded.length) bits.push(`${r.pagesAdded.length} destination page${r.pagesAdded.length === 1 ? "" : "s"} added: ${r.pagesAdded.join(", ")}`);
    if (r.unmatched.length) bits.push(`${r.unmatched.length} CTA row${r.unmatched.length === 1 ? "" : "s"} with no matching send: ${r.unmatched.join(", ")}`);
    return `${file.name} → touchpoints, chains and metric values (${bits.join(" · ")})`;
  };
  const take = (text: string, label: string) => {
    if (isGenesys(parseCsv(text)[0] ?? [])) return null; // folded together below
    const hit = recognise(text);
    if (!hit) return `${label}: columns don't match any campaign file.`;
    if (parseCsv(text).length < 2) return `${label}: recognised as ${hit.name}, but it has no rows.`;
    setStaged((s) => ({ ...s, [hit.name]: text }));
    return `${label} → ${hit.name}${hit.missing.length ? ` (missing columns: ${hit.missing.join(", ")})` : ""}`;
  };
  const onFiles = async (list: FileList | null) => {
    if (!list) return;
    const out: string[] = [];
    const daily: string[] = [];
    for (const file of Array.from(list)) {
      if (/\.xlsx?$/i.test(file.name)) { out.push(await takeWorkbook(file)); continue; }
      const text = await file.text();
      const note = take(text, file.name);
      if (note) out.push(note);
      else daily.push(text);
    }
    if (daily.length) out.push(foldGenesys([...genesys, ...daily]));
    setNotes(out);
  };
  const apply = () => {
    if (Object.keys(staged).length) writeLoaded(staged, keep);
    else clearLoaded();
    window.location.reload();
  };
  const dirty = JSON.stringify(staged) !== JSON.stringify(current.files) || keep !== current.kept;

  return (
    <DetailPanelShell
      overline="Campaign data"
      title="Load data"
      iconChipClass="bg-tint-blue text-rmit-blue"
      icon={<Upload size={16} strokeWidth={1.75} aria-hidden />}
      onClose={onClose}
    >
      <div className="flex-1 overflow-y-auto p-6">
        <p className="rounded-md bg-tint-green px-3 py-2 text-sm text-grey-90">
          Files are read by your browser and stay in it. Nothing is sent to Vercel, GitHub or any server.
        </p>

        <h3 className={`mt-6 text-grey-70 ${EYEBROW}`}>Choose files</h3>
        <input ref={input} type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" multiple className="sr-only" onChange={(e) => void onFiles(e.target.files)} />
        <button type="button" onClick={() => input.current?.click()} className={`mt-2 rounded-md border border-grey-30 bg-card px-3 py-2 text-sm font-medium text-grey-90 hover:bg-grey-10 ${FOCUS_RING}`}>
          Choose files
        </button>
        <p className="mt-2 text-xs text-grey-70">CSV, or the eDM workbook (.xlsx, sends and CTAs sheets). Genesys daily exports can be chosen together; they fold into the Study@ file.</p>

        <h3 className={`mt-6 text-grey-70 ${EYEBROW}`}>Or paste one</h3>
        <label htmlFor="campaign-paste" className="sr-only">Paste CSV text, header row included</label>
        <textarea
          id="campaign-paste"
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          rows={4}
          placeholder="Paste CSV text, header row included"
          spellCheck={false}
          className="mt-2 w-full rounded-md border border-grey-30 bg-card px-3 py-2 font-mono text-xs text-grey-90 placeholder:text-grey-70 focus:border-rmit-blue-interactive focus:outline-2 focus:outline-offset-0 focus:outline-rmit-blue-interactive"
        />
        <button
          type="button"
          disabled={!paste.trim()}
          onClick={() => { setNotes([take(paste, "Pasted text") ?? foldGenesys([...genesys, paste])]); setPaste(""); }}
          className={`mt-2 rounded-md border border-grey-30 bg-card px-3 py-2 text-sm font-medium text-grey-90 hover:bg-grey-10 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
        >
          Add pasted file
        </button>

        {notes.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1 text-xs text-grey-80" aria-live="polite">
            {notes.map((n) => <li key={n}>{n}</li>)}
          </ul>
        )}

        <h3 className={`mt-6 text-grey-70 ${EYEBROW}`}>Files</h3>
        <ul className="mt-2 divide-y divide-grey-30">
          {CAMPAIGN_FILES.map((f) => {
            const on = Boolean(staged[f.name]);
            return (
              <li key={f.name} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="block text-sm text-grey-90">{f.what}</span>
                  <span className="block truncate text-xs text-grey-60">{f.name === "studyat-daily.csv" && genesysNote ? genesysNote : f.header.join(", ")}</span>
                </span>
                {on ? (
                  <span className="flex shrink-0 items-center gap-2 text-xs text-success">
                    <Check size={13} strokeWidth={2.5} aria-hidden /> Loaded
                    <button type="button" onClick={() => { if (f.name === "studyat-daily.csv") { setGenesys([]); setGenesysNote(""); } setStaged((s) => { const n = { ...s }; delete n[f.name]; return n; }); }} className={`rounded text-grey-70 underline-offset-2 hover:underline ${FOCUS_RING}`}>Remove</button>
                  </span>
                ) : (
                  <span className="shrink-0 text-xs text-grey-60">{FILE_SOURCE[f.name] === "local" ? "Local file" : "Proxy"}</span>
                )}
              </li>
            );
          })}
        </ul>

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
          Apply
        </button>
      </div>
    </DetailPanelShell>
  );
}
