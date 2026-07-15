import { X } from "lucide-react";
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
  type ExpandedMonth,
} from "../lib/scale";
import { FOCUS_RING } from "../lib/styles";

// Fixed week buckets within the abstract 30/31-day month, labelled by date
// range — shown when a month is expanded to week view (level 1). `mid` is the
// day the label centres on; the last bucket is only 3 days, so it centres on
// day 30 (not start+3) to avoid overflowing the month's right edge.
const WEEKS = [
  { start: 1, mid: 4, label: "1–7" },
  { start: 8, mid: 11, label: "8–14" },
  { start: 15, mid: 18, label: "15–21" },
  { start: 22, mid: 25, label: "22–28" },
  { start: 29, mid: 30, label: "29–31" },
];

// Keeps wide band labels (e.g. Consider, Year 11) in view while scrolling.
const stickyLabel = { position: "sticky", left: LABEL_W + 8 } as const;

/** Journey stages + school years — scrolls away normally. */
export function StageYearBands() {
  return (
    <div className="absolute top-0 left-0" style={{ width: TOTAL_W }}>
      <div className="relative bg-header" style={{ height: STAGE_H }}>
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
  expandedMonth: ExpandedMonth | null;
  onToggleMonth: (monthIndex: number) => void;
}

/** Month ticks — stays pinned while scrolling down. Each month is a button
 *  that cycles collapsed → week view → day-by-day → collapsed. Week view
 *  shows date-range ticks; day view shows day-number ticks, both aligned
 *  with the canvas gridlines. */
export function MonthBand({ expandedMonth, onToggleMonth }: MonthBandProps) {
  return (
    <div
      className="absolute top-0 left-0 border-b border-grey-30 bg-card"
      style={{ width: TOTAL_W, height: MONTH_H }}
    >
      {Array.from({ length: MONTHS }, (_, m) => {
        const left = scaleX(m);
        const width = scaleX(m + 1) - left;
        const level = expandedMonth?.month === m ? expandedMonth.level : 0;
        const title =
          level === 0
            ? "Expand to week view"
            : level === 1
              ? "Expand to day-by-day view"
              : "Back to month view";
        return (
          <button
            key={m}
            type="button"
            onClick={() => onToggleMonth(m)}
            aria-pressed={level > 0}
            title={title}
            className={`absolute h-full cursor-pointer text-xs ${FOCUS_RING} ${
              level > 0
                ? "bg-header font-semibold text-white"
                : "text-grey-70 hover:bg-grey-10 hover:text-grey-90"
            }`}
            style={{ left, width }}
          >
            {level > 0 ? (
              <>
                {/* Labels are placed with the SAME scaleX the gridlines and
                    comm dots use — never even (d/30) spacing. An expanded month
                    can straddle a scale segment boundary (e.g. Aug Yr 12 crosses
                    the magnified "crunch" at 31.7), making the day widths
                    non-uniform; positioning off scaleX keeps every number sitting
                    exactly on its own gridline and dot. */}
                {level === 1
                  ? WEEKS.slice(1).map((w) => {
                      // Centre on the week's midpoint, but clamp so a wide label
                      // (e.g. "29–31") near the narrow week-view month's right
                      // edge can't overhang and clip.
                      const HALF = 30;
                      const centre = scaleX(m + (w.mid - 1) / 30) - left;
                      const pos = Math.min(Math.max(centre, HALF), width - HALF);
                      return (
                        <span
                          key={w.start}
                          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 font-normal whitespace-nowrap text-white/75"
                          style={{ left: pos }}
                        >
                          {w.label}
                        </span>
                      );
                    })
                  : /* day view — a number on every day line (day 1 sits under
                       the month-name chip, which paints over it) */
                    Array.from({ length: 30 }, (_, i) => i + 1).map((d) => (
                      <span
                        key={d}
                        className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 font-normal text-white/75"
                        style={{ left: scaleX(m + (d - 1) / 30) - left }}
                      >
                        {d}
                      </span>
                    ))}
                {/* Month name — solid chip pinned left, above the day numbers so
                    it cleanly occludes the day-1 label beneath it. */}
                <span className="absolute top-1/2 left-0 z-10 -translate-y-1/2 bg-header py-0.5 pr-2 pl-2 font-semibold">
                  {monthLabel(m)}
                </span>
                {level === 2 && (
                  <X
                    size={12}
                    strokeWidth={2}
                    aria-hidden
                    className="absolute top-1/2 right-2 -translate-y-1/2 text-white/80"
                  />
                )}
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
// moments (e.g. Change of Preference + Offer Round) never collide.
function momentLines(): Array<{ moment: Moment; line: number }> {
  const estWidth = (moment: Moment) => moment.label.length * 6.8 + 14;
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

/** Moment-that-matters labels — a uniform, quiet treatment: a thin left tick
 *  + label, no pills or icons. Click or hover a moment to highlight every
 *  comm tied to it (active = red). */
export function MomentsBand({ activeMomentId, onHoverMoment, onPinMoment }: MomentsBandProps) {
  return (
    <div
      className="absolute top-0 left-0 border-b border-grey-30 bg-card"
      style={{ width: TOTAL_W, height: MOMENT_H }}
    >
      {momentLines().map(({ moment, line }) => {
        const active = moment.id === activeMomentId;
        return (
          <button
            key={moment.id}
            type="button"
            aria-pressed={active}
            onMouseEnter={() => onHoverMoment(moment.id)}
            onMouseLeave={() => onHoverMoment(null)}
            onClick={(e) => {
              e.stopPropagation();
              onPinMoment(moment.id);
            }}
            className={`absolute border-l-2 pl-1.5 text-xs leading-4 font-semibold whitespace-nowrap transition-colors ${FOCUS_RING} ${
              active
                ? "border-rmit-red text-rmit-red underline decoration-2 underline-offset-2"
                : "border-grey-40 text-grey-90 hover:text-rmit-blue"
            }`}
            style={{ left: scaleX(moment.from), top: 4 + line * 21 }}
          >
            {moment.label}
          </button>
        );
      })}
    </div>
  );
}
