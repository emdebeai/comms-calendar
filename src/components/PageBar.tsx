import { Globe } from "lucide-react";
import type { Comm } from "../data/types";
import { rankGaps, type Gap } from "../lib/campaignLens";
import { valuesFor } from "../lib/metricValues";
import { PAGE_ROW_H, commPos, scaleX } from "../lib/scale";
import { FOCUS_RING } from "../lib/styles";
import { COMM_COLORS } from "./icons";

interface Props {
  comm: Comm;
  /** month float the bar runs to — the campaign window's end, or a month on */
  toMonth: number;
  dimmed: boolean;
  active: boolean;
  onHover: (id: string | null) => void;
  onOpenDetail: (id: string) => void;
  gaps?: Gap[];
}

/** A webpage on the map: a full-width bar across the window it's live in,
 *  not a card on a date. Title, headline number, the one gap that matters. */
export function PageBar({ comm, toMonth, dimmed, active, onHover, onOpenDetail, gaps }: Props) {
  const { x, y } = commPos(comm);
  const width = Math.max(scaleX(toMonth) - x, 160);
  const colors = COMM_COLORS.webpage;
  const vals = valuesFor(comm.id);
  const head = vals.find((v) => !v.cta && v.metric === "Traffic rank") ?? vals.find((v) => !v.cta && v.benchmark) ?? vals.find((v) => !v.cta);
  const loud = gaps ? rankGaps(gaps).filter((g) => g.kind === "chain-broken" || g.kind === "no-utm" || g.kind === "not-measured") : [];
  return (
    <button
      type="button"
      aria-label={`${comm.title}, webpage — details and comments`}
      onMouseEnter={() => onHover(comm.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(comm.id)}
      onBlur={() => onHover(null)}
      onClick={(e) => {
        e.stopPropagation();
        onOpenDetail(comm.id);
      }}
      className={`absolute z-10 flex items-center gap-2 rounded-md px-2.5 text-left transition-opacity duration-300 ${colors.chip} ${colors.text} ${
        active ? "ring-1 ring-rmit-blue-interactive" : ""
      } ${dimmed ? "opacity-[0.1] focus-visible:opacity-100" : ""} ${FOCUS_RING}`}
      style={{ left: x, top: y, width, height: PAGE_ROW_H - 8 }}
    >
      <Globe size={13} strokeWidth={2} aria-hidden className="shrink-0" />
      <span className="truncate text-xs font-semibold">{comm.title}</span>
      {head && (
        <span className="shrink-0 text-xs text-grey-80">
          <span className="font-semibold text-grey-90">{head.value}</span> {head.metric.toLowerCase()}
        </span>
      )}
      {loud[0] && (
        <span
          title={loud.map((g) => `${g.label} — ${g.detail}`).join("\n")}
          className="ml-auto shrink-0 rounded bg-tint-amber px-1.5 py-0.5 text-[11px] leading-none text-grey-90"
        >
          {loud[0].label}
          {loud.length > 1 && <span className="text-grey-70"> +{loud.length - 1}</span>}
        </span>
      )}
    </button>
  );
}
