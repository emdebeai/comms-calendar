import { ChevronDown, Circle } from "lucide-react";
import { STAGES } from "../data/journey";
import { linkedCommIds } from "../data/studentExperience";
import { stageCoverage, stageDisplayQuestions, stageVoice } from "../data/studentView";
import {
  LABEL_W,
  STUDENT_DETAIL_H,
  STUDENT_LANE_H,
  STUDENT_RIBBON_H,
  TOTAL_W,
  scaleX,
} from "../lib/scale";
import { EYEBROW, FOCUS_RING } from "../lib/styles";

export interface QuestionRef {
  stage: string;
  question: string;
}

interface Props {
  /** stage whose questions are unfolded; null = ribbon only */
  expandedStage: string | null;
  onExpandStage: (stage: string) => void;
  /** question currently driving the cross-highlight (hover or pin) */
  activeQuestion: QuestionRef | null;
  onHoverQuestion: (q: QuestionRef | null) => void;
  onPinQuestion: (q: QuestionRef) => void;
}

const answered = (stage: string, q: string) => linkedCommIds(stage, q).length > 0;

/** The student view. At rest it's a thin ribbon — each stage's coverage (how
 *  many of the student's top questions a touchpoint answers) as N/M + dots,
 *  aligned under the stage. Open a stage and a full-width panel drops below it
 *  with the student's own words and the questions laid across the width —
 *  hovering an answered one lights its comms in place. One stage opens at a
 *  time. Nothing here is a filter; it's the map read from the student's side. */
