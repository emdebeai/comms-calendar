import { Flame, X } from "lucide-react";
import { MOMENTS, STAGES, YEARS } from "../data/journey";
import type { Moment } from "../data/types";
import {
  LABEL_W,
  MOMENT_H,
  MONTHS,
  MONTH_H,
  STAGE_H,
  TOTAL_W,
  YEAR_H,
  monthLabel,
  scaleX,
} from "../lib/scale";

// Keeps wide band labels (e.g. Consider, Year 11) in view while scrolling.
const stickyLabel = { position: "sticky", left: LABEL_W + 8 } as const;

/** Journey stages + school years — scrolls away normally. */
export function StageYearBands() {
  return (
    <div className="absolute top-0 left-0" style={{ width: TOTAL_W }}>
      <div className="relative bg-rmit-blue" style={{ height: STAGE_H }}>
        {STAGES.map((s, i) => (
          <div
            key={s.label}
            className={`absolute flex h-full items-center justify-center text-xs font-semibold tracking-wide text-white ${
              i > 0 ? "border-l border-white/30" : ""
            }`}
            style={{ left: scaleX(s.from), width: scaleX(s.to) - scaleX(s.from) }}
          >
            <span className="truncate px-1" style={stickyLabel}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      <div className="relative border-b border-grey-30 bg-grey-20" style={{ height: YEAR_H }}>
        {YEARS.map((y, i) => (
          <div
            key={y.label}
            className={`absolute flex h-full items-center justify-center text-sm font-semibold text-grey-80 ${
              i > 0 ? "border-l border-grey-40" : ""
            }`}
            style={{ left: scaleX(y.from), width: scaleX(y.to) - scaleX(y.from) }}
          >
            <span style={stickyLabel}>{y.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface MonthBandProps {
  expandedMonth: number | null;
  onToggleMonth: (monthIndex: number) => void;
}

/** Month ticks — stays pinned while scrolling down. Each month is a button:
 *  click to expand it to a day-by-day view (and again to collapse). The
 *  expanded month shows day-number ticks aligned with the canvas
 *  gridlines. */
export function MonthBand({ expandedMonth, onToggleMonth }: MonthBandProps) {
  return (
    <div
      className="absolute top-0 left-0 border-b border-grey-30 bg-white"
      style={{ width: TOTAL_W, height: MONTH_H }}
    >
      {Array.from({ length: MONTHS }, (_, m) => {
        const left = scaleX(m);
        const width = scaleX(m + 1) - left;
        const expanded = m === expandedMonth;
        return (
          <button
            key={m}
            type="button"
            onClick={() => onToggleMonth(m)}
            aria-pressed={expanded}
            title={expanded ? "Back to month view" : "Expand to day view"}
            className={`absolute h-full cursor-pointer text-xs ${
              expanded
                ? "bg-rmit-blue font-semibold text-white"
                : "text-grey-60 hover:bg-grey-10 hover:text-grey-90"
            }`}
            style={{ left, width }}
          >
            {expanded ? (
              <>
                <span className="absolute top-1/2 left-2 -translate-y-1/2 font-semibold">
                  {monthLabel(m)}
                </span>
                {[5, 10, 15, 20, 25, 30].map((d) => (
                  <span
                    key={d}
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 font-normal text-white/75"
                    style={{ left: ((d - 1) / 30) * width }}
                  >
                    {d}
                  </span>
                ))}
                <X
                  size={12}
                  strokeWidth={2}
                  aria-hidden
                  className="absolute top-1/2 right-2 -translate-y-1/2 text-white/80"
                />
              </>
            ) : (
              <span className="flex h-full items-center justify-center">{monthLabel(m)}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// Assign each moment label to one of two mini-lines so close-together
// moments (e.g. Change of Preference + Offer Round) never collide. Major
// badges are wider (icon + padding + bold text), so they reserve more room.
function momentLines(): Array<{ moment: Moment; line: number }> {
  const estWidth = (moment: Moment) =>
    moment.tier === "major" ? moment.label.length * 7.2 + 40 : moment.label.length * 6.8 + 14;
  const lineEnds = [-Infinity, -Infinity];
  return [...MOMENTS]
    .sort((a, b) => a.from - b.from)
    .map((moment) => {
      const x = scaleX(moment.from);
      const line = x >= lineEnds[0] + 12 ? 0 : 1;
      lineEnds[line] = x + estWidth(moment);
      return { moment, line };
    });
}

interface MomentsBandProps {
  activeMomentId: string | null;
  onHoverMoment: (id: string | null) => void;
  onPinMoment: (id: string) => void;
}

/** Moment-that-matters labels. Major moments (flagship events like Open
 *  Day) get a solid filled badge; standard ones get a plain flag tick.
 *  Click or hover a moment to highlight every comm tied to it. */
export function MomentsBand({ activeMomentId, onHoverMoment, onPinMoment }: MomentsBandProps) {
  return (
    <div
      className="absolute top-0 left-0 border-b border-grey-30 bg-white"
      style={{ width: TOTAL_W, height: MOMENT_H }}
    >
      {momentLines().map(({ moment, line }) => {
        const major = moment.tier === "major";
        const active = moment.id === activeMomentId;
        return (
          <button
            key={moment.id}
            type="button"
            onMouseEnter={() => onHoverMoment(moment.id)}
            onMouseLeave={() => onHoverMoment(null)}
            onClick={(e) => {
              e.stopPropagation();
              onPinMoment(moment.id);
            }}
            className={
              major
                ? `absolute flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold whitespace-nowrap transition-colors ${
                    active
                      ? "bg-rmit-red text-white"
                      : "bg-rmit-blue text-white hover:bg-rmit-blue/85"
                  }`
                : `absolute border-l-2 pl-1.5 text-xs leading-4 font-semibold whitespace-nowrap transition-colors ${
                    active ? "border-rmit-red text-rmit-red" : "border-rmit-blue text-rmit-blue"
                  }`
            }
            style={{ left: scaleX(moment.from), top: major ? 2 + line * 21 : 4 + line * 21 }}
          >
            {major && <Flame size={11} strokeWidth={2} aria-hidden />}
            {moment.label}
          </button>
        );
      })}
    </div>
  );
}
