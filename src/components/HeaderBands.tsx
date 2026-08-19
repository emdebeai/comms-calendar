import { Info } from "lucide-react";
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
  type ExpandedMonths,
} from "../lib/scale";
import { FOCUS_RING } from "../lib/styles";

// Fixed week buckets within the abstract 30/31-day month, labelled by date
// range — shown when a month is expanded to week view (level 1). `mid` is the
// day the label centres on; the last bucket is only 3 days, so it centres on
// day 30 (not start+3) to avoid overflowing the month's right edge.
// The abstract 30/31-day month divides into an awkward 5th 2–3-day stub if you
// use true calendar weeks, which bunches the labels. Instead: three even
// buckets (7, 7, then the ~10-day remainder as "22–31"), so the markers read
// evenly while staying on the real day-scale. Gridlines match (days 8, 15, 22).
const WEEKS = [
  { start: 1, mid: 4, label: "1–7" },
  { start: 8, mid: 11, label: "8–14" },
  { start: 15, mid: 18, label: "15–21" },
  { start: 22, mid: 26, label: "22–31" },
];

// Keeps wide band labels (e.g. Consider, Year 11) in view while scrolling.
const stickyLabel = { position: "sticky", left: LABEL_W + 8 } as const;

// Which year band / journey stage a month sits in — the tiny context line the
// sticky month row carries, so "where am I?" survives any scroll depth (the
// stage and year bands themselves scroll away). Short forms keep it inside a
// collapsed month's width ("Year 12 · 2026" → "Yr 12").
function monthYearShort(m: number): string {
  const y = YEARS.find((y) => m >= y.from && m < y.to);
  return y ? y.label.split(" · ")[0].replace("Year ", "Yr ") : "";
}
function monthStage(m: number): string {
  const mid = m + 0.5; // stage owning most of the month
  return STAGES.find((s) => mid >= s.from && mid < s.to)?.label ?? "";
}

interface StageBandProps {
  onOpenStage: (stageLabel: string) => void;
  /** click a stage name to scroll the map to that stage's start */
  onJumpStage: (from: number) => void;
  /** comms falling inside each stage's span — quantifies coverage per stage */
  stageCounts: Record<string, number>;
}

/** Journey stages — the CX lens across the top. The stage name is a jump
 *  link (scrolls the map to the stage); the ⓘ opens its full
 *  student-experience deep-dive (voice, needs, decisions, actions); the
 *  Student Journey lane just below shows the questions inline.
 *  Scrolls away normally. */
