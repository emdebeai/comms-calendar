// Marketing's eDM workbook → the campaign's touchpoints, chains and metric
// values. The workbook has two sheets: the sends (one row per Email Name,
// with the send-level Marketo metrics) and the CTAs (one row per link, with
// its rank and clicks). This folds them into the three CSVs the campaign
// reads, keeping every non-Marketing row the files already had. Runs in the
// browser on a file the user picked; nothing here touches the network.
import { parseCsv, parseCsvRows } from "./csv";
import { nameKey, type EdmTemplate, type TemplateIndex } from "./edmHtml";

const slugify = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

type Row = Record<string, unknown>;

/** A sheet's rows, keyed by header text, from SheetJS or a CSV. */
export type Sheet = Row[];

export const SENDS_HEADER = ["email name", "sent", "delivered", "opened"];
export const CTAS_HEADER = ["email name", "link", "people"];
const has = (row: Row | undefined, keys: string[]) => {
  const h = Object.keys(row ?? {}).map((k) => k.trim().toLowerCase());
  return keys.every((k) => h.includes(k));
};
export const isSendsSheet = (s: Sheet) => has(s[0], SENDS_HEADER);
export const isCtasSheet = (s: Sheet) => has(s[0], CTAS_HEADER);

// Read a cell by header, whatever its case or spacing.
const cell = (r: Row, name: string): unknown => {
  const k = Object.keys(r).find((k) => k.trim().toLowerCase() === name);
  return k === undefined ? undefined : r[k];
};
const text = (r: Row, name: string) => String(cell(r, name) ?? "").trim();
// Excel keeps a percentage as a fraction; a typed "35%" stays a string.
const pct = (r: Row, name: string) => {
  const v = cell(r, name);
  if (v === undefined || v === "" || v === null) return "";
  if (typeof v === "number") return `${Math.round(v * 1000) / 10}%`;
  const s = String(v).trim();
  return s.endsWith("%") ? s : Number.isFinite(Number(s)) && Number(s) <= 1 ? `${Math.round(Number(s) * 1000) / 10}%` : s;
};
const count = (r: Row, name: string) => {
  const v = cell(r, name);
  if (typeof v === "number") return String(Math.round(v));
  const n = Number(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) && String(v ?? "").trim() ? String(Math.round(n)) : "";
};
const MON = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
/** A Date, an Excel serial, dd/mm/yyyy text, or "19-Nov" / "5 Dec" with the
 *  year taken from `yearFrom` (another dated cell) or `fallbackYear` → ISO day. */
export const isoDate = (v: unknown, yearFrom?: unknown, fallbackYear?: number): string => {
  const s0 = String(v ?? "").trim();
  const dm = s0.match(/^(\d{1,2})[-/ ]([A-Za-z]{3})[a-z]*\.?$/); // "19-Nov", "5 Dec"
  if (dm) {
    const m = MON.indexOf(dm[2].toLowerCase()) + 1;
    const y = Number((isoDate(yearFrom) || "").slice(0, 4)) || fallbackYear || new Date().getFullYear();
    if (m) return `${y}-${String(m).padStart(2, "0")}-${dm[1].padStart(2, "0")}`;
  }
  // Local calendar day: SheetJS gives a Date at local midnight, which UTC
  // would roll back a day east of Greenwich.
  if (v instanceof Date && !Number.isNaN(v.getTime())) return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(v.getDate()).padStart(2, "0")}`;
  if (typeof v === "number") return new Date(Math.round((v - 25569) * 864e5)).toISOString().slice(0, 10);
  const s = String(v ?? "").trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/); // Australian order
  if (m) return `${m[3].length === 2 ? "20" + m[3] : m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : "";
};

