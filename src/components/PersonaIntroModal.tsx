import { useEffect, useRef } from "react";
import { GraduationCap, Info } from "lucide-react";
import { EYEBROW, FOCUS_RING } from "../lib/styles";

// Persona 01 as a profile, not a policy: identity chips, a stat grid and
// three boundaries. Figures from docs/persona-01-domestic-vtac-year12.md;
// every stat carries its source on the info mark.
const IDENTITY = ["Year 12", "Applies via VTAC", "Straight from school", "Metro"];

const STATS: { value: string; label: string; source: string }[] = [
  { value: "82%", label: "study to get a job", source: "RMIT commencing students · 2022–24" },
  { value: "~15%", label: "put RMIT first on their VTAC list", source: "VTAC preference extract" },
  { value: "99%", label: "aged 19 or under at application", source: "Recruitment EXP dashboard · 2025" },
  { value: "67%", label: "preference a bachelor's degree", source: "Recruitment EXP dashboard · 2025" },
  { value: "~89%", label: "enrol outside a packaged pathway", source: "Recruitment EXP dashboard · 2025" },
  { value: "7,298", label: "VTAC enrolments in 2025", source: "Recruitment EXP dashboard · 2025" },
];

const NOTS = ["Not a direct applicant", "Not the parent's journey", "No portfolio or offer-accept step"];

/** First-visit introduction to the persona, shown over the map. */
export function PersonaIntroModal({ onClose }: { onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    primaryRef.current?.focus();
    return () => previouslyFocused?.focus?.();
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab") return;
    const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusables || focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div className="animate-fade-in absolute inset-0 bg-black/40" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="persona-intro-title"
        className="animate-pop-in relative max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-lg border border-grey-30 bg-card shadow-lg"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="p-8">
          {/* Identity — a person, on the card (no banner) */}
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-tint-blue text-rmit-blue">
              <GraduationCap size={22} strokeWidth={2} aria-hidden />
            </span>
            <span>
              <span className={`block text-rmit-blue ${EYEBROW}`}>Persona 01 · DOM SL</span>
              <h2 id="persona-intro-title" className="mt-0.5 text-xl font-semibold text-grey-90">
                Domestic school leaver
              </h2>
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {IDENTITY.map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-grey-30 px-2.5 py-1 text-xs font-medium text-grey-80"
              >
                {chip}
              </span>
            ))}
          </div>

          {/* Stat grid — numbers carry the story, sources on the info marks */}
          <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
            {STATS.map((s) => (
              <div key={s.label}>
                <dt className="sr-only">{s.label}</dt>
                <dd className="flex items-baseline gap-1 text-2xl font-semibold text-rmit-blue">
                  {s.value}
                  <span
                    className="group relative inline-flex translate-y-[-2px] cursor-help text-grey-60"
                    aria-label={`Source: ${s.source}`}
                  >
                    <Info size={11} strokeWidth={2} aria-hidden />
                    <HoverSource label={s.source} />
                  </span>
                </dd>
                <p className="mt-0.5 text-xs leading-snug text-grey-70">{s.label}</p>
              </div>
            ))}
          </dl>

          {/* Boundaries — three short chips, not a lecture */}
          <div className="mt-6 flex flex-wrap items-center gap-1.5 border-t border-grey-30 pt-5">
            {NOTS.map((n) => (
              <span
                key={n}
                className="rounded-full bg-grey-10 px-2.5 py-1 text-xs text-grey-70"
              >
                {n}
              </span>
            ))}
            <span className="group relative inline-flex cursor-help text-grey-60" aria-label="SNAP and Indigenous Access are toggles on the map, not the baseline">
              <Info size={12} strokeWidth={2} aria-hidden />
              <HoverSource label="Equity cohorts (SNAP, Indigenous Access) are toggles on the map" />
            </span>
          </div>

          <button
            ref={primaryRef}
            type="button"
            onClick={onClose}
            className={`mt-6 w-full rounded-md bg-rmit-blue px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-rmit-blue/90 ${FOCUS_RING}`}
          >
            Explore the map
          </button>
        </div>
      </div>
    </div>
  );
}

/** Source tooltip on hover, styled for inline info marks. */
function HoverSource({ label }: { label: string }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 hidden -translate-x-1/2 rounded-md bg-tooltip px-2 py-1 text-xs font-normal tracking-normal whitespace-nowrap normal-case text-white shadow-md group-hover:block"
    >
      {label}
    </span>
  );
}
