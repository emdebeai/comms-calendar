// Metric values per touchpoint. DUMMY: data/dummy/metric-values.csv holds
// obviously fake round numbers so the campaign lens can be seen working.
// Real values never enter the repo — a team loads its own export locally
// (same columns) and the map reads that instead. See CLAUDE.md, data rule.
import raw from "../../data/dummy/metric-values.csv?raw";
import { parseCsvRows } from "./csv";

export interface MetricValue {
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
  list.push({
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
