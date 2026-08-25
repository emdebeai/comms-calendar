import { useEffect, useRef, useState } from "react";
import { EyeOff, FileDown, Home, Info, Link2, MoreHorizontal, Moon, Rows3, Shield, ShieldCheck, Sun } from "lucide-react";
import type { CommType } from "../data/types";
import { FOCUS_RING } from "../lib/styles";
import { HoverTip } from "./HoverTip";
import { COMM_COLORS, COMM_ICONS, COMM_LABELS } from "./icons";

const ALL_TYPES = Object.keys(COMM_ICONS) as CommType[];

interface Props {
  activeTypes: Set<CommType>;
  onToggleType: (t: CommType) => void;
  onResetTypes: () => void;
  showLines: boolean;
  onToggleLines: () => void;
  /** overview mode — every lane collapsed to its touchpoint strip */
  allLanesCollapsed: boolean;
  onToggleAllLanes: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  isAdmin: boolean;
  onToggleAdmin: () => void;
  onGoHome: () => void;
  /** hide the floating chrome (presentation mode) */
  onHideUi: () => void;
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
  allLanesCollapsed,
  onToggleAllLanes,
  theme,
  onToggleTheme,
  isAdmin,
  onToggleAdmin,
  onGoHome,
  onHideUi,
}: Props) {
  const allActive = activeTypes.size === ALL_TYPES.length;
  const [legendOpen, setLegendOpen] = useState(false);
  const legendRef = useRef<HTMLDivElement>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  // Export the map to a print-ready PDF. Opens the curated print view in a new
  // tab, which sizes the page to the whole map and auto-opens the browser's
  // Save-as-PDF. Server-free, so it works on the static deploy too.
  const exportPdf = () => {
    const url = `${window.location.origin}${window.location.pathname}?print&dots&export=1`;
    window.open(url, "_blank", "noopener");
    setMoreOpen(false);
  };

  // Close the overflow menu on outside click / Escape; move focus into it on
  // open (and back to the trigger on close — the trigger keeps focus context).
  useEffect(() => {
    if (!moreOpen) return;
    moreRef.current?.querySelector<HTMLElement>("[data-popover] button")?.focus();
    const onDown = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMoreOpen(false);
        moreRef.current?.querySelector<HTMLElement>("button")?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  // Close the legend popover on outside click / Escape; focus it on open so
  // keyboard/AT users land in the content they just asked for.
  useEffect(() => {
    if (!legendOpen) return;
    legendRef.current?.querySelector<HTMLElement>("[role='dialog']")?.focus();
    const onDown = (e: MouseEvent) => {
      if (legendRef.current && !legendRef.current.contains(e.target as Node)) setLegendOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLegendOpen(false);
        legendRef.current?.querySelector<HTMLElement>("button")?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [legendOpen]);

  const iconBtn = `group relative flex h-8 w-8 items-center justify-center rounded-full transition-colors ${FOCUS_RING}`;

  return (
    <div role="region" aria-label="Map controls" className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2">
      <div className="flex items-center gap-0.5 rounded-full border border-grey-30 bg-card/70 px-2 py-1.5 shadow-xl backdrop-blur-md">
        {/* Back to the landing page */}
        <button type="button" onClick={onGoHome} aria-label="Back to start" className={`${iconBtn} text-grey-70 hover:bg-grey-20`}>
          <Home size={15} strokeWidth={1.75} aria-hidden />
          <HoverTip label="Back to start" />
        </button>
        <span className="mx-1 h-5 w-px bg-grey-30" aria-hidden />

        {/* All types (reset) */}
        <button
          type="button"
          onClick={onResetTypes}
          aria-pressed={allActive}
          className={`group relative flex h-8 items-center rounded-full px-3 text-xs font-medium transition-colors ${FOCUS_RING} ${
            allActive ? "bg-rmit-blue-interactive text-on-accent" : "text-grey-70 hover:bg-grey-20"
          }`}
        >
          All
          <HoverTip label="Show all types" />
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
              className={`${iconBtn} ${c.text} ${
                selected ? c.chip : `hover:bg-grey-20 ${dimmed ? "opacity-40" : ""}`
              }`}
            >
              <Icon size={15} strokeWidth={1.75} aria-hidden />
              <HoverTip label={COMM_LABELS[t]} />
            </button>
          );
        })}

        <span className="mx-1 h-5 w-px bg-grey-30" aria-hidden />

        {/* Overview — collapse every lane to its compact touchpoint strip so
            the whole map fits at once (markers keep their type icon). */}
        <button
          type="button"
          onClick={onToggleAllLanes}
          aria-pressed={allLanesCollapsed}
          aria-label={allLanesCollapsed ? "Expand all lanes" : "Overview — collapse all lanes"}
          className={`${iconBtn} ${
            allLanesCollapsed ? "bg-rmit-blue-interactive text-on-accent" : "text-grey-70 hover:bg-grey-20"
          }`}
        >
          <Rows3 size={15} strokeWidth={1.75} aria-hidden />
          <HoverTip label="Overview — all lanes as rows" />
        </button>

        {/* Trigger lines */}
        <button
          type="button"
          onClick={onToggleLines}
          aria-pressed={showLines}
          aria-label={showLines ? "Hide trigger lines" : "Show trigger lines"}
          className={`${iconBtn} ${
            showLines ? "bg-rmit-blue-interactive text-on-accent" : "text-grey-70 hover:bg-grey-20"
          }`}
        >
          <Link2 size={15} strokeWidth={1.75} aria-hidden />
          <HoverTip label="Trigger lines" />
        </button>

        {/* Legend & tips */}
        <div className="relative" ref={legendRef}>
          <button
            type="button"
            onClick={() => setLegendOpen((o) => !o)}
            aria-expanded={legendOpen}
            aria-label="Legend and tips"
            className={`${iconBtn} ${
              legendOpen ? "bg-grey-20 text-grey-90" : "text-grey-70 hover:bg-grey-20"
            }`}
          >
            <Info size={15} strokeWidth={1.75} aria-hidden />
            {!legendOpen && <HoverTip label="Legend & tips" />}
          </button>
          {legendOpen && (
            <div
              role="dialog"
              aria-label="Legend and tips"
              tabIndex={-1}
              className="animate-pop-in absolute right-0 bottom-full mb-3 w-72 rounded-lg border border-grey-30 bg-card p-3.5 text-xs text-grey-70 shadow-xl focus:outline-none"
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
                  <span className="mt-0.5 h-3.5 w-6 shrink-0 rounded-full border border-purple/50 bg-tint-purple" />
                  <span>
                    <span className="font-medium text-grey-90">Media schedule</span> — always-on
                    campaigns, expandable to per-channel.
                  </span>
                </span>
                <span className="border-t border-grey-30 pt-2.5 leading-relaxed">
                  <span className="font-medium text-grey-90">Zoom a month</span> — click its header,
                  Ctrl/⌘ + scroll (or pinch) over it, or press{" "}
                  <kbd className="rounded-sm border border-grey-30 bg-grey-10 px-1 font-sans">+</kbd> /{" "}
                  <kbd className="rounded-sm border border-grey-30 bg-grey-10 px-1 font-sans">−</kbd> /{" "}
                  <kbd className="rounded-sm border border-grey-30 bg-grey-10 px-1 font-sans">0</kbd>.
                </span>
              </div>
            </div>
          )}
        </div>

        <span className="mx-1 h-5 w-px bg-grey-30" aria-hidden />

        {/* Overflow — the once-in-a-while actions (theme, admin, hide) share
            one slot instead of three permanent icons. */}
        <div className="relative" ref={moreRef}>
          <button
            type="button"
            onClick={() => setMoreOpen((o) => !o)}
            aria-expanded={moreOpen}
            aria-label="More options"
            className={`${iconBtn} ${moreOpen ? "bg-grey-20 text-grey-90" : "text-grey-70 hover:bg-grey-20"}`}
          >
            <MoreHorizontal size={15} strokeWidth={1.75} aria-hidden />
            {!moreOpen && <HoverTip label="More" />}
          </button>
          {moreOpen && (
            <div
              // Plain buttons in a popover — no role="menu": that ARIA role
              // promises arrow-key navigation this popover doesn't implement.
              data-popover
              className="animate-pop-in absolute right-0 bottom-full mb-3 w-48 rounded-lg border border-grey-30 bg-card p-1.5 shadow-lg"
            >
              <button
                type="button"
                onClick={exportPdf}
                className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-grey-90 hover:bg-grey-10 ${FOCUS_RING}`}
              >
                <FileDown size={15} strokeWidth={2} aria-hidden className="text-grey-70" />
                Export PDF
              </button>
              <button
                type="button"
                onClick={() => {
                  onToggleTheme();
                  setMoreOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-grey-90 hover:bg-grey-10 ${FOCUS_RING}`}
              >
                {theme === "dark" ? (
                  <Sun size={15} strokeWidth={2} aria-hidden className="text-grey-70" />
                ) : (
                  <Moon size={15} strokeWidth={2} aria-hidden className="text-grey-70" />
                )}
                {theme === "dark" ? "Light mode" : "Dark mode"}
              </button>
              <button
                type="button"
                onClick={() => {
                  onToggleAdmin();
                  setMoreOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-grey-90 hover:bg-grey-10 ${FOCUS_RING}`}
              >
                {isAdmin ? (
                  <ShieldCheck size={15} strokeWidth={2} aria-hidden className="text-rmit-blue" />
                ) : (
                  <Shield size={15} strokeWidth={2} aria-hidden className="text-grey-70" />
                )}
                {isAdmin ? "Admin: unlocked" : "Admin"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMoreOpen(false);
                  onHideUi();
                }}
                className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-grey-90 hover:bg-grey-10 ${FOCUS_RING}`}
              >
                <EyeOff size={15} strokeWidth={2} aria-hidden className="text-grey-70" />
                Hide controls
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
