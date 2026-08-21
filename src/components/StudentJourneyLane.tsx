import { STAGES } from "../data/journey";
import { bubbleLayout } from "../lib/studentBubbles";
import { LABEL_W, STUDENT_LANE_H, TOTAL_W, scaleX } from "../lib/scale";
import { EYEBROW, FOCUS_RING } from "../lib/styles";

export interface QuestionRef {
  stage: string;
  question: string;
}

interface Props {
  /** question currently driving the spotlight (hover or pin) */
  activeQuestion: QuestionRef | null;
  onHoverQuestion: (q: QuestionRef | null) => void;
  onPinQuestion: (q: QuestionRef) => void;
  /** click a card to open its detail panel */
  onOpenQuestion: (q: QuestionRef) => void;
  /** stage currently hovered in the stage bar — its questions light up */
  hoveredStage: string | null;
}

/** The student swimlane — the students' questions as speech-box cards, packed
 *  and stacked like the touchpoint cards below. Hover an answered card and the
 *  touchpoints that answer it stay lit while the rest of the map dims. Hover a
 *  stage in the bar above and that stage's questions light up (the rest dim).
 *  A question no touchpoint answers is a dashed card. Click any card for its
 *  panel. The band itself is transparent so the moment/embargo context behind
 *  it stays visible. */
export function StudentJourneyLane({
  activeQuestion,
  onHoverQuestion,
  onPinQuestion,
  onOpenQuestion,
  hoveredStage,
}: Props) {
  // Recomputed each render so card x-positions track the current zoom.
  const cards = bubbleLayout();

  return (
    <div className="relative z-[45]" style={{ height: STUDENT_LANE_H }}>
      {/* ── Canvas side (transparent — moment/embargo context shows through) ── */}
      <div className="absolute top-0" style={{ left: LABEL_W, width: TOTAL_W, height: STUDENT_LANE_H }}>
        <div className="relative h-full">
          {STAGES.map((s, i) =>
            i === 0 ? null : (
              <div
                key={s.label}
                className="absolute top-0 bottom-0 border-l border-grey-20"
                style={{ left: scaleX(s.from) }}
                aria-hidden
              />
            ),
          )}

          {cards.map((c) => {
            const active =
              activeQuestion?.stage === c.stage && activeQuestion?.question === c.question;
            const box = { left: c.x, top: c.y, width: c.w, height: c.h } as const;
            const ref = { stage: c.stage, question: c.question };
            // A hovered stage lights its own questions and dims the rest.
            const stageDim = hoveredStage !== null && c.stage !== hoveredStage;

            const shell =
              "group absolute flex rounded-xl border text-left text-[11px] leading-snug transition-opacity";
            const tone = !c.answered
              ? "border-dashed border-grey-40 bg-grey-10 text-grey-70 hover:border-grey-50 hover:bg-grey-20"
              : active
                ? "border-blue-highlight bg-tint-blue text-blue-highlight"
                : "border-blue-highlight/40 bg-card text-grey-90 hover:border-blue-highlight hover:bg-tint-blue/40";
            const tail = !c.answered
              ? "border-grey-40 bg-grey-10"
              : active
                ? "border-blue-highlight bg-tint-blue"
                : "border-blue-highlight/40 bg-card group-hover:border-blue-highlight group-hover:bg-tint-blue/40";

            const answered = c.answered;
            return (
              <button
                key={`${c.stage}-${c.question}`}
                type="button"
                aria-pressed={answered ? active : undefined}
                title={c.question}
                onMouseEnter={answered ? () => onHoverQuestion(ref) : undefined}
                onMouseLeave={answered ? () => onHoverQuestion(null) : undefined}
                onFocus={answered ? () => onHoverQuestion(ref) : undefined}
                onBlur={answered ? () => onHoverQuestion(null) : undefined}
                onClick={(e) => {
                  e.stopPropagation();
                  if (answered) onPinQuestion(ref);
                  onOpenQuestion(ref);
                }}
                className={`${shell} ${FOCUS_RING} ${tone} ${stageDim ? "opacity-25" : ""}`}
                style={box}
              >
                <span className="overflow-hidden px-2 py-1.5">
                  <span className="line-clamp-3">{c.question}</span>
                </span>
                {/* speech-bubble tail */}
                <span
                  className={`pointer-events-none absolute -bottom-[4px] left-4 h-2 w-2 rotate-45 border-r border-b transition-colors ${tail}`}
                  aria-hidden
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Sticky gutter label ── */}
      <div
        className="sticky left-0 h-full border-r border-grey-30 bg-card"
        style={{ width: LABEL_W }}
      >
        <div className="flex h-full flex-col justify-center px-4">
          <span className={`text-rmit-blue ${EYEBROW}`}>Student view</span>
          <span className="mt-0.5 text-xs leading-snug text-grey-70">
            Their questions — hover to spotlight the touchpoints that answer it
          </span>
        </div>
      </div>
    </div>
  );
}
