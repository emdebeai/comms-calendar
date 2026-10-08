// Campaign mode — the persona map, scoped to one campaign's window, with the
// campaign's own data layered on. Entered with ?campaign=<id>. Everything
// here is read only when that flag is set; the normal map never touches it.
//
// Sources (all in data/, see data/README.md): campaigns.csv (the window),
// campaign-touchpoints.csv (the touchpoints, one row per audience variant),
// chains.csv (one row per CTA), and the PROXY figures in data/dummy/.
import proxyTouchpoints from "../../data/campaign-touchpoints.csv?raw";
import proxyChains from "../../data/chains.csv?raw";
import proxyValues from "../../data/dummy/metric-values.csv?raw";
import proxyReferrers from "../../data/dummy/page-referrers.csv?raw";
import proxyNextSteps from "../../data/dummy/page-next-steps.csv?raw";
import proxyStudyDaily from "../../data/dummy/studyat-daily.csv?raw";
import proxyWebByPage from "../../data/dummy/web-daily-by-page.csv?raw";
import { parseCsvRows } from "./csv";
import { readLoaded } from "./campaignLoaded";
import type { Comm, CommType, InboundLaneData, Team } from "../data/types";

import { CAMPAIGN_MODE, CAMPAIGN_MOMENT, CAMPAIGN_ROW } from "./campaignFlag";
export { CAMPAIGN_MODE };
// LOCAL DATA. Real figures never enter the repo. Put a file with the same
// name in local/campaign/ (git-ignored) and it replaces the proxy one below —
// read from disk at build time on this machine, bundled into the page, and
// sent nowhere. A missing local file falls back to its proxy.
const localFiles = import.meta.glob("../../local/campaign/*.csv", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const local = (name: string): string | undefined => {
  const text = Object.entries(localFiles).find(([path]) => path.endsWith(`/${name}`))?.[1];
  // header only = not supplied yet
  return text && text.trim().split("\n").length > 1 ? text : undefined;
};
// LOADED IN THE BROWSER. Files picked or pasted on the page (see
// campaignLoaded.ts) win over both — they exist only in this browser.
const loaded = readLoaded().files;
// Proxy figures stand in only while NOTHING real has been supplied. Once any
// file is loaded (or local), the files that weren't are empty — header only —
// so a real figure is never shown beside a made-up one.
const ANY_REAL = Object.keys(loaded).length > 0 || Object.keys(localFiles).some((path) => local(path.split("/").pop()!));
const headerOnly = (csv: string) => csv.split("\n")[0] + "\n";
// The proxy files describe cop-2026 only; any other campaign starts empty.
const PROXY_CAMPAIGN = "cop-2026";
const NO_PROXY = ANY_REAL || CAMPAIGN_ROW?.id !== PROXY_CAMPAIGN;
const pick = (name: string, proxy: string) => loaded[name] ?? local(name) ?? (NO_PROXY ? headerOnly(proxy) : proxy);
/** The files the campaign reads, with the proxy each falls back to. Their
 *  header rows are how a picked or pasted file is recognised. */
export const CAMPAIGN_FILES: { name: string; what: string; header: string[] }[] = [
  ["touchpoints.csv", "Touchpoints, one row per audience variant", proxyTouchpoints],
  ["chains.csv", "Where each CTA lands", proxyChains],
  ["metric-values.csv", "Metrics and benchmarks", proxyValues],
  ["page-referrers.csv", "Where each page's traffic came from", proxyReferrers],
  ["page-next-steps.csv", "What people did next on each page", proxyNextSteps],
  ["web-daily-by-page.csv", "Sessions per page per day", proxyWebByPage],
  ["studyat-daily.csv", "Study@ contacts per channel per day", proxyStudyDaily],
].map(([name, what, proxy]) => ({ name, what, header: proxy.split("\n")[0].trim().split(",") }));
const touchpointsRaw = pick("touchpoints.csv", proxyTouchpoints);
const chainsRaw = pick("chains.csv", proxyChains);
const valuesRaw = pick("metric-values.csv", proxyValues);
const referrersRaw = pick("page-referrers.csv", proxyReferrers);
const nextStepsRaw = pick("page-next-steps.csv", proxyNextSteps);
const studyDailyRaw = pick("studyat-daily.csv", proxyStudyDaily);
const webByPageRaw = pick("web-daily-by-page.csv", proxyWebByPage);
/** Each file's text as the campaign reads it now — what an ingest merges into. */
export const CURRENT_FILES = { touchpoints: touchpointsRaw, chains: chainsRaw, values: valuesRaw };
/** Where each file is coming from right now. */
export const FILE_SOURCE: Record<string, "loaded" | "local" | "proxy" | "none"> = Object.fromEntries(
  CAMPAIGN_FILES.map((f) => [f.name, loaded[f.name] ? "loaded" : local(f.name) ? "local" : NO_PROXY ? "none" : "proxy"]),
);
/** What the campaign is showing right now, in words — the pill says which,
 *  the Load data panel says which files. Never a mix of proxy and real. */
const sources = Object.values(FILE_SOURCE);
export const DATA_LABEL = !NO_PROXY ? "proxy data"
  : !ANY_REAL ? "no data loaded yet"
  : `${sources.includes("loaded") ? "loaded data" : "local data"} · ${sources.filter((s) => s === "loaded" || s === "local").length} of ${sources.length} files`;
export const VALUES_ARE_PROXY = !NO_PROXY;

export type Objective = "awareness" | "consideration" | "decision";
export interface MetricValue {
  cta?: "primary" | "secondary" | "tertiary";
  metric: string;
  value: string;
  benchmark?: string;
}
export interface Chain {
  from: string;
  to: string;
  cta?: "primary" | "secondary" | "tertiary";
  via?: string;
  utm?: boolean;
  resolution: "send" | "channel";
  measured: boolean;
  people?: number;
}
export interface Referrer {
  channel: string;
  utmSource?: string;
  sessions: string;
  share: string;
}
export interface NextStep {
  action: string;
  people: number;
  share: string;
  to?: string;
}
/** What campaign mode knows about a comm beyond what the map holds. */
export interface CampaignInfo {
  objective?: Objective;
  cvp?: string;
  variants?: number;
  variantBasis?: string;
  new2026: boolean;
  /** The email's HTML template was loaded (campaign mode, Marketing sends). */
  template: boolean;
  utm?: "yes" | "no";
  url?: string;
  values: MetricValue[];
  chainsOut: Chain[];
  chainsIn: Chain[];
  referrers: Referrer[];
  nextSteps: NextStep[];
}

const yes = (s?: string) => /^(y|yes|true|1)$/i.test(s ?? "");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const shortDate = (iso: string) => {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}`;
};
export const num = (s: string) => {
  const m = s.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : NaN;
};
const secs = (t: string) => {
  const [m, s] = t.split(":").map(Number);
  return m * 60 + (s || 0);
};
// The map's Year 12 band is months 24–35. The campaign's own start year IS
// its Year 12, whatever today's date is — so a 2026 campaign still lands in
// the band when it's reviewed in 2027.
const BASE_YEAR = Number((CAMPAIGN_ROW?.window_from ?? "").slice(0, 4)) || new Date().getFullYear();
export function dateToMonth(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return (y - BASE_YEAR) * 12 + 24 + (m - 1) + Math.min((d - 1) / 30, 0.97);
}

// ── the campaign ──────────────────────────────────────────────────────────
const c = CAMPAIGN_ROW;
export const CAMPAIGN = {
  id: c.id,
  name: c.name,
  from: c.window_from,
  to: c.window_to,
  coreFrom: c.core_from,
  coreTo: c.core_to,
  stageGate: c.stage_gate,
  momentId: CAMPAIGN_MOMENT,
  gateLabel: shortDate(c.stage_gate),
  gateMonth: dateToMonth(c.stage_gate) + 1 / 30,
  fromMonth: dateToMonth(c.window_from),
  toMonth: dateToMonth(c.window_to) + 1 / 30,
  dates: `${shortDate(c.window_from)} – ${shortDate(c.window_to)}`,
};

// ── touchpoints → the map's Comm shape ────────────────────────────────────
// One Comm per audience variant: the map already stacks same-title comms and
// labels each with its audience, which IS the variant display.
const TEAM: Record<string, Team> = {
  Marketing: "marketing",
  "Recruitment and events": "recruitment",
  Digital: "digital",
};
const TYPE: Record<string, CommType> = { email: "email", sms: "sms", webinar: "webinar", webpage: "webpage" };

const allRows = parseCsvRows(touchpointsRaw).filter((r) => r.campaign === c.id);
const info = new Map<string, CampaignInfo>();
/** Every campaign touchpoint, pages included — what the panels can open. */
export const campaignAllComms: Comm[] = allRows
  .filter((r) => TEAM[r.team] && TYPE[r.type])
  .map((r) => {
    info.set(r.id, {
      objective: r.objective === "awareness" || r.objective === "consideration" || r.objective === "decision" ? r.objective : undefined,
      cvp: r.cvp || undefined,
      variants: Number(r.variants) || undefined,
      variantBasis: r.variant_basis || undefined,
      new2026: yes(r.new_2026),
      template: yes(r.template),
      utm: yes(r.utm) ? "yes" : /^(n|no)$/i.test(r.utm) ? "no" : undefined,
      url: r.url || undefined,
      values: [],
      chainsOut: [],
      chainsIn: [],
      referrers: [],
      nextSteps: [],
    });
    const type = TYPE[r.type];
    return {
      id: r.id,
      team: TEAM[r.team],
      title: r.title,
      cta: r.primary_cta || "",
      secondaryCta: r.secondary_cta || undefined,
      type,
      // Pages aren't sent on a day; the map needs a position, so they sit at
      // the window's start. Their panel says "live all window".
      month: r.date ? dateToMonth(r.date) : CAMPAIGN.fromMonth,
      row: 0,
      // Tied to the moment only when it falls inside it (the 3-day core).
      momentId: r.date && r.date >= c.core_from && r.date <= c.core_to ? CAMPAIGN_MOMENT : undefined,
      platform: type === "email" ? "marketo" : type === "sms" ? "clicksend" : undefined,
      audience: r.audience || undefined,
      campaign: "COP",
      personas: ["domsl"],
    };
  });

// Pages aren't events, so they don't sit on the canvas: the Website lane's
// gutter lists them, and the traffic curve is their time axis.
export const campaignComms: Comm[] = campaignAllComms.filter((c) => c.type !== "webpage");
/** Variants of a send: the comms sharing its team and title (itself first). */
export const variantsOf = (c: Comm): Comm[] => campaignAllComms.filter((x) => x.team === c.team && x.title === c.title);
/** One card per send: the first variant stands for the rest. */
export const campaignCommsCollapsed: Comm[] = campaignComms.filter((c) => variantsOf(c)[0].id === c.id);
export const campaignPages: Comm[] = campaignAllComms.filter((c) => c.type === "webpage");

// Paid media has no card lane on the map — its rows are summarised from the
// campaigns lane. Anything else the map can't place is reported, not dropped.
const paidRows = allRows.filter((r) => r.type === "paid");
for (const r of allRows) {
  if (!(TEAM[r.team] && TYPE[r.type]) && r.type !== "paid")
    console.warn(`[campaign] "${r.title}" (${r.team} · ${r.type}) has no lane on the map and isn't shown.`);
}

