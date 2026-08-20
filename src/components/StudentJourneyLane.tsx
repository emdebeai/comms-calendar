import { useState } from "react";
import { AlertTriangle, Circle, Info, Triangle } from "lucide-react";
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
  /** question currently driving the cross-highlight (hover or pin) */
  activeQuestion: QuestionRef | null;
  onHoverQuestion: (q: QuestionRef | null) => void;
  onPinQuestion: (q: QuestionRef) => void;
}

const answered = (stage: string, q: string) => linkedCommIds(stage, q).length > 0;

/** The student view — coverage first. Each stage opens with the persona's own
 *  words (the line of interaction), then a coverage read-out (how many of the
 *  stage's questions a touchpoint actually answers), then the questions. A
 *  filled dot = answered, a hollow dot = a gap we haven't closed yet — stated
 *  plainly, not flagged red. Hovering an answered question lights its comms in
 *  place. Every question carries its evidence one click away: who asked it (the
 *  team's map, or derived from data), how strong the backing is, and the
 *  sources behind the stage. Nothing here is a filter — it's the map's report
 *  card against what students need. */
export function StudentJourneyLane({
  activeQuestion,
  onHoverQuestion,
  onPinQuestion,
}: Props) {
  const [openEvidence, setOpenEvidence] = useState<string | null>(null);

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
            const voice = stageVoice(stage.label);
            const cov = stageCoverage(stage.label, answered);
            const { gap } = stageEvidence(stage.label);
            return (
              <div
                key={stage.label}
                className={`absolute top-0 h-full ${i > 0 ? "border-l border-grey-20" : ""}`}
                style={{ left, width }}
              >
                {/* Sticky-left so a wide stage's content stays in view while
                    scrolling through it. */}
                <div
                  className="relative h-full"
                  style={{
                    position: "sticky",
                    left: LABEL_W + 8,
                    maxWidth: Math.max(Math.min(width - 10, 380), 150),
                  }}
                >
                  <div className="h-full overflow-y-auto px-2.5 pt-2 pb-4">
                    {/* Line of interaction — the student's own words */}
                    {voice && (
                      <p className="border-l-2 border-rmit-blue/40 pl-2 text-xs leading-snug text-grey-90">
                        {`“${voice}”`}
                      </p>
                    )}

                    {/* Coverage read-out — the story in one glance */}
                    <div className="mt-2 flex items-center gap-2">
                      <CoverageDots stage={stage.label} questions={questions} />
                      <span className="shrink-0 text-xs font-medium text-grey-70">
                        {cov.answered}/{cov.total} answered
                      </span>
                    </div>

                    {gap && (
                      <p className="mt-1.5 flex items-start gap-1 text-xs leading-snug text-amber">
                        <AlertTriangle size={11} strokeWidth={2} className="mt-px shrink-0" aria-hidden />
                        Directional — proxy data, no direct VOC for this stage.
                      </p>
                    )}

                    {/* Questions */}
                    <ul className="mt-2.5 flex flex-col gap-1">
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
                  {/* soft fade hints "scroll for more" when content clips */}
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
        <div className="flex h-full flex-col justify-center px-4">
          <span className={`text-rmit-blue ${EYEBROW}`}>Student view</span>
          <span className="mt-0.5 text-xs leading-snug text-grey-70">
            What they ask — and whether a touchpoint answers it
          </span>
          <div className="mt-2.5 flex flex-col gap-1 text-xs text-grey-60">
            <span className="flex items-center gap-1.5">
              <Dot filled />
              answered
            </span>
            <span className="flex items-center gap-1.5">
              <Dot />
              gap — nothing mapped yet
            </span>
            <span className="flex items-center gap-1.5">
              <Info size={11} strokeWidth={2} className="shrink-0" aria-hidden />
              evidence behind each
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
    <div className="mt-1 ml-5 rounded-md border border-grey-20 bg-surface px-2.5 py-2 text-xs leading-snug">
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
