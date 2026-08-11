import { useEffect, useRef, useState } from "react";
import { GraduationCap, Info, Link2, Moon, Sun } from "lucide-react";
import type { CommType } from "../data/types";
import { FOCUS_RING } from "../lib/styles";
import { COMM_COLORS, COMM_ICONS, COMM_LABELS } from "./icons";

const ALL_TYPES = Object.keys(COMM_ICONS) as CommType[];

interface Props {
  activeTypes: Set<CommType>;
  onToggleType: (t: CommType) => void;
  onResetTypes: () => void;
  showLines: boolean;
  onToggleLines: () => void;
  showStudentLayer: boolean;
  onToggleStudentLayer: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

/** Sleek floating control dock — pinned bottom-centre, frosted, always in
 *  reach as you scroll. Holds the type filters (colour-coded icons that also
 *  serve as the type key), the trigger-lines toggle, a legend/tips popover,
 *  and the dark-mode switch. Bottom-centre so it never clashes with the
 *  sticky stage/month header bands or the right-hand detail panels. */
export function ControlDock({
  activeTypes,
  onToggleType,
  onResetTypes,
  showLines,
  onToggleLines,
  showStudentLayer,
  onToggleStudentLayer,
  theme,
  onToggleTheme,
}: Props) {
  const allActive = activeTypes.size === ALL_TYPES.length;
  const [legendOpen, setLegendOpen] = useState(false);
  const legendRef = useRef<HTMLDivElement>(null);

  // Close the legend popover on outside click / Escape.
  useEffect(() => {
    if (!legendOpen) return;
    const onDown = (e: MouseEvent) => {
      if (legendRef.current && !legendRef.current.contains(e.target as Node)) setLegendOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLegendOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [legendOpen]);

  const iconBtn = `flex h-8 w-8 items-center justify-center rounded-full transition-colors ${FOCUS_RING}`;

  return (
    <div className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2">
      <div className="flex items-center gap-0.5 rounded-full border border-grey-30 bg-card/70 px-2 py-1.5 shadow-xl backdrop-blur-md">
        {/* All types (reset) */}
        <button
          type="button"
          onClick={onResetTypes}
          aria-pressed={allActive}
          title="Show all types"
          className={`flex h-8 items-center rounded-full px-3 text-xs font-medium transition-colors ${FOCUS_RING} ${
            allActive ? "bg-header text-white" : "text-grey-70 hover:bg-grey-20"
          }`}
        >
          All
        </button>

        {/* Type filters — icon-only, tinted when selected; icon colour is the
            type key. */}
        {ALL_TYPES.map((t) => {
          const Icon = COMM_ICONS[t];
          const c = COMM_COLORS[t];
          const on = activeTypes.has(t);
          const selected = on && !allActive;
          const dimmed = !on && !allActive;
          return (
            <button
              key={t}
              type="button"
              onClick={() => onToggleType(t)}
              aria-pressed={on}
              aria-label={COMM_LABELS[t]}
              title={COMM_LABELS[t]}
              className={`${iconBtn} ${c.text} ${
                selected ? c.chip : `hover:bg-grey-20 ${dimmed ? "opacity-40" : ""}`
              }`}
            >
              <Icon size={15} strokeWidth={1.75} aria-hidden />
            </button>
          );
        })}

        <span className="mx-1 h-5 w-px bg-grey-30" aria-hidden />

        {/* Student journey — reveals the per-stage question cards under the
            stage header; off by default. */}
        <button
          type="button"
          onClick={onToggleStudentLayer}
          aria-pressed={showStudentLayer}
          aria-label={showStudentLayer ? "Hide student journey" : "Show student journey"}
          title="Student journey"
          className={`${iconBtn} ${
            showStudentLayer ? "bg-header text-white" : "text-grey-70 hover:bg-grey-20"
          }`}
        >
          <GraduationCap size={15} strokeWidth={1.75} aria-hidden />
        </button>

        {/* Trigger lines */}
        <button
          type="button"
          onClick={onToggleLines}
          aria-pressed={showLines}
          aria-label={showLines ? "Hide trigger lines" : "Show trigger lines"}
          title="Trigger lines"
          className={`${iconBtn} ${
            showLines ? "bg-header text-white" : "text-grey-70 hover:bg-grey-20"
          }`}
        >
          <Link2 size={15} strokeWidth={1.75} aria-hidden />
        </button>

        {/* Legend & tips */}
        <div className="relative" ref={legendRef}>
          <button
            type="button"
            onClick={() => setLegendOpen((o) => !o)}
            aria-expanded={legendOpen}
            aria-label="Legend and tips"
            title="Legend & tips"
            className={`${iconBtn} ${
              legendOpen ? "bg-grey-20 text-grey-90" : "text-grey-70 hover:bg-grey-20"
            }`}
          >
            <Info size={15} strokeWidth={1.75} aria-hidden />
          </button>
          {legendOpen && (
            <div
              role="dialog"
              aria-label="Legend and tips"
              className="animate-pop-in absolute right-0 bottom-full mb-3 w-72 rounded-xl border border-grey-30 bg-card p-3.5 text-xs text-grey-70 shadow-xl"
            >
              <div className="flex flex-col gap-2.5">
                <span className="flex items-start gap-2">
                  {/* the dot grammar — solid = placed card, hollow = folded */}
                  <span className="mt-1 flex w-6 shrink-0 items-center justify-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-rmit-blue" />
                    <span className="h-2.5 w-2.5 rounded-full border-2 border-rmit-blue" />
                  </span>
                  <span>
                    <span className="font-medium text-grey-90">Date dots</span> — solid marks a
                    card&rsquo;s send date; hollow means it&rsquo;s folded into &ldquo;+N
                    more&rdquo;. Click a hollow dot to expand its month.
                  </span>
                </span>
                <span className="flex items-start gap-2">
                  <span className="mt-0.5 h-3.5 w-6 shrink-0 rounded-sm border border-dashed border-grey-40 bg-card" />
                  <span>
                    <span className="font-medium text-grey-90">Moment that matters</span> — hover
                    or click its label to see linked comms.
                  </span>
                </span>
                <span className="flex items-start gap-2">
                  <span className="mt-0.5 h-3.5 w-6 shrink-0 rounded-full border border-amber/50 bg-tint-amber" />
                  <span>
                    <span className="font-medium text-grey-90">Media schedule</span> — always-on
                    campaigns, expandable to per-channel.
                  </span>
                </span>
                <span className="border-t border-grey-30 pt-2.5 leading-relaxed">
                  Hover a comm to trace links · click for details · hover a student question to light
                  up the comms that answer it.
                </span>
                <span className="leading-relaxed">
                  <span className="font-medium text-grey-90">Zoom a month</span> — click its header,
                  Ctrl/⌘ + scroll (or pinch) over it, or press{" "}
                  <kbd className="rounded border border-grey-30 bg-grey-10 px-1 font-sans">+</kbd> /{" "}
                  <kbd className="rounded border border-grey-30 bg-grey-10 px-1 font-sans">−</kbd> /{" "}
                  <kbd className="rounded border border-grey-30 bg-grey-10 px-1 font-sans">0</kbd>.
                </span>
              </div>
            </div>
          )}
        </div>

        <span className="mx-1 h-5 w-px bg-grey-30" aria-hidden />

        {/* Dark mode */}
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title={theme === "dark" ? "Light mode" : "Dark mode"}
          className={`${iconBtn} text-grey-70 hover:bg-grey-20`}
        >
          {theme === "dark" ? (
            <Sun size={15} strokeWidth={2} aria-hidden />
          ) : (
            <Moon size={15} strokeWidth={2} aria-hidden />
          )}
        </button>
      </div>
    </div>
  );
}