// values, chains, referrers, next steps — keyed by comm id
const paidValues = new Map<string, MetricValue[]>();
for (const r of parseCsvRows(valuesRaw)) {
  if (paidRows.some((p) => p.id === r.comm_id)) {
    paidValues.set(r.comm_id, [...(paidValues.get(r.comm_id) ?? []), { metric: r.metric, value: r.value, benchmark: r.benchmark || undefined }]);
    continue;
  }
  const i = info.get(r.comm_id);
  if (!i) continue;
  const cta = r.cta?.toLowerCase();
  i.values.push({ cta: cta === "primary" || cta === "secondary" || cta === "tertiary" ? cta : undefined, metric: r.metric, value: r.value, benchmark: r.benchmark || undefined });
}
export const CHAINS: Chain[] = parseCsvRows(chainsRaw)
  .filter((r) => info.has(r.from) && info.has(r.to))
  .map((r) => ({
    from: r.from,
    to: r.to,
    cta: r.cta === "primary" || r.cta === "secondary" || r.cta === "tertiary" ? r.cta : undefined,
    via: r.via || undefined,
    utm: r.utm ? yes(r.utm) : undefined,
    resolution: r.resolution === "channel" ? "channel" : "send",
    measured: yes(r.measured),
    people: Number(r.people) || undefined,
  }));
