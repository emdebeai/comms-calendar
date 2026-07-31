import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { EYEBROW, FOCUS_RING } from "../lib/styles";

interface Props {
  /** small uppercase line above the title, e.g. "Email · 2 Jul · Year 12" */
  overline: string;
  title: string;
  /** classes for the round icon chip, e.g. "bg-tint-blue text-rmit-blue" */
  iconChipClass: string;
  icon: ReactNode;
  onClose: () => void;
  children: ReactNode;
}

/** Right-side detail dialog scaffolding shared by the comm and campaign
 *  panels: overlay, focus trap + restore, Escape to close, header. */
export function DetailPanelShell({ overline, title, iconChipClass, icon, onClose, children }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Move focus into the dialog on open and restore it to the triggering
  // element on close (WCAG 2.4.3).
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => previouslyFocused?.focus?.();
  }, []);

  // Escape closes; Tab is trapped within the panel while it's open.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab") return;
    const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])',
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
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      {/* black (not a grey token) so the scrim stays dark in dark mode too */}
      <div className="animate-fade-in absolute inset-0 bg-black/40" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-panel-title"
        className="animate-panel-in relative flex h-full w-96 max-w-full flex-col bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="flex items-start justify-between gap-3 border-b border-grey-30 p-5">
          <div className="flex gap-3">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${iconChipClass}`}
            >
              {icon}
            </span>
            <div>
              <p className={`text-grey-70 ${EYEBROW}`}>{overline}</p>
              <h2 id="detail-panel-title" className="text-xl font-semibold text-grey-90">
                {title}
              </h2>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className={`-m-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-grey-70 hover:bg-grey-10 hover:text-grey-90 ${FOCUS_RING}`}
            aria-label="Close"
          >
            <X size={18} strokeWidth={1.75} aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
