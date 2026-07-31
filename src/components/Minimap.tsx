import { useEffect, useRef, useState, type RefObject } from "react";
import type { Comm } from "../data/types";
import { LABEL_W, MONTHS, TOTAL_W, scaleX } from "../lib/scale";

interface Props {
  comms: Comm[];
  /** the scrolling viewport (App's root) — the minimap subscribes to its
   *  scroll itself, so scrubbing never re-renders the heavy timeline */
  scrollerRef: RefObject<HTMLDivElement | null>;
}

// Interior drawing size. Bars are positioned with the SAME scaleX the canvas
// uses (normalised to TOTAL_W), so expanded months widen on the minimap too
// and the viewport window always lines up with what's actually on screen.
const MAP_W = 300;
const BAR_AREA_H = 26;

/** Bottom-left overview scrubber — the whole 3-year map at a glance. Density
 *  bars show comms per month (the Jun–Aug wall is visible without scrolling);
 *  the highlighted window is the current viewport. Click or drag to jump. */
export function Minimap({ comms, scrollerRef }: Props) {
  // Viewport tracking — local state so only the minimap re-renders on scroll.
  const [view, setView] = useState({ left: 0, width: 0 });
  const dragging = useRef(false);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const read = () => setView({ left: el.scrollLeft, width: el.clientWidth });
    read();
    el.addEventListener("scroll", read, { passive: true });
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", read);
      ro.disconnect();
    };
  }, [scrollerRef]);

  // Comm density per month (folded comms count too — density is the point).
  const counts = new Array<number>(MONTHS).fill(0);
  for (const c of comms) {
    const m = Math.floor(c.month);
    if (m >= 0 && m < MONTHS) counts[m]++;
  }
  const max = Math.max(1, ...counts);

  // Timeline-x → minimap-x, sharing the canvas's non-linear scale.
  const toMap = (t: number) => (t / TOTAL_W) * MAP_W;

  // Visible timeline range: the sticky gutter covers the first LABEL_W px of
  // the viewport, so the canvas shows [scrollLeft, scrollLeft + width - LABEL_W].
  const winLeft = toMap(Math.max(0, view.left));
  const winW = Math.max(8, toMap(Math.max(0, view.width - LABEL_W)));

  const jumpTo = (clientX: number, target: HTMLElement) => {
    const el = scrollerRef.current;
    if (!el) return;
    const rect = target.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    // centre the viewport on the clicked spot
    el.scrollTo({ left: Math.max(0, frac * TOTAL_W - (view.width - LABEL_W) / 2) });
  };

  return (
    <div className="fixed bottom-5 left-5 z-40">
      <div className="rounded-xl border border-grey-30 bg-card/70 px-2.5 pt-2 pb-1.5 shadow-xl backdrop-blur-md">
        <div
          role="scrollbar"
          aria-label="Timeline overview — click or drag to move around the map"
          aria-orientation="horizontal"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round((view.left / Math.max(1, TOTAL_W)) * 100)}
          className="relative cursor-pointer touch-none select-none"
          style={{ width: MAP_W, height: BAR_AREA_H }}
          onPointerDown={(e) => {
            dragging.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            jumpTo(e.clientX, e.currentTarget);
          }}
          onPointerMove={(e) => {
            if (dragging.current) jumpTo(e.clientX, e.currentTarget);
          }}
          onPointerUp={() => {
            dragging.current = false;
          }}
        >
          {/* density bars — one per month, bottom-aligned */}
          {counts.map((n, m) => {
            const left = toMap(scaleX(m));
            const w = Math.max(1, toMap(scaleX(m + 1)) - left - 1);
            const h = n === 0 ? 1.5 : 3 + (n / max) * (BAR_AREA_H - 4);
            return (
              <span
                key={m}
                className={`absolute bottom-0 rounded-t-[1px] ${
                  n === 0 ? "bg-grey-30" : "bg-grey-50"
                }`}
                style={{ left, width: w, height: h }}
              />
            );
          })}
          {/* year-band seams */}
          {[12, 24, 36].map((m) => (
            <span
              key={m}
              className="absolute top-0 bottom-0 w-px bg-grey-40"
              style={{ left: toMap(scaleX(m)) }}
            />
          ))}
          {/* viewport window */}
          <span
            className="pointer-events-none absolute top-0 bottom-0 rounded-sm border border-rmit-blue-interactive bg-rmit-blue/15"
            style={{ left: winLeft, width: winW }}
          />
        </div>
        {/* band labels — the journey reading: Yr 10 → 11 → 12 */}
        <div className="relative h-3.5" style={{ width: MAP_W }} aria-hidden>
          {[
            { label: "Yr 10", from: 0, to: 12 },
            { label: "Yr 11", from: 12, to: 24 },
            { label: "Yr 12", from: 24, to: 36 },
          ].map((b) => (
            <span
              key={b.label}
              className="absolute top-0.5 -translate-x-1/2 text-[9px] leading-none text-grey-60"
              style={{ left: (toMap(scaleX(b.from)) + toMap(scaleX(b.to))) / 2 }}
            >
              {b.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