export function StageBand({ onOpenStage, onJumpStage, stageCounts }: StageBandProps) {
  return (
    <div className="absolute top-0 left-0" style={{ width: TOTAL_W }}>
      <div className="relative bg-header" style={{ height: STAGE_H }}>
        {STAGES.map((s, i) => (
          <div
            key={s.label}
            className={`absolute flex h-full items-center justify-center ${
              i > 0 ? "border-l border-white/30" : ""
            }`}
            style={{ left: scaleX(s.from), width: scaleX(s.to) - scaleX(s.from) }}
          >
            <span className="flex items-center gap-1 px-1" style={stickyLabel}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onJumpStage(s.from);
                }}
                title={`Jump to ${s.label}`}
                className={`cursor-pointer truncate rounded-sm text-xs font-semibold tracking-wide text-white underline-offset-2 hover:underline ${FOCUS_RING}`}
              >
                {s.label}
                {stageCounts[s.label] !== undefined && (
                  <span className="ml-1 font-normal text-white/60">
                    {stageCounts[s.label]}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenStage(s.label);
                }}
                aria-haspopup="dialog"
                aria-label={`${s.label} — full student experience (voice, needs, decisions, actions)`}
                title="Full student experience for this stage"
                className={`shrink-0 rounded-full p-0.5 text-white/70 hover:bg-white/20 hover:text-white ${FOCUS_RING}`}
              >
                <Info size={12} strokeWidth={2} aria-hidden />
              </button>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** School years — the parallel audience bands. Scrolls away with the stages. */
export function YearBand() {
  return (
    <div className="absolute top-0 left-0" style={{ width: TOTAL_W }}>
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
  expandedMonths: ExpandedMonths;
  onSetLevel: (monthIndex: number, level: 0 | 1 | 2) => void;
}

/** Month ticks — stays pinned while scrolling down. A collapsed month is a
 *  button that opens week view; an expanded month is a soft-outlined strip
 *  that cycles week → day → collapsed on click (current mode in the title/
 *  aria-label). */
export function MonthBand({ expandedMonths, onSetLevel }: MonthBandProps) {
  // Context runs — one label per contiguous stretch sharing a year band and
  // stage ("Yr 12 · Consider" once across Jan–Aug, not stamped under every
  // month). The label is sticky within its span, so it follows the scroll
  // like the stage-band labels do. Expanded months break the run — their
  // pinned name chip carries its own context.
  const runs: { start: number; end: number; label: string }[] = [];
  for (let m = 0; m < MONTHS; m++) {
    if (expandedMonths.has(m)) continue;
    const label = `${monthYearShort(m)} · ${monthStage(m)}`;
    const prev = runs[runs.length - 1];
    if (prev && prev.end === m && prev.label === label) prev.end = m + 1;
    else runs.push({ start: m, end: m + 1, label });
  }
  return (
    <div
      className="absolute top-0 left-0 border-b border-grey-30 bg-card"
      style={{ width: TOTAL_W, height: MONTH_H }}
    >
      {/* Year/stage context runs — one sticky label per span, drawn BENEATH
          the month buttons so an expanded month's opaque bar occludes it (a
          run's sticky label can clamp left at its boundary and would otherwise
          bleed grey text over the dark expanded bar). Collapsed month buttons
          are transparent, so the label still shows under them. */}
      {runs.map((r) => {
        // A run touching an expanded month would pin its sticky label into the
        // sliver beside that month's dark bar, doubling its context chip — drop
        // the label there (keep the thin boundary tick). The expanded month
        // shows its own "Dec · Yr 11 · Consider" chip anyway.
        const nextToExpanded = expandedMonths.has(r.end) || expandedMonths.has(r.start - 1);
        return (
          <div
            key={r.start}
            aria-hidden
            className="pointer-events-none absolute bottom-0 flex h-[15px] items-start justify-center border-l border-grey-20"
            style={{ left: scaleX(r.start), width: scaleX(r.end) - scaleX(r.start) }}
          >
            {!nextToExpanded && (
              <span
                className="px-1 text-xs leading-none whitespace-nowrap text-grey-60"
                style={stickyLabel}
              >
                {r.label}
              </span>
            )}
          </div>
        );
      })}
      {Array.from({ length: MONTHS }, (_, m) => {
        const left = scaleX(m);
        const width = scaleX(m + 1) - left;
        const level = expandedMonths.get(m) ?? 0;
        if (level > 0) {
          return (
            <button
              key={m}
              type="button"
              onClick={() => onSetLevel(m, level === 1 ? 2 : 0)}
              title={level === 1 ? "Expand to day-by-day view" : "Back to month view"}
              aria-label={`${monthLabel(m)} — ${level === 1 ? "week view; click for day view" : "day view; click to collapse"}`}
              className={`absolute inset-y-[3px] cursor-pointer overflow-hidden rounded-md border border-grey-40 bg-card text-xs shadow-sm hover:border-rmit-blue-interactive/60 ${FOCUS_RING}`}
              style={{ left, width }}
            >
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
                          className="absolute top-[5px] -translate-x-1/2 font-normal whitespace-nowrap text-grey-60"
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
                        className="absolute top-[5px] -translate-x-1/2 font-normal text-grey-60"
                        style={{ left: scaleX(m + (d - 1) / 30) - left }}
                      >
                        {d}
                      </span>
                    ))}
                {/* Month name — solid chip carrying the year/stage context (an
                    expanded month replaces its collapsed cell, so it labels
                    itself). Sticky to the gutter edge: it rides the month's left
                    edge while the month is in view, but pins just past the
                    gutter once you scroll into the month — so it can never slide
                    over the gutter/Reset-zoom control. */}
                <span className="pointer-events-none absolute inset-y-0 left-0 right-0 z-10 flex items-start pt-px">
                  <span
                    className="rounded-r-md bg-card py-0.5 pr-2 pl-2 font-semibold whitespace-nowrap text-grey-90"
                    style={stickyLabel}
                  >
                    {monthLabel(m)}
                    <span className="ml-1.5 font-normal text-grey-60">
                      {monthYearShort(m)} · {monthStage(m)}
                    </span>
                  </span>
                </span>
              </>
            </button>
          );
        }
        return (
          <button
            key={m}
            type="button"
            onClick={() => onSetLevel(m, 1)}
            title="Expand to week view"
            className={`absolute h-full cursor-pointer text-xs text-grey-70 hover:bg-grey-10 hover:text-grey-90 ${FOCUS_RING}`}
            style={{ left, width }}
          >
            {/* Collapsed cell — month name up top; the year/stage context
                line below comes from the run layer, one label per span. */}
            <span className="flex h-full items-start justify-center pt-1">
              {monthLabel(m)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// Assign each moment label to one of three mini-lines so close-together
// moments (the December crunch packs three into ~1.5 months) never collide.
// The tick ALWAYS sits on the moment's true date; each label takes the line
// where its text drifts least from the tick (usually not at all — three
// lines give plenty of room), bridged by a dotted leader if it must slide.
function momentLines(): Array<{ moment: Moment; line: number; x: number; nudge: number }> {
  const estWidth = (moment: Moment) => moment.label.length * 6.8 + 14;
  const lineEnds = [-Infinity, -Infinity, -Infinity];
  return [...MOMENTS]
    .sort((a, b) => a.from - b.from)
    .map((moment) => {
      const x = scaleX(moment.from);
      // Least-drift line wins (ties → higher line). Cap how far text may
      // drift from its tick; beyond that, overlap on the emptiest line.
      const maxNudge = 80;
      let best = -1;
      let bestNudge = Infinity;
      for (let line = 0; line < lineEnds.length; line++) {
        const nudge = Math.max(0, lineEnds[line] + 12 - x);
        if (nudge < bestNudge) {
          best = line;
          bestNudge = nudge;
        }
      }
      if (bestNudge <= maxNudge) {
        lineEnds[best] = x + bestNudge + estWidth(moment);
        return { moment, line: best, x, nudge: bestNudge };
      }
      const line = lineEnds.indexOf(Math.min(...lineEnds));
      lineEnds[line] = x + estWidth(moment);
      return { moment, line, x, nudge: 0 };
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
      {momentLines().map(({ moment, line, x, nudge }) => {
        const active = moment.id === activeMomentId;
        return (
          <button
            key={moment.id}
            type="button"
            aria-pressed={active}
            onMouseEnter={() => onHoverMoment(moment.id)}
            onMouseLeave={() => onHoverMoment(null)}
            onFocus={() => onHoverMoment(moment.id)}
            onBlur={() => onHoverMoment(null)}
            onClick={(e) => {
              e.stopPropagation();
              onPinMoment(moment.id);
            }}
            className={`absolute border-l-2 pl-1.5 text-xs leading-4 font-semibold whitespace-nowrap transition-colors ${FOCUS_RING} ${
              active
                ? "border-rmit-red text-rmit-red underline decoration-2 underline-offset-2"
                : "border-grey-40 text-grey-90 hover:text-rmit-blue"
            }`}
            style={{ left: x, top: 4 + line * 21, zIndex: active ? 20 : undefined }}
          >
            {/* the tick (left border) marks the TRUE date; a slid label gets
                a dotted leader back to it */}
            {nudge > 10 && (
              <span
                aria-hidden
                className="absolute top-1/2 left-0 border-t border-dashed border-grey-40"
                style={{ width: nudge }}
              />
            )}
            <span style={nudge ? { marginLeft: nudge } : undefined}>{moment.label}</span>
            {/* instant date tooltip — only moments with CONFIRMED dates carry
                one (fabricating a date would be worse than no tooltip) */}
            {active && moment.dates && (
              <span
                aria-hidden
                className="absolute top-full z-30 mt-1 rounded-md bg-tooltip px-2 py-1 text-xs font-normal whitespace-nowrap text-white no-underline shadow-md"
                style={{ left: nudge }}
              >
                {moment.dates}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
