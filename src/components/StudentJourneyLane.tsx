import { ChevronDown, Circle } from "lucide-react";
import { STAGES } from "../data/journey";
import { linkedCommIds } from "../data/studentExperience";
import { stageCoverage, stageDisplayQuestions, stageVoice } from "../data/studentView";
import { LABEL_W, STUDENT_LANE_H, TOTAL_W, scaleX } from "../lib/scale";
import { EYEBROW, FOCUS_RING } from "../lib/styles";

export interface QuestionRef {
  stage: string;
  question: string;
}

interface Props {
  /** stage whose questions are unfolded (accordion); null = coverage only */
  expandedStage: string | null;
  onExpandStage: (stage: string) => void;
  /** question currently driving the cross-highlight (hover or pin) */
  activeQuestion: QuestionRef | null;
  onHoverQuestion: (q: QuestionRef | null) => void;
  onPinQuestion: (q: QuestionRef) => void;
}

const answered = (stage: string, q: string) => linkedCommIds(stage, q).length > 0;

/** The student view — the map from the student's side. Each stage shows the
 *  persona's own words and a small read-out of how many of their top questions
 *  a touchpoint answers (a filled dot = answered, a hollow dot = a gap we
 *  haven't closed). Open a stage to read the questions; hovering an answered
 *  one lights its comms in place. Only one stage opens at a time, so it never
 *  becomes a wall of text. */
export function StudentJourneyLane({
  expandedStage,
  onExpandStage,
  activeQuestion,
  onHoverQuestion,
  onPinQuestion,
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
            const questions = stageDisplayQuestions(stage.label);
            if (questions.length === 0) return null;
            const left = scaleX(stage.from);
            const width = scaleX(stage.to) - left;
            const isOpen = expandedStage === stage.label;
            const voice = stageVoice(stage.label);
            const cov = stageCoverage(stage.label, answered);
            return (
              <div
                key={stage.label}
                className={`absolute top-0 h-full ${i > 0 ? "border-l border-grey-20" : ""} ${
                  isOpen ? "bg-tint-blue/20" : ""
                }`}
                style={{ left, width }}
              >
                <div
                  className="flex h-full flex-col"
                  style={{
                    position: "sticky",
                    left: LABEL_W + 8,
                    maxWidth: Math.max(Math.min(width - 10, 360), 150),
                  }}
                >
                  {/* Accordion header — voice + coverage; click to open/close */}
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => onExpandStage(stage.label)}
                    className={`shrink-0 px-2.5 pt-2.5 pb-2 text-left transition-colors ${FOCUS_RING} ${
                      isOpen ? "" : "hover:bg-grey-10/60"
                    }`}
                  >
                    {voice && (
                      <p className="line-clamp-2 border-l-2 border-rmit-blue/40 pl-2 text-xs leading-snug text-grey-80">
                        {`“${voice}”`}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs font-semibold text-grey-90">
                        {cov.answered}/{cov.total}
                      </span>
                      <CoverageDots stage={stage.label} questions={questions} />
                    </div>
                    <div className="mt-1.5 flex items-center gap-1 text-xs text-rmit-blue-interactive">
                      <ChevronDown
                        size={13}
                        strokeWidth={2.5}
                        className={`shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                        aria-hidden
                      />
                      {isOpen ? "Hide questions" : `${questions.length} questions`}
                    </div>
                  </button>

                  {/* Questions — only for the open stage; scrolls if long */}
                  {isOpen && (
                    <div className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-4">
                      <ul className="flex flex-col gap-0.5">
                        {questions.map((q) => (
                          <QuestionRow
                            key={q}
                            stage={stage.label}
                            question={q}
                            active={
                              activeQuestion?.stage === stage.label &&
                              activeQuestion?.question === q
                            }
                            onHoverQuestion={onHoverQuestion}
                            onPinQuestion={onPinQuestion}
                          />
                        ))}
                      </ul>
                    </div>
                  )}
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
        <div className="flex h-full flex-col justify-center px-4">
          <span className={`text-rmit-blue ${EYEBROW}`}>Student view</span>
          <span className="mt-0.5 text-xs leading-snug text-grey-70">
            What they ask — and whether a touchpoint answers it
          </span>
          <div className="mt-2 flex flex-col gap-1 text-xs text-grey-60">
            <span className="flex items-center gap-1.5">
              <Dot filled />
              answered
            </span>
            <span className="flex items-center gap-1.5">
              <Dot />
              not answered yet
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** A single question: coverage dot + text. Answered ones are a button that
 *  lights their comms on hover; unanswered ones stay plain (nothing to show). */
function QuestionRow({
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
    <li>
      <div
        className={`flex items-start gap-1.5 rounded-md px-1.5 py-1 text-xs transition-colors ${
          active ? "bg-tint-blue/60" : ""
        }`}
      >
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
            className={`flex-1 rounded text-left leading-snug transition-colors ${FOCUS_RING} ${
              active ? "text-rmit-blue" : "text-grey-90 hover:text-rmit-blue-interactive"
            }`}
          >
            {question}
          </button>
        ) : (
          <span
            className="flex-1 leading-snug text-grey-60"
            title="No touchpoint answers this yet"
          >
            {question}
          </span>
        )}
      </div>
    </li>
  );
}

/** A row of coverage dots — one per shown question, filled if answered. */
function CoverageDots({ stage, questions }: { stage: string; questions: string[] }) {
  return (
    <span className="flex flex-wrap items-center gap-1" aria-hidden>
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