for (const ch of CHAINS) {
  info.get(ch.from)!.chainsOut.push(ch);
  info.get(ch.to)!.chainsIn.push(ch);
}
// No connector lines on the map in campaign mode: the hand-off is a column on
// the review page and a list in the panel, not a line.
for (const r of parseCsvRows(referrersRaw)) info.get(r.comm_id)?.referrers.push({ channel: r.channel, utmSource: r.utm_source || undefined, sessions: r.sessions, share: r.share });
for (const r of parseCsvRows(nextStepsRaw)) info.get(r.comm_id)?.nextSteps.push({ action: r.action, people: Number(r.people) || 0, share: r.share, to: r.to || undefined });
for (const i of info.values()) i.nextSteps.sort((a, b) => b.people - a.people);

export const campaignInfo = (id: string): CampaignInfo | undefined => info.get(id);

/** What each file holds right now, in words — the Load data panel's proof. */
export const FILE_CONTENTS: Record<string, string> = {
  "touchpoints.csv": `${allRows.filter((r) => r.kind === "send").length} sends, ${allRows.filter((r) => r.type === "webpage").length} pages, ${allRows.filter((r) => r.type === "paid").length} paid`,
  "chains.csv": `${CHAINS.length} CTA links`,
  "metric-values.csv": `${parseCsvRows(valuesRaw).length} values`,
  "page-referrers.csv": `${parseCsvRows(referrersRaw).length} rows`,
  "page-next-steps.csv": `${parseCsvRows(nextStepsRaw).length} rows`,
  "web-daily-by-page.csv": `${new Set(parseCsvRows(webByPageRaw).map((r) => r.date)).size} days`,
  "studyat-daily.csv": `${new Set(parseCsvRows(studyDailyRaw).map((r) => r.date)).size} days`,
};

