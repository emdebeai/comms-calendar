import { useEffect, useRef, useState } from "react";
import { ChevronUp, GraduationCap } from "lucide-react";
import { SegmentToggles } from "./SegmentToggles";
import { segmentCount, type SegmentAxis, type SegmentSelection } from "../lib/segments";
import { FOCUS_RING } from "../lib/styles";

interface Props {
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
    <div className="fixed bottom-5 right-5 z-40" ref={ref}>
      <div className="relative flex items-center gap-1 rounded-full border border-grey-30 bg-card/70 px-2 py-1.5 shadow-xl backdrop-blur-md">
        <span className="pl-1.5 text-xs text-grey-70">Student type</span>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label="Domestic school leaver — segment filters"
          title="Filter the map by how sends are tailored"
          className={`flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold uppercase tracking-wide transition-colors ${FOCUS_RING} ${
            open || count > 0
              ? "bg-rmit-blue text-white"
              : "bg-tint-blue text-rmit-blue hover:bg-tint-blue/70"
          }`}
        >
          <GraduationCap size={14} strokeWidth={2} aria-hidden />
          DOM SL
          {count > 0 && (
            <span className="rounded-full bg-white/25 px-1 text-[10px]">{count}</span>
          )}
          <ChevronUp
            size={13}
            strokeWidth={2.5}
            className={`transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>

        {equityCohorts.length > 0 && (
          <>
            <span className="mx-1 h-5 w-px bg-grey-30" aria-hidden />
            <span className="text-xs text-grey-70">Equity</span>
            {equityCohorts.map((c) => {
              const on = equity === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => onSelectEquity(on ? null : c)}
                  aria-pressed={on}
                  title={`Show only comms tailored to the ${c} cohort`}
                  className={`flex h-8 items-center rounded-full px-3 text-xs font-semibold uppercase tracking-wide transition-colors ${FOCUS_RING} ${
                    on
                      ? "bg-rmit-blue text-white"
                      : "bg-tint-blue text-rmit-blue hover:bg-tint-blue/70"
                  }`}
                >
                  {c}
                  {equityCounts[c] !== undefined && (
                    <span className={`ml-1 ${on ? "text-white/60" : "text-rmit-blue/60"}`}>
                      {equityCounts[c]}
                    </span>
                  )}
                </button>
              );
            })}
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
