import { useEffect, useRef } from "react";
import { GraduationCap, Info } from "lucide-react";
import { EYEBROW, FOCUS_RING } from "../lib/styles";

// Persona 01 in brief — figures and wording from
// docs/persona-01-domestic-vtac-year12.md; each fact carries its source.
const FACTS: { text: string; source: string }[] = [
  {
    text: "Year 12, applying through VTAC straight from school. For a domestic school leaver VTAC is the application route by definition (7,298 enrolments in 2025).",
    source: "Recruitment EXP dashboard · 2025",
  },
  {
    text: "Aged 17 to 18: 99% are 19 or under at application.",
    source: "Recruitment EXP dashboard · 2025",
  },
  {
    text: "Studying a bachelor's degree outside a packaged pathway (~67% of preferences; ~89% non-pathway).",
    source: "Recruitment EXP dashboard · 2025",
  },
  {
    text: "RMIT is their first preference only ~15% of the time; it usually sits lower on their list.",
    source: "VTAC preference extract",
  },
  {
    text: "Motivated by employment: 82% study to get a job.",
    source: "RMIT commencing students · 2022–24",
  },
  {
    text: "Metropolitan: only ~7% are regional or remote.",
    source: "Recruitment EXP dashboard · 2025",
  },
];

const NOTS: string[] = [
  "Not a direct applicant, and not the parent's journey.",
  "Not an equity cohort: SNAP and Indigenous Access are toggles on the map, not the baseline.",
  "No portfolio or selection task, and no offer-acceptance step: a VTAC offer appears straight in Enrolment Online.",
];

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
        className="animate-pop-in relative max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-lg border border-grey-30 bg-card p-8 shadow-lg"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <span className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-tint-blue text-rmit-blue">
            <GraduationCap size={16} strokeWidth={2} aria-hidden />
          </span>
          <span className={`text-grey-70 ${EYEBROW}`}>Persona 01 · DOM SL</span>
        </span>
        <h2 id="persona-intro-title" className="mt-4 text-xl font-semibold text-grey-90">
          Who this map follows
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-grey-80">
          A Year 12 student applying to RMIT through VTAC straight from school. They apply to
          several universities, and the most common reason they give for studying is to improve
          their employment prospects.
        </p>

        <ul className="mt-5 flex flex-col gap-2.5">
          {FACTS.map((f) => (
            <li key={f.text.slice(0, 24)} className="flex items-start gap-2 text-sm text-grey-80">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rmit-blue" aria-hidden />
              <span className="leading-snug">
                {f.text}{" "}
                <span
                  className="group relative inline-flex translate-y-px cursor-help text-grey-60"
                  aria-label={`Source: ${f.source}`}
                >
                  <Info size={12} strokeWidth={2} aria-hidden />
                  <HoverSource label={f.source} />
                </span>
              </span>
            </li>
          ))}
        </ul>

        <h3 className={`mt-6 text-grey-70 ${EYEBROW}`}>What this persona is not</h3>
        <ul className="mt-2 flex flex-col gap-1.5">
          {NOTS.map((n) => (
            <li key={n.slice(0, 24)} className="flex items-start gap-2 text-sm text-grey-70">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-grey-40" aria-hidden />
              <span className="leading-snug">{n}</span>
            </li>
          ))}
        </ul>

        <button
          ref={primaryRef}
          type="button"
          onClick={onClose}
          className={`mt-7 w-full rounded-md bg-rmit-blue px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-rmit-blue/90 ${FOCUS_RING}`}
        >
          Explore the map
        </button>
      </div>
    </div>
  );
}

/** Source tooltip on hover — like HoverTip but styled for inline ⓘ marks. */
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
