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
}

/** The student swimlane — the students' questions as speech-box cards, packed
 *  and stacked like the touchpoint cards below. Hover an answered card and the
 *  touchpoints that answer it stay lit while the rest of the map dims (the
 *  spotlight). A question no touchpoint answers is a dashed card — an open
 *  question, still waiting for a touchpoint. Click any card for its panel. */
export function StudentJourneyLane({
  activeQuestion,
  onHoverQuestion,
  onPinQuestion,
  onOpenQuestion,
}: Props) {
  // Recomputed each render so card x-positions track the current zoom.
  const cards = bubbleLayout();

  return (
    <div className="relative z-[45]" style={{ height: STUDENT_LANE_H }}>
      {/* ── Canvas side ── */}
      <div className="absolute top-0" style={{ left: LABEL_W, width: TOTAL_W, height: STUDENT_LANE_H }}>
        <div className="relative h-full bg-card">
          {/* stage separators — group the cards by journey stage */}
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
            const base =
              "group absolute flex overflow-hidden rounded-lg border px-2 py-1.5 text-left text-[11px] leading-snug transition-colors";

            // Open question — no touchpoint answers it yet. A dashed card;
            // interactive (opens the panel) but it doesn't fire the spotlight
            // (nothing to light, and an empty focus would dim the whole map).
            if (!c.answered) {
              return (
                <button
                  key={`${c.stage}-${c.question}`}
                  type="button"
                  title={c.question}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenQuestion(ref);
                  }}
                  className={`${base} ${FOCUS_RING} border-dashed border-grey-40 bg-grey-10 text-grey-70 hover:border-grey-50 hover:bg-grey-20`}
                  style={box}
                >
                  <span className="line-clamp-3">{c.question}</span>
                </button>
              );
            }

            return (
              <button
                key={`${c.stage}-${c.question}`}
                type="button"
                aria-pressed={active}
                title={c.question}
                onMouseEnter={() => onHoverQuestion(ref)}
                onMouseLeave={() => onHoverQuestion(null)}
                onFocus={() => onHoverQuestion(ref)}
                onBlur={() => onHoverQuestion(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  onPinQuestion(ref);
                  onOpenQuestion(ref);
                }}
                className={`${base} ${FOCUS_RING} ${
                  active
                    ? "border-blue-highlight bg-tint-blue text-blue-highlight"
                    : "border-blue-highlight/40 bg-card text-grey-90 hover:border-blue-highlight hover:bg-tint-blue/40"
                }`}
                style={box}
              >
                <span className="line-clamp-3">{c.question}</span>
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
