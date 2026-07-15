import { Info, Link2 } from "lucide-react";
import { STAGES } from "../data/journey";
import { STUDENT_EXPERIENCE, linkedCommIds, stageQuestions } from "../data/studentExperience";
import { LABEL_W, STUDENT_LANE_H, TOTAL_W, scaleX } from "../lib/scale";
import { EYEBROW, FOCUS_RING } from "../lib/styles";

export interface QuestionRef {
  stage: string;
  question: string;
}

interface Props {
  /** question currently driving the cross-highlight (hover or pin) */
  activeQuestion: QuestionRef | null;
  onHoverQuestion: (q: QuestionRef | null) => void;
  onPinQuestion: (q: QuestionRef) => void;
  /** small info button per stage — opens the deep-dive panel */
  onOpenStage: (stageLabel: string) => void;
}

/** The student journey lane — the map's spine. The student's QUESTIONS sit
 *  directly in the lane, per stage, so reading the journey takes zero clicks.
 *  A question with linked comms carries a small count chip — hover it and
 *  those comms light up in place while everything else dims. Questions with
 *  no links stay plain: no chip = nothing mapped to it yet, which is the gap.
 *  The rest of the doc content (voice, needs, decisions, actions) lives
 *  behind the small ⓘ per stage so it never crowds the map. */
export function StudentJourneyLane({
  activeQuestion,
  onHoverQuestion,
  onPinQuestion,
  onOpenStage,
}: Props) {
  return (
    <div className="relative z-30" style={{ height: STUDENT_LANE_H }}>
      {/* ── Canvas side ── */}
      <div className="absolute top-0" style={{ left: LABEL_W, width: TOTAL_W }}>
        <div
          className="relative border-b border-grey-30 bg-card"
          style={{ height: STUDENT_LANE_H }}
        >
          {STAGES.map((stage, i) => {
            const data = STUDENT_EXPERIENCE.find((e) => e.stage === stage.label);
            if (!data) return null;
            const left = scaleX(stage.from);
            const width = scaleX(stage.to) - left;
            const questions = stageQuestions(stage.label);
            return (
              <div
                key={stage.label}
                className={`absolute top-0 h-full ${i > 0 ? "border-l border-grey-20" : ""}`}
                style={{ left, width }}
              >
                {/* Sticky-left so a wide stage's questions stay in view while
                    scrolling through it. */}
                <div
                  className="relative h-full"
                  style={{
                    position: "sticky",
                    left: LABEL_W + 8,
                    maxWidth: Math.max(Math.min(width - 10, 400), 150),
                  }}
                >
                  <div className="h-full overflow-y-auto px-2 pt-1.5 pb-4">
                    {/* deep-dive affordance — quiet, top-right of the stage */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenStage(stage.label);
                      }}
                      aria-haspopup="dialog"
                      aria-label={`${stage.label} — full student experience (voice, needs, decisions, actions)`}
                      title="Full student experience for this stage"
                      className={`float-right ml-1 rounded-full p-1 text-grey-60 hover:bg-grey-10 hover:text-rmit-blue ${FOCUS_RING}`}
                    >
                      <Info size={13} strokeWidth={2} aria-hidden />
                    </button>

                    <ul className="flex flex-col gap-1">
                      {questions.map((q) => {
                        const links = linkedCommIds(stage.label, q);
                        const hasLinks = links.length > 0;
                        const active =
                          activeQuestion?.stage === stage.label &&
                          activeQuestion?.question === q;
                        // Only linked questions are interactive — hovering a
                        // question with no links would dim the whole canvas
                        // with no visible response, which just reads as broken.
                        if (!hasLinks) {
                          return (
                            <li
                              key={q}
                              className="border-l-2 border-grey-30 py-0.5 pl-2 text-xs leading-snug text-grey-80 italic"
                            >
                              {q}
                            </li>
                          );
                        }
                        return (
                          <li key={q}>
                            <button
                              type="button"
                              aria-pressed={active}
                              onMouseEnter={() => onHoverQuestion({ stage: stage.label, question: q })}
                              onMouseLeave={() => onHoverQuestion(null)}
                              onFocus={() => onHoverQuestion({ stage: stage.label, question: q })}
                              onBlur={() => onHoverQuestion(null)}
                              onClick={(e) => {
                                e.stopPropagation();
                                onPinQuestion({ stage: stage.label, question: q });
                              }}
                              className={`w-full rounded-r-md border-l-2 py-0.5 pl-2 text-left text-xs leading-snug italic transition-colors ${FOCUS_RING} ${
                                active
                                  ? "border-rmit-blue bg-tint-blue/60 text-rmit-blue"
                                  : "border-rmit-blue-interactive/50 text-grey-90 hover:bg-tint-blue/40"
                              }`}
                            >
                              {q}{" "}
                              <span className="inline-flex translate-y-px items-center gap-0.5 text-[10px] font-semibold whitespace-nowrap not-italic text-rmit-blue-interactive">
                                <Link2 size={10} strokeWidth={2} aria-hidden />
                                {links.length}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  {/* soft fade hints "scroll for more" when questions clip */}
                  <div
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-card"
                    aria-hidden
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Sticky gutter label ── */}
      <div
        className="sticky left-0 h-full border-r border-b border-grey-30 bg-card"
        style={{ width: LABEL_W }}
      >
        <div
          className="flex h-full flex-col justify-center px-4"
        >
          <span className={`text-rmit-blue ${EYEBROW}`}>Student Journey</span>
          <span className="mt-0.5 text-xs text-grey-70">What students are asking</span>
          <span className="mt-2 flex items-center gap-1 text-[10px] leading-snug text-grey-60">
            <Link2 size={10} strokeWidth={2} className="shrink-0" aria-hidden />
            hover to see the comms that answer it
          </span>
        </div>
      </div>
    </div>
  );
}