/** Paid media in the campaign: what ran, how it did, which page it fed. */
export const campaignPaid = paidRows.map((r) => ({
  id: r.id,
  title: r.title,
  audience: r.audience,
  cta: r.primary_cta,
  values: paidValues.get(r.id) ?? [],
  landsOn: parseCsvRows(chainsRaw).filter((ch) => ch.from === r.id).map((ch) => ({ to: ch.to, people: Number(ch.people) || undefined })),
}));

// ── success measure: the objective picks the metric ───────────────────────
export const OBJECTIVE_LABEL: Record<Objective, string> = { awareness: "Awareness", consideration: "Consideration", decision: "Decision" };
const SUCCESS: Record<"send" | "page" | "event", Record<Objective, { metric: RegExp; cta?: "primary"; label: string }>> = {
  send: {
    awareness: { metric: /^Open rate$/, label: "open rate" },
    consideration: { metric: /^Click-to-open rate$/, label: "click-to-open rate" },
    decision: { metric: /^Link — % of people$/, cta: "primary", label: "click-through" },
  },
  page: {
    awareness: { metric: /^Sessions$/, label: "sessions" },
    consideration: { metric: /^Bounce rate$/, label: "bounce rate" },
    decision: { metric: /^Form submits$/, label: "form submits" },
  },
  event: {
    awareness: { metric: /^Registrations$/, label: "registrations" },
    consideration: { metric: /^Attendance rate$/, label: "attendance rate" },
    decision: { metric: /^Attendance rate$/, label: "attendance rate" },
  },
};
export const kindOf = (type: CommType) => (type === "webpage" ? "page" : type === "webinar" || type === "event" ? "event" : "send");
export function successMetric(comm: Pick<Comm, "type">, i: CampaignInfo): { value: MetricValue; label: string } | undefined {
  if (!i.objective) return undefined;
  const rule = SUCCESS[kindOf(comm.type)][i.objective];
  const value = i.values.find((v) => (rule.cta ? v.cta === rule.cta : !v.cta) && rule.metric.test(v.metric));
  return value ? { value, label: rule.label } : undefined;
}
/** Fallback headline when there's no objective: the first benchmarked rate. */
export function headline(comm: Pick<Comm, "type">, i: CampaignInfo): { value: MetricValue; label: string } | undefined {
  const sm = successMetric(comm, i);
  if (sm) return sm;
  const v = ["Open rate", "Bounce rate", "Attendance rate", "Click-through rate"].map((m) => i.values.find((x) => !x.cta && x.metric === m && x.benchmark)).find(Boolean)
    ?? i.values.find((x) => !x.cta && x.benchmark)
    ?? i.values.find((x) => !x.cta);
  return v ? { value: v, label: v.metric.toLowerCase() } : undefined;
}

/** better / worse / level against the benchmark; "less is better" metrics
 *  (bounce, wait, abandonment, unsubscribe) flip the direction. */
