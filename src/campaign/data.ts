// Campaign page data — everything /campaign/ shows, assembled from the
// campaign's own files in data/. Nothing here reads or changes the map's
// comms. All figures are PROXY (data/dummy): obviously fake numbers in the
// real shape, so the view can be judged before any real export exists.
import campaignsRaw from "../../data/campaigns.csv?raw";
import touchpointsRaw from "../../data/campaign-touchpoints.csv?raw";
import chainsRaw from "../../data/chains.csv?raw";
import valuesRaw from "../../data/dummy/metric-values.csv?raw";
import referrersRaw from "../../data/dummy/page-referrers.csv?raw";
import studyDailyRaw from "../../data/dummy/studyat-daily.csv?raw";
import outcomesRaw from "../../data/dummy/studyat-outcomes-weekly.csv?raw";
import nextStepsRaw from "../../data/dummy/page-next-steps.csv?raw";
import { parseCsvRows } from "../lib/csv";
import { linkedCommIds, stageQuestions } from "../data/studentExperience";

export type Kind = "send" | "page" | "conversation";
export type TouchType = "email" | "sms" | "paid" | "webinar" | "webpage" | "call" | "chat" | "inperson";

export interface MetricValue {
  cta?: "primary" | "secondary" | "tertiary";
  metric: string;
  value: string;
  benchmark?: string;
}
export interface Variant {
  id: string;
  audience: string;
  values: MetricValue[];
  utm?: "yes" | "no";
  /** each audience can be asked to believe something different */
  cvp?: string;
}
/** One card on the page. Sends that share a title are ONE touchpoint with
 *  several variants (audience splits), not several touchpoints. */
export interface Touchpoint {
  id: string;
  ids: string[];
  team: string;
  kind: Kind;
  type: TouchType;
  title: string;
  date?: string;
  audience?: string;
  cta?: string;
  secondaryCta?: string;
  cvp?: string;
  variantBasis?: string;
  new2026: boolean;
  utm?: "yes" | "no";
  url?: string;
  mapIds: string[];
  variants: Variant[];
  values: MetricValue[];
  /** daily series for conversations (contacts per day) */
  series?: { date: string; value: number }[];
}
export interface Chain {
  from: string;
  to: string;
  /** which CTA in the send carries this hand-off — one arrow per CTA */
  cta?: "primary" | "secondary" | "tertiary";
  /** does that CTA carry its own UTM (undefined = not applicable / unknown) */
  utm?: boolean;
  via?: string;
  resolution: "send" | "channel";
  measured: boolean;
  people?: number;
}
export type GapKind = "chain-broken" | "no-chain" | "no-utm" | "not-measured" | "no-benchmark" | "no-cvp";
export interface Gap {
  kind: GapKind;
  label: string;
  detail: string;
}

