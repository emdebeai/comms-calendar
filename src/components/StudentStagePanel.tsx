import { useEffect, useRef } from "react";
import { GraduationCap, Link2, X } from "lucide-react";
import { STUDENT_EXPERIENCE, linkedCommIds } from "../data/studentExperience";
import { EYEBROW, FOCUS_RING } from "../lib/styles";

interface Props {
  /** STAGES label of the open stage */
  stageLabel: string;
  onClose: () => void;
}

/** Deep-dive reference panel for one journey stage — the full working-doc
 *  content (voice, needs, questions, decisions, actions; Offer carries a
 *  second "No offer" block). Opened from the small ⓘ in the student journey
 *  lane. Pure reference: the interactive question → comms highlighting lives
 *  in the lane itself, so this panel never has to be open (or in the way)
 *  while reading the map. Non-modal so the canvas stays visible. */
export function StudentStagePanel({ stageLabel, onClose }: Props) {
  const data = STUDENT_EXPERIENCE.find((e) => e.stage === stageLabel);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Move focus in on open / stage change; Escape closes from anywhere in
  // the panel.
  useEffect(() => {
    closeRef.current?.focus();
  }, [stageLabel]);

  if (!data) return null;

  return (
    <aside
      role="complementary"
      aria-label={`Student experience — ${stageLabel}`}
      className="animate-panel-in fixed inset-y-0 right-0 z-50 flex w-96 max-w-full flex-col border-l border-grey-30 bg-card shadow-xl"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="flex items-start justify-between gap-3 border-b border-grey-30 p-5">
        <div className="flex gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tint-blue text-rmit-blue">
            <GraduationCap size={16} strokeWidth={1.75} aria-hidden />
          </span>
          <div>
            <p className={`text-grey-70 ${EYEBROW}`}>Student journey · {data.timing}</p>
            <h2 className="text-xl font-semibold text-grey-90">{stageLabel}</h2>
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

      <div className="flex-1 overflow-y-auto p-5">
        {data.blocks.map((block, bi) => (
          <section key={bi} className={bi > 0 ? "mt-6 border-t border-grey-30 pt-4" : ""}>
            {block.label && (
              <h3 className="text-sm font-semibold text-rmit-blue">{block.label}</h3>
            )}
            {block.groups.map((group) => (
              <div key={group.heading} className="mt-4 first:mt-2">
                <h4 className={`text-grey-70 ${EYEBROW}`}>{group.heading}</h4>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {group.items.map((item) => {
                    const links =
                      group.heading === "Questions" ? linkedCommIds(stageLabel, item) : [];
                    return (
                      <li
                        key={item}
                        className={`text-sm leading-snug ${
                          group.heading === "Student voice" || group.heading === "Questions"
                            ? "border-l-2 border-grey-30 pl-2.5 text-grey-80 italic"
                            : "text-grey-90"
                        }`}
                      >
                        {item}
                        {links.length > 0 && (
                          <span className="ml-1.5 inline-flex translate-y-px items-center gap-0.5 text-xs font-semibold not-italic text-rmit-blue-interactive">
                            <Link2 size={10} strokeWidth={2} aria-hidden />
                            {links.length}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </section>
        ))}
      </div>
    </aside>
  );
}
