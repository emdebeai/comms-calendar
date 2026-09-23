// Metric values per touchpoint. DUMMY: data/dummy/metric-values.csv holds
// obviously fake round numbers so the campaign lens can be seen working.
// Real values never enter the repo — a team loads its own export locally
// (same columns) and the map reads that instead. See CLAUDE.md, data rule.
import raw from "../../data/dummy/metric-values.csv?raw";
import { parseCsvRows } from "./csv";

export interface MetricValue {
  /** which link in the send this belongs to; blank = the send as a whole */
  cta?: "primary" | "secondary" | "tertiary";
  metric: string;
  value: string;
  benchmark?: string;
  period?: string;
}

export const VALUES_ARE_DUMMY = true;

const byComm = new Map<string, MetricValue[]>();
for (const r of parseCsvRows(raw)) {
  const id = r.comm_id?.trim();
  if (!id) continue;
  const list = byComm.get(id) ?? [];
  const cta = r.cta?.trim().toLowerCase();
  list.push({
    cta: cta === "primary" || cta === "secondary" || cta === "tertiary" ? cta : undefined,
    metric: r.metric?.trim() ?? "",
    value: r.value?.trim() ?? "",
    benchmark: r.benchmark?.trim() || undefined,
    period: r.period?.trim() || undefined,
  });
  byComm.set(id, list);
}

export const valuesFor = (commId: string): MetricValue[] => byComm.get(commId) ?? [];

/** Above / below / level against the benchmark, for metrics where more is
 *  better. Bounce rate and time-to-anything are "less is better" — flagged
 *  by name so the arrow points the honest way. */
export function compare(v: MetricValue): "above" | "below" | "level" | null {
  if (!v.benchmark) return null;
  const num = (s: string) => {
    const m = s.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
    return m ? Number(m[0]) : NaN;
  };
  const a = num(v.value), b = num(v.benchmark);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (a === b) return "level";
  const lessIsBetter = /bounce|abandon|wait|handle/i.test(v.metric);
  return (a > b) !== lessIsBetter ? "above" : "below";
}

// ── Page referrers (CJA Marketing Channel × UTM source) — DUMMY ──────────
// Where a page's traffic came from, at CHANNEL level: CJA knows "EDM
// Clicked", not which eDM or CTA. Same local-file rule as the values.
import refRaw from "../../data/dummy/page-referrers.csv?raw";

export interface Referrer {
  channel: string;
  utmSource?: string;
  sessions: string;
  share: string;
}
const refsByComm = new Map<string, Referrer[]>();
for (const r of parseCsvRows(refRaw)) {
  const id = r.comm_id?.trim();
  if (!id) continue;
  const list = refsByComm.get(id) ?? [];
  list.push({ channel: r.channel?.trim() ?? "", utmSource: r.utm_source?.trim() || undefined, sessions: r.sessions?.trim() ?? "", share: r.share?.trim() ?? "" });
  refsByComm.set(id, list);
}
export const referrersFor = (commId: string): Referrer[] => refsByComm.get(commId) ?? [];
