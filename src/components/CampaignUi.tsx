import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { Comm } from "../data/types";
import { compare, type MetricValue } from "../lib/campaign";
import { FOCUS_RING } from "../lib/styles";
import { COMM_COLORS, COMM_ICONS } from "./icons";

// Small pieces every campaign view shares: number formatting, the
// value-vs-benchmark mark, and the tracked-page badge.

export const fmt = (s: string) => (/^\d+$/.test(s) ? Number(s).toLocaleString() : s);
export const verdictText = (c: ReturnType<typeof compare>) => (c === "better" ? "text-success" : c === "worse" ? "text-danger" : "text-grey-90");

export function Versus({ v }: { v: MetricValue }) {
  const cmp = compare(v);
  if (!v.benchmark) return <span className="text-xs text-grey-60 italic">no benchmark</span>;
  const Arrow = cmp === "better" ? ArrowUpRight : cmp === "worse" ? ArrowDownRight : Minus;
  const tone = cmp === "better" ? "text-success" : cmp === "worse" ? "text-danger" : "text-grey-60";
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs ${tone}`}>
      <Arrow size={12} strokeWidth={2} aria-hidden />
      <span className="sr-only">{cmp === "better" ? "better than" : cmp === "worse" ? "worse than" : "level with"} benchmark</span>
      {v.benchmark}
    </span>
  );
}

/** A tracked webpage as a small badge — the Digital lane's globe and tint,
 *  so a destination reads as "one of the pages on the map". */
export function PageBadge({ c, onOpen }: { c: Comm; onOpen?: (id: string) => void }) {
  const Icon = COMM_ICONS.webpage;
  const colors = COMM_COLORS.webpage;
  // Without a handler it's a label, not a control — it may sit inside a
  // row that is itself a button (the pages panel).
  if (!onOpen)
    return (
      <span className={`inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${colors.chip} ${colors.text}`}>
        <Icon size={11} strokeWidth={2} aria-hidden />
        <span className="truncate">{c.title}</span>
      </span>
    );
  return (
    <button
      type="button"
      onClick={() => onOpen(c.id)}
      className={`inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${colors.chip} ${colors.text} hover:ring-1 hover:ring-cyan/40 ${FOCUS_RING}`}
    >
      <Icon size={11} strokeWidth={2} aria-hidden />
      <span className="truncate">{c.title}</span>
    </button>
  );
}