export function compare(v: MetricValue): "better" | "worse" | "level" | null {
  if (!v.benchmark) return null;
  const parse = (s: string) => (s.includes(":") ? secs(s) : num(s));
  const a = parse(v.value), b = parse(v.benchmark);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (a === b) return "level";
  const lessIsBetter = /bounce|abandon|wait|handle|unsubscribe/i.test(v.metric);
  return (a > b) !== lessIsBetter ? "better" : "worse";
}

// ── gaps, ranked by what stops the story first ────────────────────────────
export type GapKind = "chain-broken" | "no-chain" | "no-utm" | "not-measured" | "no-benchmark" | "no-cvp";
export interface Gap { kind: GapKind; label: string; detail: string }
const GAP_ORDER: GapKind[] = ["chain-broken", "no-chain", "no-utm", "not-measured", "no-benchmark", "no-cvp"];
const GAP_LABEL: Record<GapKind, string> = {
  "chain-broken": "Next step not measured",
  "no-chain": "No next step recorded",
  "no-utm": "Can't be traced",
  "not-measured": "Not measured",
  "no-benchmark": "No benchmark",
  "no-cvp": "No value proposition",
};
export function gapsFor(comm: Comm): Gap[] {
  const i = info.get(comm.id);
  if (!i) return [];
  const out: Gap[] = [];
  const add = (kind: GapKind, detail: string) => out.push({ kind, label: GAP_LABEL[kind], detail });
  const broken = i.chainsOut.filter((ch) => !ch.measured && ch.utm !== false);
  if (broken.length) add("chain-broken", `To ${broken.map((ch) => campaignAllComms.find((x) => x.id === ch.to)?.title).join(", ")}.`);
  const isSend = kindOf(comm.type) === "send";
  if (isSend && !i.chainsOut.length) add("no-chain", comm.cta ? `CTA “${comm.cta}” has no destination recorded.` : "No CTA and no destination recorded.");
  const untagged = i.chainsOut.filter((ch) => ch.utm === false);
  if (untagged.length) add("no-utm", `${untagged.map((ch) => `${ch.cta ?? "the"} CTA “${ch.via}”`).join(", ")} ${untagged.length > 1 ? "carry" : "carries"} no UTM.`);
  else if (isSend && !i.chainsOut.length && i.utm === "no") add("no-utm", "Its links carry no UTM.");
  if (!i.values.length) add("not-measured", "No metrics loaded.");
  else if (i.values.some((v) => !v.cta && !v.benchmark && /rate|time|csat/i.test(v.metric))) add("no-benchmark", "Some rates have no benchmark.");
  if (!i.cvp) add("no-cvp", "None recorded.");
  return out.sort((a, b) => GAP_ORDER.indexOf(a.kind) - GAP_ORDER.indexOf(b.kind));
}

