import { useMemo } from "react";
import type { Comm } from "../data/types";
import { bubbleLayout } from "../lib/studentBubbles";
import { LABEL_W, STUDENT_LANE_H, TOTAL_W } from "../lib/scale";
import { EYEBROW, FOCUS_RING } from "../lib/styles";
import { StudentThreadLayer } from "./StudentThreadLayer";

export interface QuestionRef {
  stage: string;
  question: string;
}

interface Props {
  /** question currently driving the cross-highlight (hover or pin) */
  activeQuestion: QuestionRef | null;
  onHoverQuestion: (q: QuestionRef | null) => void;
  onPinQuestion: (q: QuestionRef) => void;
  comms: Comm[];
  hiddenIds: Set<string>;
  collapsedLanes: Set<string>;
}

/** The student swimlane — the students' questions as small speech bubbles,
 *  placed along the timeline where they arise. Hover an answered one and a
 *  connector arcs down to the touchpoint(s) that answer it. A question with no
 *  touchpoint is a dashed thought bubble — a visible gap, nothing to connect. */
export function StudentJourneyLane({
  activeQuestion,
  onHoverQuestion,
  onPinQuestion,
  comms,
  hiddenIds,
  collapsedLanes,
}: Props) {
  const bubbles = useMemo(() => bubbleLayout(), [comms]);

  return (
    <div className="relative z-30" style={{ height: STUDENT_LANE_H }}>
      {/* ── Canvas side ── */}
      <div className="absolute top-0" style={{ left: LABEL_W, width: TOTAL_W, height: STUDENT_LANE_H }}>
        <div className="relative h-full border-b border-grey-30 bg-card">
          {/* connectors first, so bubbles sit over their anchor dots */}
          <StudentThreadLayer
            activeQuestion={activeQuestion}
            bubbles={bubbles}
            comms={comms}
            hiddenIds={hiddenIds}
            collapsedLanes={collapsedLanes}
          />

          {bubbles.map((b) => {
            const active =
              activeQuestion?.stage === b.stage && activeQuestion?.question === b.question;
            const box = {
              left: b.x,
              top: b.y,
              width: b.w,
              height: b.h,
            } as const;

            // A question with no touchpoint: a dashed thought bubble. Not
            // interactive — there's nothing to light up, and firing the focus
            // with an empty set would just dim the whole map.
            if (!b.answered) {
              return (
                <div
                  key={`${b.stage}-${b.question}`}
                  className="absolute flex items-center rounded-full border border-dashed border-grey-40 bg-grey-10 px-2 text-[11px] leading-none text-grey-60"
                  style={box}
                  title={`${b.question} — no touchpoint answers this yet`}
                >
                  <span className="truncate">{b.label}</span>
                </div>
              );
            }

            return (
              <button
                key={`${b.stage}-${b.question}`}
                type="button"
                aria-pressed={active}
                title={b.question}
                onMouseEnter={() => onHoverQuestion({ stage: b.stage, question: b.question })}
                onMouseLeave={() => onHoverQuestion(null)}
                onFocus={() => onHoverQuestion({ stage: b.stage, question: b.question })}
                onBlur={() => onHoverQuestion(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  onPinQuestion({ stage: b.stage, question: b.question });
                }}
                className={`group absolute flex items-center rounded-lg border px-2 text-[11px] leading-none transition-colors ${FOCUS_RING} ${
                  active
                    ? "border-rmit-blue-interactive bg-tint-blue text-rmit-blue-interactive"
                    : "border-rmit-blue-interactive/40 bg-card text-grey-90 hover:border-rmit-blue-interactive hover:bg-tint-blue/40"
                }`}
                style={box}
              >
                <span className="truncate">{b.label}</span>
                {/* speech-bubble tail, pointing down toward its touchpoints */}
                <span
                  className={`absolute -bottom-[3px] left-3 h-1.5 w-1.5 rotate-45 border-r border-b transition-colors ${
                    active
                      ? "border-rmit-blue-interactive bg-tint-blue"
                      : "border-rmit-blue-interactive/40 bg-card group-hover:border-rmit-blue-interactive group-hover:bg-tint-blue/40"
                  }`}
                  aria-hidden
                />
              </button>
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
            Their questions — hover one to see the touchpoints that answer it
          </span>
        </div>
      </div>
    </div>
  );
}