// ── page names from URLs ──────────────────────────────────────────────────
const ACRONYMS = new Set(["atar", "vtac", "rmit", "cop", "vce", "tafe", "faq", "faqs"]);
/** The page's path, lower-case, no trailing slash, no query — the join key. */
export const pagePath = (url: string): string => {
  try {
    const u = new URL(url.trim());
    return (u.hostname.replace(/^www\./, "") + u.pathname).replace(/\/+$/, "").toLowerCase();
  } catch {
    return url.trim().split(/[?#]/)[0].replace(/^https?:\/\/(www\.)?/, "").replace(/\/+$/, "").toLowerCase();
  }
};
/** "…/managing-study-stress?utm…" → "Managing study stress". The home page
 *  is "RMIT home". No lookup, no model: the slug's own words. */
export const pageNameFromUrl = (url: string): string => {
  const path = pagePath(url);
  const slug = path.split("/").filter(Boolean).pop() ?? "";
  if (!slug || !path.includes("/")) return "RMIT home";
  const words = slug.replace(/\.[a-z]+$/, "").split(/[-_]+/).filter(Boolean)
    .map((w) => (ACRONYMS.has(w) ? w.toUpperCase() : w));
  return words.map((w, i) => (i === 0 && w === w.toLowerCase() ? w[0].toUpperCase() + w.slice(1) : w)).join(" ");
};
const utmOf = (url: string): Record<string, string> => {
  try { return Object.fromEntries([...new URL(url.trim()).searchParams].filter(([k]) => k.startsWith("utm_"))); } catch { return {}; }
};

// ── the fold ──────────────────────────────────────────────────────────────
const csvField = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const toCsv = (header: string[], rows: string[][]) => [header, ...rows].map((r) => r.map(csvField).join(",")).join("\n") + "\n";
const keep = (csv: string, drop: (r: Record<string, string>) => boolean) => {
  const header = parseCsv(csv)[0].map((h) => h.trim());
  const rows = parseCsvRows(csv).filter((r) => !drop(r)).map((r) => header.map((h) => r[h.toLowerCase()] ?? ""));
  return { header, rows };
};
const sheetRank = (r: Row): "primary" | "secondary" | "tertiary" | "" => {
  const v = text(r, "primary/secondary").toLowerCase();
  return v === "1" || v.startsWith("primary") ? "primary" : v === "2" || v.startsWith("secondary") ? "secondary" : v ? "tertiary" : "";
};

export type MarketoResult = {
  touchpoints: string; chains: string; values: string;
  sends: number; links: number; external: number; footer: number; rankedFromTemplate: number;
  templatesMatched: string[]; templatesUnmatched: string[];
  pagesAdded: string[]; unmatched: string[]; period: string;
};

/** Fold the two sheets into the campaign files. `current` is each file's
 *  text as the campaign reads it now; Marketing sends and everything hanging
 *  off them are replaced, every other row is kept. */
export function marketoToCampaign(
  sendsSheet: Sheet, ctasSheet: Sheet,
  current: { touchpoints: string; chains: string; values: string },
  campaign: string,
  /** The HTML templates (edmHtml.ts), matched to sends by name. A matched
   *  template fills a blank rank by button position and drops footer furniture. */
  templates: TemplateIndex = { byName: new Map(), byId: new Map() },
): MarketoResult {
  const tp = keep(current.touchpoints, (r) => r.team === "Marketing" && r.kind === "send");
  const kept = new Set(tp.rows.map((r) => r[0]));
  const pages = new Map(parseCsvRows(current.touchpoints).filter((r) => r.type === "webpage" && r.url).map((r) => [pagePath(r.url), r.id]));
  // Email Name is the join between the two sheets; case and spacing vary
  // between exports, so it's matched normalised.
  const nameOf = (r: Row) => text(r, "email name").toLowerCase();
  const ids = new Map<string, string>(); // Email Name → touchpoint id
  // A row with a name and nothing else (a stub line in the sheet) isn't a send.
  const sendRows = sendsSheet.filter((r) => nameOf(r) && (text(r, "date") || text(r, "sent") || text(r, "delivered")));
  for (const r of sendRows) {
    let id = slugify(nameOf(r)) || `send-${ids.size + 1}`;
    while (kept.has(id)) id += "-2";
    ids.set(nameOf(r), id);
  }
  const titleOf = (r: Row) => text(r, "subject line/banner copy") || text(r, "subject line") || text(r, "email name");
  const variants = (r: Row) => sendRows.filter((x) => titleOf(x) === titleOf(r)).length;

  // CTAs by send, in rank order; untracked destinations become pages.
  const ctas = new Map<string, Row[]>();
  for (const r of ctasSheet) {
    const name = nameOf(r);
    if (!ids.has(name) || !text(r, "link")) continue;
    ctas.set(name, [...(ctas.get(name) ?? []), r]);
  }
  const unmatched = [...new Set(ctasSheet.filter((r) => nameOf(r) && !ids.has(nameOf(r))).map((r) => text(r, "email name")))];
  const pagesAdded: string[] = [];
  let external = 0;
  const isRmit = (url: string) => /(^|\.)rmit\.edu\.au$/i.test(pagePath(url).split("/")[0]);
  const pageIdFor = (url: string) => {
    const path = pagePath(url);
    const hit = pages.get(path);
    if (hit) return hit;
    // Two paths can end in the same word (…/change-of-preference and
    // …/parents/change-of-preference); the second takes its parent segment.
    let title = pageNameFromUrl(url);
    if ([...pages.keys()].some((k) => pageNameFromUrl("https://" + k) === title) || pagesAdded.includes(title)) {
      const parent = pagePath(url).split("/").filter(Boolean).slice(-2, -1)[0];
      if (parent) title = `${title} (${pageNameFromUrl("https://x/" + parent).toLowerCase()})`;
    }
    let id = slugify(title) || "page";
    while (kept.has(id) || [...pages.values()].includes(id)) id += "-2";
    pages.set(path, id);
    pagesAdded.push(title);
    tp.rows.push(tp.header.map((h) => ({ id, campaign, team: "Digital", kind: "page", type: "webpage", title, url: url.split(/[?#]/)[0] } as Record<string, string>)[h] ?? ""));
    return id;
  };

  const chains = keep(current.chains, (r) => !kept.has(r.from));
  const values = keep(current.values, (r) => !kept.has(r.comm_id));
  const period = "eDM sheet";
  let links = 0, footer = 0, rankedFromTemplate = 0;
  // A template belongs to one send: same name as the Email Name, punctuation
  // aside. Marketo ID is the program's and only settles it for a one-send program.
  const idCount = new Map<string, number>();
  for (const r of sendRows) { const id = text(r, "marketo id"); if (id) idCount.set(id, (idCount.get(id) ?? 0) + 1); }
  const templateFor = (r: Row): EdmTemplate | undefined => {
    const byName = templates.byName.get(nameKey(text(r, "email name")));
    if (byName) return byName;
    const id = text(r, "marketo id");
    const byId = templates.byId.get(id) ?? [];
    return idCount.get(id) === 1 && byId.length === 1 ? byId[0] : undefined;
  };
  const matched = new Map<string, string>(); // template file → Email Name
  for (const r of sendRows) { const t = templateFor(r); if (t) matched.set(t.file, text(r, "email name")); }
  const templatesMatched = [...matched.values()];
  const templatesUnmatched = [...templates.byName.values()].filter((t) => !matched.has(t.file)).map((t) => t.file.replace(/\.html?$/i, ""));
  for (const r of sendRows) {
    const name = nameOf(r), id = ids.get(name)!;
    const template = templateFor(r);
    const tpl = (l: Row) => template?.links.find((x) => x.path === pagePath(text(l, "link")));
    // The sheet's rank wins; a blank one takes the template's button order.
    const rank = (l: Row): "primary" | "secondary" | "tertiary" => {
      const sheet = sheetRank(l);
      if (sheet) return sheet;
      const t = tpl(l)?.rank;
      if (t) rankedFromTemplate++;
      return t || "tertiary";
    };
    const all = (ctas.get(name) ?? []).slice();
    // Footer furniture (terms, privacy, social, logo) is not a CTA.
    const links_ = all.filter((l) => { const f = tpl(l)?.kind === "footer"; if (f) footer++; return !f; });
    const primary = links_.find((l) => rank(l) === "primary"), secondary = links_.find((l) => rank(l) === "secondary");
    const anyUtm = links_.some((l) => utmOf(text(l, "link")).utm_campaign);
    const ow = text(r, "objective").toLowerCase();
    const objective = ow.startsWith("aware") ? "awareness" : ow.startsWith("consider") ? "consideration" : ow.startsWith("decid") || ow.startsWith("decis") ? "decision" : ow;
    const row: Record<string, string> = {
      id, campaign, team: "Marketing", kind: "send", objective, type: "email",
      title: titleOf(r), date: isoDate(cell(r, "date"), cell(r, "first activity (aedt)") ?? cell(r, "first activity"), Number(campaign.match(/\d{4}/)?.[0])), audience: text(r, "audience variant"),
      primary_cta: primary ? text(primary, "cta") : "", secondary_cta: secondary ? text(secondary, "cta") : "",
      cvp: text(r, "theme"), variants: variants(r) > 1 ? String(variants(r)) : "", variant_basis: "",
      new_2026: /^(y|yes|true|1|new)$/i.test(text(r, "new this year")) ? "yes" : "", utm: links_.length ? (anyUtm ? "yes" : "no") : "",
      url: "", map_id: "",
      template: template ? "yes" : "",
    };
    // Send-level metrics. The sheet's Benchmark column is either a number
    // (the benchmark for the objective's success measure) or the NAME of
    // the success measure ("Open Rate", "Click Rate") with no number.
    const benchRaw = text(r, "benchmark");
    const named = /^[a-z %-]+$/i.test(benchRaw) ? benchRaw.toLowerCase() : "";
    const bench = named ? "" : pct(r, "benchmark");
    const success = named.startsWith("open") ? "Open rate"
      : named.startsWith("click-to-open") || named.startsWith("click to open") || named.startsWith("cto") ? "Click-to-open rate"
      : named.startsWith("click") ? "Click rate"
      : named.startsWith("unsub") ? "Unsubscribe rate"
      : objective === "awareness" ? "Open rate" : objective === "consideration" ? "Click-to-open rate" : objective === "decision" ? "Link — % of people" : "";
    const sent = Number(count(r, "sent")), bounced = Number(count(r, "hard bounced") || 0) + Number(count(r, "soft bounced") || 0);
    const metrics: [string, string][] = [
      ["Total delivered", count(r, "delivered")],
      ["Open rate", pct(r, "% opened")],
      ["Click rate", pct(r, "% clicked email")],
      ["Click-to-open rate", pct(r, "clicked to opened ratio")],
      ["Unsubscribe rate", pct(r, "% unsubscribed")],
      ["Bounce rate (email)", sent ? `${Math.round((bounced / sent) * 1000) / 10}%` : ""],
    ];
    // The map derives the success measure from the objective, so when the
    // sheet names a measure the objective follows it.
    if (success === "Open rate") row.objective = "awareness";
    else if (success === "Click rate" || success === "Click-to-open rate") row.objective = "consideration";
    else if (success === "Link — % of people") row.objective = "decision";
    tp.rows.push(tp.header.map((h) => row[h] ?? ""));
    for (const [metric, value] of metrics) if (value) values.rows.push([id, "", metric, value, metric === success ? bench : "", period]);

    for (const l of links_) {
      const url = text(l, "link"), cta = rank(l);
      links++;
      // A link off rmit.edu.au (social, partners) is counted but has no page
      // on the map to land on.
      if (isRmit(url)) chains.rows.push([id, pageIdFor(url), cta, text(l, "cta"), utmOf(url).utm_campaign ? "yes" : "no", "send", "yes", count(l, "people")]);
      else external++;
      values.rows.push([id, cta, "Link — people", count(l, "people"), "", period]);
      const share = pct(l, "% people");
      if (share) values.rows.push([id, cta, "Link — % of people", share, cta === "primary" && success === "Link — % of people" ? bench : "", period]);
    }
  }
  return {
    touchpoints: toCsv(tp.header, tp.rows), chains: toCsv(chains.header, chains.rows), values: toCsv(values.header, values.rows),
    sends: sendRows.length, links, external, footer, rankedFromTemplate, templatesMatched, templatesUnmatched, pagesAdded, unmatched, period,
  };
}