// ── the inbound lanes, from the daily proxy files ─────────────────────────
const webByPage = parseCsvRows(webByPageRaw);
const webDaily = [...new Set(webByPage.map((r) => r.date))].sort().map((date) => ({
  date,
  sessions: String(webByPage.filter((r) => r.date === date).reduce((a, r) => a + (Number(r.sessions) || 0), 0)),
}));
const studyDaily = parseCsvRows(studyDailyRaw);
const studyByDay = [...new Set(studyDaily.map((r) => r.date))].sort().map((date) => {
  const rows = studyDaily.filter((r) => r.date === date);
  const phone = rows.find((r) => r.channel === "phone");
  return { date, contacts: rows.reduce((a, r) => a + Number(r.contacts), 0), wait: phone?.wait_time ?? "" };
});
const peakStudy = studyByDay.reduce((a, b) => (b.contacts > a.contacts ? b : a), { date: "", contacts: 0, wait: "" });
const peakWeb = webDaily.reduce((a, b) => (Number(b.sessions) > Number(a.sessions) ? b : a), { date: "", sessions: "0" });
// One colour per page, in traffic order — the hover breakdown's key.
const PAGE_COLOURS = ["--color-cyan", "--color-rmit-blue-interactive", "--color-teal", "--color-purple", "--color-indigo", "--color-pink"];
export const campaignInbound: InboundLaneData[] = [
  {
    id: "digital",
    baseline: 0,
    peaks: peakWeb.date ? [{ month: dateToMonth(peakWeb.date), height: 0, label: `Busiest day ${shortDate(peakWeb.date)} · ${Number(peakWeb.sessions).toLocaleString()} sessions` }] : [],
    seriesNote: VALUES_ARE_PROXY ? "Sessions per day by page (proxy)" : webByPage.length ? "Sessions per day by page" : "No page data loaded",
    channelsLabel: "Sessions by page",
    // One line per page, as the Study@ lane does per channel: the total at
    // rest, the per-page breakdown on hover.
    channels: campaignPages
      .map((p) => ({ p, total: webByPage.filter((r) => r.page_id === p.id).reduce((a, r) => a + Number(r.sessions), 0) }))
      .sort((a, b) => b.total - a.total)
      .map(({ p }, n) => ({
        label: p.title,
        color: PAGE_COLOURS[n % PAGE_COLOURS.length],
        points: webByPage.filter((r) => r.page_id === p.id).map((r) => ({ month: dateToMonth(r.date), value: Number(r.sessions) })),
      })),
  },
  {
    id: "study",
    baseline: 0,
    peaks: peakStudy.date ? [{ month: dateToMonth(peakStudy.date), height: 0, label: `Busiest day ${shortDate(peakStudy.date)} · ${peakStudy.contacts.toLocaleString()} contacts${peakStudy.wait ? ` · phone wait ${peakStudy.wait}` : ""}` }] : [],
    seriesNote: VALUES_ARE_PROXY ? "Contacts per day by channel (proxy)" : studyDaily.length ? "Contacts per day by channel" : "No Study@ data loaded",
    channelsLabel: "Contacts by channel",
    // One line per channel, as the map's own Study@ lane draws them.
    channels: (["phone", "chat", "face-to-face"] as const).map((channel) => ({
      label: channel === "face-to-face" ? "Face to face" : channel === "chat" ? "Chat" : "Phone",
      color: channel === "phone" ? "--color-indigo" : channel === "chat" ? "--color-teal" : "--color-pink",
      points: studyDaily.filter((r) => r.channel === channel).map((r) => ({ month: dateToMonth(r.date), value: Number(r.contacts) })),
    })).filter((ch) => ch.points.length),
  },
];

/** Study@ per channel over the window — shown in the Study@ lane's gutter. */
//  A channel the file doesn't carry (face to face isn't in Genesys) is kept,
//  marked unmeasured, so the panel can say so rather than drop it.
export const studyChannels = (["phone", "chat", "face-to-face"] as const).map((channel) => {
  const rows = studyDaily.filter((r) => r.channel === channel);
  const label = channel === "face-to-face" ? "Face to face" : channel === "chat" ? "Live chat" : "Phone";
  if (!rows.length) return { channel, label, measured: false, contacts: 0, peakWait: "", peakDate: "", baseline: "", overloaded: false };
  const base = rows.filter((r) => r.date < CAMPAIGN.coreFrom && Number(r.contacts) > 40).map((r) => secs(r.wait_time));
  const baseline = base.reduce((a, b) => a + b, 0) / Math.max(base.length, 1);
  const peak = rows.reduce((a, b) => (secs(b.wait_time) > secs(a.wait_time) ? b : a));
  const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
  return {
    channel,
    label,
    measured: true,
    contacts: rows.reduce((a, r) => a + Number(r.contacts), 0),
    peakWait: peak.wait_time,
    peakDate: peak.date,
    baseline: clock(baseline),
    overloaded: secs(peak.wait_time) > baseline * 2,
  };
});

/** The gap between a value and its benchmark, as people say it: "+14 pts"
 *  for rates, "+2:30" for times, "+120" for counts. Positive = above the
 *  benchmark number, whichever way is good; use compare() for the verdict. */
export function delta(v: MetricValue): string | null {
  if (!v.benchmark) return null;
  if (v.value.includes(":") && v.benchmark.includes(":")) {
    const d = secs(v.value) - secs(v.benchmark);
    const sign = d < 0 ? "−" : "+";
    const a = Math.abs(d);
    return `${sign}${Math.floor(a / 60)}:${String(Math.round(a % 60)).padStart(2, "0")}`;
  }
  const a = num(v.value), b = num(v.benchmark);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  const d = a - b;
  const sign = d < 0 ? "−" : "+";
  if (v.value.includes("%")) {
    const r = Math.round(Math.abs(d) * 10) / 10;
    return `${sign}${r} ${r === 1 ? "pt" : "pts"}`;
  }
  return `${sign}${Math.abs(d).toLocaleString()}`;
}