const yes = (s?: string) => /^(y|yes|true|1)$/i.test(s ?? "");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const shortDate = (iso: string) => {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}`;
};
export const dayNumber = (iso: string) => Math.round(Date.parse(`${iso}T00:00:00Z`) / 86400000);
export const num = (s: string) => {
  const m = s.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : NaN;
};
const secs = (t: string) => {
  const [m, s] = t.split(":").map(Number);
  return m * 60 + (s || 0);
};
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

// ── campaign ──────────────────────────────────────────────────────────────
const c = parseCsvRows(campaignsRaw)[0];
export const CAMPAIGN = {
  id: c.id,
  name: c.name,
  from: c.window_from,
  to: c.window_to,
  coreFrom: c.core_from,
  coreTo: c.core_to,
  stageGate: c.stage_gate,
  markers: (c.markers || "").split(";").filter(Boolean).map((m) => {
    const [label, date] = m.split("|");
    return { label, date };
  }),
  outcomeMetric: c.outcome_metric,
};

// ── values ────────────────────────────────────────────────────────────────
const valuesById = new Map<string, MetricValue[]>();
for (const r of parseCsvRows(valuesRaw)) {
  const list = valuesById.get(r.comm_id) ?? [];
  const cta = r.cta?.toLowerCase();
  list.push({
    cta: cta === "primary" || cta === "secondary" || cta === "tertiary" ? cta : undefined,
    metric: r.metric,
    value: r.value,
    benchmark: r.benchmark || undefined,
  });
  valuesById.set(r.comm_id, list);
}

export interface Referrer {
  channel: string;
  utmSource?: string;
  sessions: string;
  share: string;
}
const referrersById = new Map<string, Referrer[]>();
for (const r of parseCsvRows(referrersRaw)) {
  const list = referrersById.get(r.comm_id) ?? [];
  list.push({ channel: r.channel, utmSource: r.utm_source || undefined, sessions: r.sessions, share: r.share });
  referrersById.set(r.comm_id, list);
}
export const referrersFor = (t: Touchpoint) => t.ids.flatMap((id) => referrersById.get(id) ?? []);

// ── Study@ daily → per-channel window figures ─────────────────────────────
const daily = parseCsvRows(studyDailyRaw);
const CHANNEL_OF: Record<string, string> = { "studyat-phone": "phone", "studyat-chat": "chat", "studyat-face-to-face": "face-to-face" };
function studyValues(id: string): { values: MetricValue[]; series: { date: string; value: number }[] } {
  const rows = daily.filter((r) => r.channel === CHANNEL_OF[id]);
  if (!rows.length) return { values: [], series: [] };
  // Baseline = the window before results day: normal load, same export.
  const base = rows.filter((r) => r.date < CAMPAIGN.coreFrom && Number(r.contacts) > 40);
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(xs.length, 1);
  const peak = rows.reduce((a, b) => (secs(b.wait_time) > secs(a.wait_time) ? b : a));
  const core = rows.filter((r) => r.date >= CAMPAIGN.coreFrom);
  const csat = rows.filter((r) => r.csat).map((r) => Number(r.csat));
  const coreCsat = core.filter((r) => r.csat).map((r) => Number(r.csat));
  return {
    series: rows.map((r) => ({ date: r.date, value: Number(r.contacts) })),
    values: [
      { metric: "Contacts", value: String(rows.reduce((a, r) => a + Number(r.contacts), 0)) },
      { metric: `Peak wait (${shortDate(peak.date)})`, value: clock(secs(peak.wait_time)), benchmark: clock(avg(base.map((r) => secs(r.wait_time)))) },
      { metric: "Abandonment, results days", value: `${Math.round(avg(core.map((r) => num(r.abandonment_rate))))}%`, benchmark: `${Math.round(avg(base.map((r) => num(r.abandonment_rate))))}%` },
      { metric: "CSAT, results days", value: coreCsat.length ? avg(coreCsat).toFixed(1) : "", benchmark: csat.length ? avg(base.filter((r) => r.csat).map((r) => Number(r.csat))).toFixed(1) : undefined },
      { metric: "Handle time", value: clock(avg(rows.map((r) => secs(r.handle_time)))) },
    ].filter((v) => v.value),
  };
}

// ── touchpoints (variants folded into one card) ───────────────────────────
const groups = new Map<string, Touchpoint>();
for (const r of parseCsvRows(touchpointsRaw).filter((r) => r.campaign === CAMPAIGN.id)) {
  const key = `${r.team}|${r.kind}|${r.title}`;
  const own = r.team === "Study@RMIT" ? studyValues(r.id) : { values: valuesById.get(r.id) ?? [], series: undefined };
  const utm = yes(r.utm) ? "yes" : /^(n|no)$/i.test(r.utm) ? "no" : undefined;
  const g = groups.get(key);
  if (g) {
    g.ids.push(r.id);
    if (r.map_id) g.mapIds.push(r.map_id);
    g.variants.push({ id: r.id, audience: r.audience, values: own.values, utm, cvp: r.cvp || undefined });
    if (utm === "no") g.utm = "no";
    continue;
  }
  groups.set(key, {
    id: r.id,
    ids: [r.id],
    team: r.team,
    kind: r.kind as Kind,
    type: r.type as TouchType,
    title: r.title,
    date: r.date || undefined,
    audience: r.audience || undefined,
    cta: r.primary_cta || undefined,
    secondaryCta: r.secondary_cta || undefined,
    cvp: r.cvp || undefined,
    variantBasis: r.variant_basis || undefined,
    new2026: yes(r.new_2026),
    utm,
    url: r.url || undefined,
    mapIds: r.map_id ? [r.map_id] : [],
    variants: [{ id: r.id, audience: r.audience, values: own.values, utm, cvp: r.cvp || undefined }],
    values: own.values,
    series: own.series,
  });
}
export const TOUCHPOINTS = [...groups.values()];
const ownerOf = new Map(TOUCHPOINTS.flatMap((t) => t.ids.map((id) => [id, t.id] as const)));
export const byId = new Map(TOUCHPOINTS.map((t) => [t.id, t]));

export const TEAMS = ["Marketing", "Paid media", "Recruitment and events", "Digital", "Study@RMIT"].filter((team) =>
  TOUCHPOINTS.some((t) => t.team === team),
);
export const KINDS: { kind: Kind; label: string }[] = [
  { kind: "send", label: "Sends" },
  { kind: "page", label: "Pages" },
  { kind: "conversation", label: "Events and conversations" },
];

// ── chains ────────────────────────────────────────────────────────────────
// RAW keeps each variant's own hand-offs (the panel shows the chosen
// audience's destinations); CHAINS merges them per card for the arrows.
export const CHAINS_RAW: (Chain & { fromVariant: string })[] = parseCsvRows(chainsRaw)
  .filter((r) => ownerOf.has(r.from) && ownerOf.has(r.to))
  .map((r) => ({
    fromVariant: r.from,
    from: ownerOf.get(r.from)!,
    to: ownerOf.get(r.to)!,
    cta: r.cta === "primary" || r.cta === "secondary" || r.cta === "tertiary" ? r.cta : undefined,
    utm: r.utm ? yes(r.utm) : undefined,
    via: r.via || undefined,
    resolution: r.resolution === "channel" ? "channel" : "send",
    measured: yes(r.measured),
    people: Number(r.people) || undefined,
  }));
const merged = new Map<string, Chain & { n: number; unmeasured: number }>();
for (const r of parseCsvRows(chainsRaw)) {
  const from = ownerOf.get(r.from), to = ownerOf.get(r.to);
  if (!from || !to) continue;
  const cta = r.cta === "primary" || r.cta === "secondary" || r.cta === "tertiary" ? r.cta : undefined;
  const key = `${from}>${to}>${cta ?? ""}`;
  const m = merged.get(key) ?? {
    from, to, cta, via: r.via || undefined, resolution: r.resolution === "channel" ? "channel" as const : "send" as const,
    utm: r.utm ? yes(r.utm) : undefined,
    measured: true, people: 0, n: 0, unmeasured: 0,
  };
  m.n++;
  if (!yes(r.measured)) m.unmeasured++;
  m.people = (m.people ?? 0) + (Number(r.people) || 0);
  m.measured = m.unmeasured === 0;
  merged.set(key, m);
}
export const CHAINS: Chain[] = [...merged.values()].map(({ n: _n, unmeasured: _u, ...ch }) => ({ ...ch, people: ch.people || undefined }));
export const chainsOf = (id: string) => CHAINS.filter((ch) => ch.from === id || ch.to === id);

// ── headline + comparison ─────────────────────────────────────────────────
const HEADLINE = ["Open rate", "Click-through rate", "Traffic rank", "Registrations", "Delivered", "Contacts"];
export const headline = (values: MetricValue[]) =>
  HEADLINE.map((m) => values.find((v) => !v.cta && v.metric === m)).find(Boolean) ?? values.find((v) => !v.cta);

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
export const GAP_ORDER: GapKind[] = ["chain-broken", "no-chain", "no-utm", "not-measured", "no-benchmark", "no-cvp"];
export const GAP_TITLES: Record<GapKind, { title: string; why: string }> = {
  "chain-broken": { title: "Next step not measured", why: "The student moves on and we stop seeing them." },
  "no-chain": { title: "No next step recorded", why: "Nobody has said where this sends the student." },
  "no-utm": { title: "Can't be traced", why: "No UTM on the CTA, so the page can't tell it was this send." },
  "not-measured": { title: "Not measured", why: "No metrics exist, or none are loaded." },
  "no-benchmark": { title: "No benchmark", why: "Numbers with nothing to judge them against." },
  "no-cvp": { title: "No value proposition", why: "What the student is being asked to believe isn't written down." },
};
export function gapsFor(t: Touchpoint): Gap[] {
  const out: Gap[] = [];
  const add = (kind: GapKind, detail: string) => out.push({ kind, label: GAP_TITLES[kind].title, detail });
  const outgoing = CHAINS.filter((ch) => ch.from === t.id);
  const broken = outgoing.filter((ch) => !ch.measured);
  if (broken.length) add("chain-broken", `To ${broken.map((ch) => byId.get(ch.to)?.title).join(", ")}.`);
  if (!outgoing.length && t.kind === "send") add("no-chain", t.cta ? `CTA “${t.cta}” has no destination recorded.` : "No CTA and no destination recorded.");
  const untagged = outgoing.filter((ch) => ch.utm === false);
  if (untagged.length) add("no-utm", `${untagged.map((ch) => `${ch.cta ?? "the"} CTA “${ch.via}”`).join(", ")} ${untagged.length > 1 ? "carry" : "carries"} no UTM.`);
  else if (t.kind === "send" && !outgoing.length && t.utm === "no") add("no-utm", "Its links carry no UTM.");
  const all = t.variants.flatMap((v) => v.values);
  if (!all.length) add("not-measured", "No metrics loaded.");
  else if (all.some((v) => !v.cta && !v.benchmark && /rate|time|csat/i.test(v.metric))) add("no-benchmark", "Some rates have no benchmark.");
  if (!t.cvp && t.team !== "Study@RMIT") add("no-cvp", "None recorded.");
  return out.sort((a, b) => GAP_ORDER.indexOf(a.kind) - GAP_ORDER.indexOf(b.kind));
}
export const GAPS = new Map(TOUCHPOINTS.map((t) => [t.id, gapsFor(t)]));

// ── student questions in the window ───────────────────────────────────────
export const QUESTIONS = ["Wait", "Offer"].flatMap((stage) =>
  stageQuestions(stage).map((question) => {
    const linked = new Set(linkedCommIds(stage, question));
    return { stage, question, answeredBy: TOUCHPOINTS.filter((t) => t.mapIds.some((id) => linked.has(id))) };
  }),
);

export interface NextStep {
  action: string;
  people: number;
  share: string;
  to?: Touchpoint;
}
const nextById = new Map<string, NextStep[]>();
for (const r of parseCsvRows(nextStepsRaw)) {
  const list = nextById.get(r.comm_id) ?? [];
  list.push({ action: r.action, people: Number(r.people) || 0, share: r.share, to: r.to ? byId.get(r.to) : undefined });
  nextById.set(r.comm_id, list);
}
/** Top 3 things people did next on a page, by volume. */
export const nextStepsFor = (t: Touchpoint) =>
  t.ids.flatMap((id) => nextById.get(id) ?? []).sort((a, b) => b.people - a.people).slice(0, 3);

export const OUTCOMES = parseCsvRows(outcomesRaw).map((r) => ({
  week: r.week_of,
  preferenceChanged: Number(r.preference_changed),
  contacts: Number(r.contacts),
}));

/** Total Study@ contacts per day, all channels — the window strip's series. */
export const CONTACTS_BY_DAY = [...new Set(daily.map((r) => r.date))].sort().map((date) => ({
  date,
  value: daily.filter((r) => r.date === date).reduce((a, r) => a + Number(r.contacts), 0),
}));

const measured = TOUCHPOINTS.filter((t) => t.variants.some((v) => v.values.length)).length;
const brokenChains = CHAINS.filter((ch) => !ch.measured).length;
const unanswered = QUESTIONS.filter((q) => !q.answeredBy.length).length;
export const SUMMARY = {
  total: TOUCHPOINTS.length,
  teams: TEAMS.length,
  measured,
  chains: CHAINS.length,
  brokenChains,
  questions: QUESTIONS.length,
  unanswered,
  withCvp: TOUCHPOINTS.filter((t) => t.cvp).length,
  gaps: [...GAPS.values()].reduce((a, g) => a + g.length, 0) + unanswered,
  story: `${TOUCHPOINTS.length} touchpoints across ${TEAMS.length} teams. ${CHAINS.length - brokenChains} of ${CHAINS.length} hand-offs can be followed; ${brokenChains} go dark. ${unanswered} of ${QUESTIONS.length} student questions have no touchpoint.`,
};