export function StudentJourneyLane({
  expandedStage,
  onExpandStage,
  activeQuestion,
  onHoverQuestion,
  onPinQuestion,
}: Props) {
  const openStage = expandedStage
    ? STAGES.find((s) => s.label === expandedStage) ?? null
    : null;

  return (
    <div className="relative z-30" style={{ height: STUDENT_LANE_H }}>
      {/* ── Canvas side ── */}
      <div className="absolute top-0" style={{ left: LABEL_W, width: TOTAL_W }}>
        <div
          className="relative border-b border-grey-30 bg-card"
          style={{ height: STUDENT_LANE_H }}
        >
          {/* Ribbon — one compact coverage read-out per stage */}
          {STAGES.map((stage, i) => {
            const questions = stageDisplayQuestions(stage.label);
            if (questions.length === 0) return null;
            const left = scaleX(stage.from);
            const width = scaleX(stage.to) - left;
            const isOpen = expandedStage === stage.label;
            const cov = stageCoverage(stage.label, answered);
            return (
              <div
                key={stage.label}
                className={`absolute top-0 ${i > 0 ? "border-l border-grey-20" : ""}`}
                style={{ left, width, height: STUDENT_RIBBON_H }}
              >
                <div
                  style={{ position: "sticky", left: LABEL_W + 8, width: "fit-content" }}
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => onExpandStage(stage.label)}
                    className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors ${FOCUS_RING} ${
                      isOpen
                        ? "bg-tint-blue text-rmit-blue"
                        : "text-grey-80 hover:bg-grey-10"
                    }`}
                    style={{ marginTop: (STUDENT_RIBBON_H - 28) / 2 }}
                  >
                    <span className="font-semibold whitespace-nowrap">
                      {cov.answered}/{cov.total}
                    </span>
                    <CoverageDots stage={stage.label} questions={questions} />
                    <ChevronDown
                      size={13}
                      strokeWidth={2.5}
                      className={`shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                      aria-hidden
                    />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Detail panel — full width, only for the open stage */}
          {openStage && (
            <div
              className="absolute inset-x-0 border-t border-grey-20 bg-surface/50"
              style={{ top: STUDENT_RIBBON_H, height: STUDENT_DETAIL_H }}
            >
              <div
                className="flex gap-5 px-2.5 py-3"
                style={{
                  position: "sticky",
                  left: LABEL_W + 8,
                  maxWidth: `min(920px, calc(100vw - ${LABEL_W + 32}px))`,
                  height: STUDENT_DETAIL_H,
                }}
              >
                {/* Voice — the student, in full */}
                <div className="w-64 shrink-0 overflow-y-auto border-r border-grey-20 pr-5">
                  <span className={`text-rmit-blue ${EYEBROW}`}>{openStage.label}</span>
                  <p className="mt-1.5 text-xs leading-snug text-grey-90">
                    {(() => {
                      const v = stageVoice(openStage.label);
                      return v ? `“${v}”` : null;
                    })()}
                  </p>
                </div>

                {/* Questions — flow across the available width */}
                <ul
                  className="grid min-w-0 flex-1 content-start gap-x-5 gap-y-1.5 overflow-y-auto"
                  style={{ gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))" }}
                >
                  {stageDisplayQuestions(openStage.label).map((q) => (
                    <QuestionCell
                      key={q}
                      stage={openStage.label}
                      question={q}
                      active={
                        activeQuestion?.stage === openStage.label &&
                        activeQuestion?.question === q
                      }
                      onHoverQuestion={onHoverQuestion}
                      onPinQuestion={onPinQuestion}
                    />
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Sticky gutter label ── */}
      <div
        className="sticky left-0 h-full border-r border-b border-grey-30 bg-card"
        style={{ width: LABEL_W }}
      >
        <div className="flex h-full flex-col justify-center px-4 py-2">
          <span className={`text-rmit-blue ${EYEBROW}`}>Student view</span>
          <span className="mt-0.5 hidden text-xs leading-snug text-grey-70 sm:block">
            What they ask — and whether a touchpoint answers it
          </span>
        </div>
      </div>
    </div>
  );
}

/** A question in the detail grid: coverage dot + text. Answered ones are a
 *  button that lights their comms on hover; unanswered stay plain. */
function QuestionCell({
  stage,
  question,
  active,
  onHoverQuestion,
  onPinQuestion,
}: {
  stage: string;
  question: string;
  active: boolean;
  onHoverQuestion: (q: QuestionRef | null) => void;
  onPinQuestion: (q: QuestionRef) => void;
}) {
  const isAnswered = answered(stage, question);
  const count = linkedCommIds(stage, question).length;

  return (
    <li className="flex items-start gap-1.5 text-xs leading-snug">
      <span className="mt-0.5 shrink-0">
        <Dot filled={isAnswered} />
      </span>
      {isAnswered ? (
        <button
          type="button"
          aria-pressed={active}
          title={`${count} touchpoint${count === 1 ? "" : "s"} answer this — hover to highlight`}
          onMouseEnter={() => onHoverQuestion({ stage, question })}
          onMouseLeave={() => onHoverQuestion(null)}
          onFocus={() => onHoverQuestion({ stage, question })}
          onBlur={() => onHoverQuestion(null)}
          onClick={(e) => {
            e.stopPropagation();
            onPinQuestion({ stage, question });
          }}
          className={`rounded text-left transition-colors ${FOCUS_RING} ${
            active ? "text-rmit-blue" : "text-grey-90 hover:text-rmit-blue-interactive"
          }`}
        >
          {question}
        </button>
      ) : (
        <span className="text-grey-60" title="No touchpoint answers this yet">
          {question}
        </span>
      )}
    </li>
  );
}

/** A row of coverage dots — one per shown question, filled if answered. */
function CoverageDots({ stage, questions }: { stage: string; questions: string[] }) {
  return (
    <span className="flex items-center gap-1" aria-hidden>
      {questions.map((q) => (
        <Dot key={q} filled={answered(stage, q)} />
      ))}
    </span>
  );
}

/** Filled = answered, hollow = not answered yet. Shape carries it, not colour. */
function Dot({ filled = false }: { filled?: boolean }) {
  return filled ? (
    <span className="inline-block h-2 w-2 rounded-full bg-rmit-blue-interactive" />
  ) : (
    <Circle size={8} strokeWidth={2} className="text-grey-40" aria-hidden />
  );
}
