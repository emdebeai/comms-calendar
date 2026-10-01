// Campaign mode — the persona map, scoped to one campaign's window, with the
// campaign's own data layered on. Entered with ?campaign=<id>. Everything
// here is read only when that flag is set; the normal map never touches it.
//
// Sources (all in data/, see data/README.md): campaigns.csv (the window),
// campaign-touchpoints.csv (the touchpoints, one row per audience variant),
// chains.csv (one row per CTA), and the PROXY figures in data/dummy/.
import campaignsRaw from "../../data/campaigns.csv?raw";
import touchpointsRaw from "../../data/campaign-touchpoints.csv?raw";
import chainsRaw from "../../data/chains.csv?raw";
import valuesRaw from "../../data/dummy/metric-values.csv?raw";
import referrersRaw from "../../data/dummy/page-referrers.csv?raw";
import nextStepsRaw from "../../data/dummy/page-next-steps.csv?raw";
import studyDailyRaw from "../../data/dummy/studyat-daily.csv?raw";
import webDailyRaw from "../../data/dummy/web-daily.csv?raw";
import { parseCsvRows } from "./csv";
import type { Comm, CommType, InboundLaneData, Team } from "../data/types";

import { CAMPAIGN_ID, CAMPAIGN_MODE } from "./campaignFlag";
export { CAMPAIGN_ID, CAMPAIGN_MODE };
export const VALUES_ARE_PROXY = true;

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
// Year 12 is the current calendar year on the map (see journey.ts YEARS):
// month float = 24 + months since January of this year, day as a fraction.
const THIS_YEAR = new Date().getFullYear();
export function dateToMonth(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return (y - THIS_YEAR) * 12 + 24 + (m - 1) + Math.min((d - 1) / 30, 0.97);
}

// ── the campaign ──────────────────────────────────────────────────────────
const c = parseCsvRows(campaignsRaw).find((r) => r.id === CAMPAIGN_ID) ?? parseCsvRows(campaignsRaw)[0];
export const CAMPAIGN = {
  id: c.id,
  name: c.name,
  from: c.window_from,
  to: c.window_to,
  coreFrom: c.core_from,
  coreTo: c.core_to,
  stageGate: c.stage_gate,
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

const info = new Map<string, CampaignInfo>();
/** Every campaign touchpoint, pages included — what the panels can open. */
export const campaignAllComms: Comm[] = parseCsvRows(touchpointsRaw)
  .filter((r) => r.campaign === CAMPAIGN.id && TEAM[r.team] && TYPE[r.type])
  .map((r) => {
    info.set(r.id, {
      objective: r.objective === "awareness" || r.objective === "consideration" || r.objective === "decision" ? r.objective : undefined,
      cvp: r.cvp || undefined,
      variants: Number(r.variants) || undefined,
      variantBasis: r.variant_basis || undefined,
      new2026: yes(r.new_2026),
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
      momentId: "cop",
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

// values, chains, referrers, next steps — keyed by comm id
for (const r of parseCsvRows(valuesRaw)) {
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

// ── success measure: the objective picks the metric ───────────────────────
export const OBJECTIVE_LABEL: Record<Objective, string> = { awareness: "Awareness", consideration: "Consideration", decision: "Decision" };
const SUCCESS: Record<"send" | "page" | "event", Record<Objective, { metric: RegExp; cta?: "primary"; label: string }>> = {
  send: {
    awareness: { metric: /^Open rate$/, label: "open rate" },
    consideration: { metric: /^Click-to-open rate$/, label: "click-to-open rate" },
    decision: { metric: /^Link — % of people$/, cta: "primary", label: "clicked through to the destination" },
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
const kindOf = (type: CommType) => (type === "webpage" ? "page" : type === "webinar" || type === "event" ? "event" : "send");
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
export const GAP_ORDER: GapKind[] = ["chain-broken", "no-chain", "no-utm", "not-measured", "no-benchmark", "no-cvp"];
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
const webDaily = parseCsvRows(webDailyRaw);
const studyDaily = parseCsvRows(studyDailyRaw);
const studyByDay = [...new Set(studyDaily.map((r) => r.date))].sort().map((date) => {
  const rows = studyDaily.filter((r) => r.date === date);
  const phone = rows.find((r) => r.channel === "phone");
  return { date, contacts: rows.reduce((a, r) => a + Number(r.contacts), 0), wait: phone?.wait_time ?? "" };
});
const peakStudy = studyByDay.reduce((a, b) => (b.contacts > a.contacts ? b : a));
const peakWeb = webDaily.reduce((a, b) => (Number(b.sessions) > Number(a.sessions) ? b : a));
export const campaignInbound: InboundLaneData[] = [
  {
    id: "digital",
    baseline: 0,
    peaks: [{ month: dateToMonth(peakWeb.date), height: 0, label: `Results day · ${Number(peakWeb.sessions).toLocaleString()} sessions` }],
    series: webDaily.map((r) => ({ month: dateToMonth(r.date), value: Number(r.sessions) })),
    seriesNote: "Sessions per day across the campaign's pages (proxy)",
  },
  {
    id: "study",
    baseline: 0,
    peaks: [{ month: dateToMonth(peakStudy.date), height: 0, label: `Results day · ${peakStudy.contacts.toLocaleString()} contacts · phone wait ${peakStudy.wait}` }],
    seriesNote: "Contacts per day by channel (proxy)",
    // One line per channel, as the map's own Study@ lane draws them.
    channels: (["phone", "chat", "face-to-face"] as const).map((channel) => ({
      label: channel === "face-to-face" ? "Face to face" : channel === "chat" ? "Chat" : "Phone",
      color: channel === "phone" ? "--color-indigo" : channel === "chat" ? "--color-teal" : "--color-pink",
      points: studyDaily.filter((r) => r.channel === channel).map((r) => ({ month: dateToMonth(r.date), value: Number(r.contacts) })),
    })),
  },
];

/** Study@ per channel over the window — shown in the Study@ lane's gutter. */
export const studyChannels = (["phone", "chat", "face-to-face"] as const).map((channel) => {
  const rows = studyDaily.filter((r) => r.channel === channel);
  const base = rows.filter((r) => r.date < CAMPAIGN.coreFrom && Number(r.contacts) > 40).map((r) => secs(r.wait_time));
  const baseline = base.reduce((a, b) => a + b, 0) / Math.max(base.length, 1);
  const peak = rows.reduce((a, b) => (secs(b.wait_time) > secs(a.wait_time) ? b : a));
  const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
  return {
    channel,
    label: channel === "face-to-face" ? "Face to face" : channel === "chat" ? "Live chat" : "Phone",
    contacts: rows.reduce((a, r) => a + Number(r.contacts), 0),
    peakWait: peak.wait_time,
    peakDate: peak.date,
    baseline: clock(baseline),
    overloaded: secs(peak.wait_time) > baseline * 2,
  };
});

/** The daily pulse the review page charts: sessions and contacts per day. */
export const WEB_BY_DAY = webDaily.map((r) => ({ date: r.date, value: Number(r.sessions) || 0 }));
export const STUDY_BY_DAY = studyByDay.map((d) => ({ date: d.date, value: d.contacts, wait: d.wait }));
export const dayNumber = (iso: string) => Math.round(Date.parse(`${iso}T00:00:00Z`) / 86400000);
