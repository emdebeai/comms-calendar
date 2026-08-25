import { useEffect, useRef, useState } from "react";
import { ChevronUp, GraduationCap, Info } from "lucide-react";
import { SegmentToggles } from "./SegmentToggles";
import {
  EQUITY_FULL_NAMES,
  UNAVAILABLE_EQUITY,
  segmentCount,
  type SegmentAxis,
  type SegmentSelection,
} from "../lib/segments";
import { FOCUS_RING } from "../lib/styles";
import { HoverTip } from "./HoverTip";

interface Props {
  /** reopen the persona introduction modal */
  onAboutPersona: () => void;
  axes: { axis: SegmentAxis; values: string[] }[];
  selection: SegmentSelection;
  /** comms explicitly tagged per axis value — passed through to the toggles */
  counts: Record<string, Record<string, number>>;
  onSelect: (key: SegmentAxis["key"], value: string | null) => void;
  onClearAll: () => void;
  /** equity cohorts present in the data (e.g. SNAP) */
  equityCohorts: string[];
  /** comms tailored to each cohort */
  equityCounts: Record<string, number>;
  equity: string | null;
  onSelectEquity: (cohort: string | null) => void;
}

/** Second floating dock — bottom-left, matching the control dock's frosted
 *  pill. Names the persona (DOM SL) and opens the segment toggles as a popover
 *  above it, so the map can be filtered by tailoring axis without the toggles
 *  taking up header space. */
export function PersonaDock({
  onAboutPersona,
  axes,
  selection,
  counts,
  onSelect,
  onClearAll,
  equityCohorts,
  equityCounts,
  equity,
  onSelectEquity,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const count = segmentCount(selection);

  // Close on outside click / Escape — same behaviour as the control dock's
  // legend popover.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (axes.length === 0 && equityCohorts.length === 0) return null;

  return (
    <div role="region" aria-label="Persona and segment filters" className="fixed bottom-5 right-5 z-40" ref={ref}>
      <div className="relative flex items-center gap-2 rounded-full border border-grey-30 bg-card/70 px-2.5 py-1.5 shadow-xl backdrop-blur-md">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label="Domestic school leaver — segment filters"
          className={`group relative flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold uppercase tracking-widest transition-colors ${FOCUS_RING} ${
            open || count > 0
              ? "bg-rmit-blue text-on-accent"
              : "bg-tint-blue text-rmit-blue hover:bg-tint-blue/70"
          }`}
        >
          <GraduationCap size={14} strokeWidth={2} aria-hidden />
          DOM SL
          {count > 0 && (
            <span className="rounded-full bg-white/25 px-1 text-xs">{count}</span>
          )}
          <ChevronUp
            size={13}
            strokeWidth={2.5}
            className={`transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden
          />
          {!open && <HoverTip label="Filter the map by how sends are tailored" />}
        </button>
        <button
          type="button"
          onClick={onAboutPersona}
          aria-label="About this persona"
          className={`group relative flex h-8 w-8 items-center justify-center rounded-full text-grey-70 hover:bg-grey-20 ${FOCUS_RING}`}
        >
          <Info size={14} strokeWidth={2} aria-hidden />
          <HoverTip label="About this persona" />
        </button>

        {equityCohorts.length > 0 && (
          <>
            <span className="mx-1 h-5 w-px bg-grey-30" aria-hidden />
            {equityCohorts.map((c) => {
              const on = equity === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => onSelectEquity(on ? null : c)}
                  aria-pressed={on}
                  className={`group relative flex h-8 items-center rounded-full px-3 text-xs font-semibold uppercase tracking-widest transition-colors ${FOCUS_RING} ${
                    on
                      ? "bg-rmit-blue text-on-accent"
                      : "bg-tint-blue text-rmit-blue hover:bg-tint-blue/70"
                  }`}
                >
                  {c}
                  {equityCounts[c] !== undefined && (
                    <span className={`ml-1 ${on ? "text-on-accent/70" : "text-rmit-blue/60"}`}>
                      {equityCounts[c]}
                    </span>
                  )}
                  <HoverTip align="right" label={`${EQUITY_FULL_NAMES[c] ?? c}: only comms tailored to this cohort`} />
                </button>
              );
            })}
            {/* Cohorts that exist but have no mapped comms yet — shown greyed
                so the dimension is visible, selectable once data lands. */}
            {UNAVAILABLE_EQUITY.filter((u) => !equityCohorts.includes(u.value)).map((u) => (
              <button
                key={u.value}
                type="button"
                disabled
                aria-label={`${u.label} — ${u.reason}`}
                className="group relative flex h-8 cursor-not-allowed items-center rounded-full border border-dashed border-grey-30 px-3 text-xs font-semibold text-grey-60"
              >
                {u.label}
                <HoverTip align="right" label={u.reason} />
              </button>
            ))}
          </>
        )}

        {open && (
          <div
            role="dialog"
            aria-label="Segment filters"
            className="animate-pop-in absolute bottom-full right-0 mb-3 w-max max-w-[min(42rem,90vw)]"
          >
            <SegmentToggles
              axes={axes}
              selection={selection}
              counts={counts}
              onSelect={onSelect}
              onClearAll={onClearAll}
            />
          </div>
        )}
      </div>
    </div>
  );
}
