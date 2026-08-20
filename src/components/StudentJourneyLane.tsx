import { useEffect, useState } from "react";
import { AlertTriangle, ChevronDown, Circle, Info, Triangle } from "lucide-react";
import { STAGES } from "../data/journey";
import { linkedCommIds, stageQuestions } from "../data/studentExperience";
import {
  TIER_LABEL,
  questionEvidence,
  stageCoverage,
  stageEvidence,
  stageVoice,
} from "../data/studentEvidence";
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

/** The student view — coverage first, calm at rest. Each stage shows only the
 *  persona's own words and a coverage read-out (how many of its questions a
 *  touchpoint actually answers). Open one stage to read its questions, each
 *  carrying a filled/hollow dot (answered vs gap) and its evidence one click
 *  away. Only one stage is open at a time, so the band never becomes a wall of
 *  text. Nothing here is a filter — it's the map's report card against what
 *  students need. */
export function StudentJourneyLane({
  expandedStage,
  onExpandStage,
  activeQuestion,
  onHoverQuestion,
  onPinQuestion,
}: Props) {
  const [openEvidence, setOpenEvidence] = useState<string | null>(null);
  // A newly opened stage starts with no evidence panel showing.
  useEffect(() => setOpenEvidence(null), [expandedStage]);

  return (
    <div className="relative z-30" style={{ height: STUDENT_LANE_H }}>
      {/* ── Canvas side ── */}
      <div className="absolute top-0" style={{ left: LABEL_W, width: TOTAL_W }}>
        <div
          className="relative border-b border-grey-30 bg-card"
          style={{ height: STUDENT_LANE_H }}
        >
          {STAGES.map((stage, i) => {
            const questions = stageQuestions(stage.label);
            if (questions.length === 0) return null;
            const left = scaleX(stage.from);
            const width = scaleX(stage.to) - left;
            const isOpen = expandedStage === stage.label;
            const voice = stageVoice(stage.label);
            const cov = stageCoverage(stage.label, answered);
            const { gap } = stageEvidence(stage.label);
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
                      {gap && !isOpen && (
                        <AlertTriangle
                          size={11}
                          strokeWidth={2}
                          className="ml-0.5 shrink-0 text-amber"
                          aria-label="Directional evidence only"
                        />
                      )}
                    </div>
                  </button>

                  {/* Questions — only for the open stage; scrolls if long */}
                  {isOpen && (
                    <div className="min-h-0 flex-1 overflow-y-auto px-2.5 pb-4">
                      {gap && (
                        <p className="mb-1.5 flex items-start gap-1 text-xs leading-snug text-amber">
                          <AlertTriangle size={11} strokeWidth={2} className="mt-px shrink-0" aria-hidden />
                          Directional — proxy data, no direct VOC for this stage.
                        </p>
                      )}
                      <ul className="flex flex-col gap-0.5">
                        {questions.map((q) => {
                          const key = `${stage.label}::${q}`;
                          return (
                            <QuestionRow
                              key={q}
                              stage={stage.label}
                              question={q}
                              active={
                                activeQuestion?.stage === stage.label &&
                                activeQuestion?.question === q
                              }
                              evidenceOpen={openEvidence === key}
                              onToggleEvidence={() =>
                                setOpenEvidence((cur) => (cur === key ? null : key))
                              }
                              onHoverQuestion={onHoverQuestion}
                              onPinQuestion={onPinQuestion}
                            />
                          );
                        })}
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
              gap — nothing mapped yet
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** A single question: coverage dot + text (answered ones light their comms) +
 *  an evidence disclosure that expands in place (no overlay, no clipping). */
function QuestionRow({
  stage,
  question,
  active,
  evidenceOpen,
  onToggleEvidence,
  onHoverQuestion,
  onPinQuestion,
}: {
  stage: string;
  question: string;
  active: boolean;
  evidenceOpen: boolean;
  onToggleEvidence: () => void;
  onHoverQuestion: (q: QuestionRef | null) => void;
  onPinQuestion: (q: QuestionRef) => void;
}) {
  const isAnswered = answered(stage, question);
  const count = linkedCommIds(stage, question).length;
  const { origin, tier } = questionEvidence(stage, question);
  const triangulated = tier === "triangulated";

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

        {triangulated && (
          <Triangle
            size={9}
            strokeWidth={2.5}
            className="mt-1 shrink-0 fill-rmit-blue text-rmit-blue"
            aria-label="Triangulated evidence"
          />
        )}

        <button
          type="button"
          aria-expanded={evidenceOpen}
          aria-label={`Evidence for “${question}”`}
          onClick={onToggleEvidence}
          className={`mt-0.5 shrink-0 rounded-full p-0.5 transition-colors ${FOCUS_RING} ${
            evidenceOpen
              ? "bg-tint-blue text-rmit-blue-interactive"
              : "text-grey-50 hover:bg-grey-10 hover:text-grey-70"
          }`}
        >
          <Info size={12} strokeWidth={2} aria-hidden />
        </button>
      </div>

      {evidenceOpen && (
        <EvidencePanel
          stage={stage}
          origin={origin}
          tier={tier}
          answered={isAnswered}
          count={count}
        />
      )}
    </li>
  );
}

/** Inline evidence disclosure: tier, origin, and the sources behind the stage. */
function EvidencePanel({
  stage,
  origin,
  tier,
  answered: isAnswered,
  count,
}: {
  stage: string;
  origin: "team" | "derived";
  tier: keyof typeof TIER_LABEL;
  answered: boolean;
  count: number;
}) {
  const { sources } = stageEvidence(stage);
  const tierTone =
    tier === "triangulated" || tier === "evidenced"
      ? "bg-tint-blue text-rmit-blue-interactive"
      : tier === "directional"
        ? "bg-tint-amber text-amber"
        : "bg-grey-10 text-grey-70";
  return (
    <div className="mt-0.5 mb-1 ml-5 rounded-md border border-grey-20 bg-surface px-2.5 py-2 text-xs leading-snug">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={`rounded-full px-1.5 py-0.5 font-medium ${tierTone}`}>
          {TIER_LABEL[tier]}
        </span>
        <span className="rounded-full bg-grey-10 px-1.5 py-0.5 text-grey-70">
          {origin === "team" ? "From the team's map" : "Derived from data"}
        </span>
      </div>
      <p className="mt-1.5 text-grey-70">
        {isAnswered
          ? `${count} touchpoint${count === 1 ? "" : "s"} mapped to this question.`
          : "No touchpoint mapped to this question yet."}
      </p>
      {sources.length > 0 && (
        <ul className="mt-1.5 flex flex-col gap-1.5 border-t border-grey-20 pt-1.5">
          {sources.map((s) => (
            <li key={s.label}>
              <span className="font-medium text-grey-90">{s.label}</span>
              <span className="text-grey-70"> — {s.detail}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** A row of coverage dots — one per question, filled if answered. */
function CoverageDots({ stage, questions }: { stage: string; questions: string[] }) {
  return (
    <span className="flex flex-wrap items-center gap-1" aria-hidden>
      {questions.map((q) => (
        <Dot key={q} filled={answered(stage, q)} />
      ))}
    </span>
  );
}

/** Filled = answered, hollow = gap. Shape carries the meaning, not colour. */
function Dot({ filled = false }: { filled?: boolean }) {
  return filled ? (
    <span className="inline-block h-2 w-2 rounded-full bg-rmit-blue-interactive" />
  ) : (
    <Circle size={8} strokeWidth={2} className="text-grey-40" aria-hidden />
  );
}
