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
  /** click a bubble to open its detail panel */
  onOpenQuestion: (q: QuestionRef) => void;
}

/** The student swimlane — the students' questions as small speech bubbles,
 *  placed along the timeline where they arise. Hover an answered one and the
 *  touchpoints that answer it stay lit while the rest of the map dims (the
 *  spotlight). A question no touchpoint answers is a dashed thought bubble —
 *  an open question, still waiting for a touchpoint. Click any bubble for its
 *  detail panel. */
export function StudentJourneyLane({
  activeQuestion,
  onHoverQuestion,
  onPinQuestion,
  onOpenQuestion,
}: Props) {
  // Recomputed every render so bubble x-positions track the current zoom
  // (a zoomed month changes scaleX; a stale layout would drift off the stage
  // separators). Cheap — ~37 bubbles.
  const bubbles = bubbleLayout();

  return (
    // z above the header rows below it so a bubble's tooltip paints over the
    // School year / Month rows instead of being clipped by them.
    <div className="relative z-[45]" style={{ height: STUDENT_LANE_H }}>
      {/* ── Canvas side ── */}
      <div className="absolute top-0" style={{ left: LABEL_W, width: TOTAL_W, height: STUDENT_LANE_H }}>
        <div className="relative h-full bg-card">
          {/* stage separators — group the bubbles by journey stage */}
          {STAGES.map((s, i) =>
            i === 0 ? null : (
              <div
                key={s.label}
                className="absolute top-0 bottom-0 border-l border-grey-30"
                style={{ left: scaleX(s.from) }}
                aria-hidden
              />
            ),
          )}

          {bubbles.map((b) => {
            const active =
              activeQuestion?.stage === b.stage && activeQuestion?.question === b.question;
            const box = { left: b.x, top: b.y, width: b.w, height: b.h } as const;
            const ref = { stage: b.stage, question: b.question };

            // Open question — no touchpoint answers it yet. A dashed thought
            // bubble with a little trailing tail; interactive (tooltip + panel)
            // so it never reads as "disabled", but it doesn't fire the spotlight
            // (there's nothing to light, and an empty focus would dim the map).
            if (!b.answered) {
              return (
                <button
                  key={`${b.stage}-${b.question}`}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenQuestion(ref);
                  }}
                  className={`group absolute flex items-center rounded-full border border-dashed border-grey-40 bg-grey-10 px-2 text-[11px] leading-none text-grey-70 transition-colors hover:border-grey-50 hover:bg-grey-20 ${FOCUS_RING}`}
                  style={box}
                >
                  <span className="truncate">{b.label}</span>
                  {/* thought-bubble trailing dots */}
                  <span className="absolute -bottom-[3px] left-2.5 h-1 w-1 rounded-full border border-grey-40 bg-grey-10" aria-hidden />
                  <span className="absolute -bottom-[6px] left-1.5 h-[3px] w-[3px] rounded-full border border-grey-40 bg-grey-10" aria-hidden />
                  <Tip text={b.question} muted />
                </button>
              );
            }

            return (
              <button
                key={`${b.stage}-${b.question}`}
                type="button"
                aria-pressed={active}
                onMouseEnter={() => onHoverQuestion(ref)}
                onMouseLeave={() => onHoverQuestion(null)}
                onFocus={() => onHoverQuestion(ref)}
                onBlur={() => onHoverQuestion(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  onPinQuestion(ref);
                  onOpenQuestion(ref);
                }}
                className={`group absolute flex items-center rounded-lg border px-2 text-[11px] leading-none transition-colors ${FOCUS_RING} ${
                  active
                    ? "border-blue-highlight bg-tint-blue text-blue-highlight"
                    : "border-blue-highlight/40 bg-card text-grey-90 hover:border-blue-highlight hover:bg-tint-blue/40"
                }`}
                style={box}
              >
                <span className="truncate">{b.label}</span>
                {/* speech-bubble tail */}
                <span
                  className={`absolute -bottom-[3px] left-3 h-1.5 w-1.5 rotate-45 border-r border-b transition-colors ${
                    active
                      ? "border-blue-highlight bg-tint-blue"
                      : "border-blue-highlight/40 bg-card group-hover:border-blue-highlight group-hover:bg-tint-blue/40"
                  }`}
                  aria-hidden
                />
                <Tip text={b.question} />
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

/** The full question, in the app's tooltip style. Sits below the bubble (the
 *  swimlane hugs the top of the map, so above would clip). */
function Tip({ text, muted = false }: { text: string; muted?: boolean }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute top-full left-0 z-50 mt-1.5 hidden w-max max-w-[240px] rounded-md bg-tooltip px-2 py-1 text-[11px] leading-snug font-normal whitespace-normal text-white shadow-md group-hover:block"
    >
      {muted && <span className="mb-0.5 block text-[10px] text-white/60">No touchpoint answers this yet</span>}
      {text}
    </span>
  );
}
