import { ChevronDown, ChevronRight, MessageSquare } from "lucide-react";
import { STAGES } from "../data/journey";
import { bubbleLayout } from "../lib/studentBubbles";
import { LABEL_W, STUDENT_LANE_H, TOTAL_W, scaleX } from "../lib/scale";
import { EYEBROW, FOCUS_RING } from "../lib/styles";

export interface QuestionRef {
  stage: string;
  question: string;
}

interface Props {
  /** collapsed = a strip of speech-bubble icons; expanded = full cards */
  collapsed: boolean;
  onToggleCollapse: () => void;
  /** question currently driving the spotlight (hover or pin) */
  activeQuestion: QuestionRef | null;
  onHoverQuestion: (q: QuestionRef | null) => void;
  onPinQuestion: (q: QuestionRef) => void;
  onOpenQuestion: (q: QuestionRef) => void;
  /** stage currently hovered in the stage bar — its questions light up */
  hoveredStage: string | null;
}

/** The student swimlane — a proper lane like the touchpoint lanes: expand to
 *  full speech-box cards, collapse to a strip of speech-bubble icons, or hide
 *  it entirely (the ✕ / dock toggle). Cards and icons stack and pack in time;
 *  hovering an answered one spotlights the touchpoints that answer it, and a
 *  hovered stage lights its own questions. Transparent so the moment context
 *  behind it stays visible. */
export function StudentJourneyLane({
  collapsed,
  onToggleCollapse,
  activeQuestion,
  onHoverQuestion,
  onPinQuestion,
  onOpenQuestion,
  hoveredStage,
}: Props) {
  const cards = bubbleLayout();

  return (
    <div className="relative z-[45]" style={{ height: STUDENT_LANE_H }}>
      {/* ── Canvas side (transparent — moment context shows through) ── */}
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
            const ref = { stage: c.stage, question: c.question };
            const stageDim = hoveredStage !== null && c.stage !== hoveredStage;
            const answered = c.answered;
            const handlers = {
              onMouseEnter: answered ? () => onHoverQuestion(ref) : undefined,
              onMouseLeave: answered ? () => onHoverQuestion(null) : undefined,
              onFocus: answered ? () => onHoverQuestion(ref) : undefined,
              onBlur: answered ? () => onHoverQuestion(null) : undefined,
              onClick: (e: React.MouseEvent) => {
                e.stopPropagation();
                if (answered) onPinQuestion(ref);
                onOpenQuestion(ref);
              },
            };

            // ── Collapsed: a small filled/outline speech-bubble icon ──
            if (collapsed) {
              return (
                <button
                  key={`${c.stage}-${c.question}`}
                  type="button"
                  aria-pressed={answered ? active : undefined}
                  aria-label={c.question}
                  title={c.question}
                  {...handlers}
                  className={`absolute flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-md transition-opacity ${FOCUS_RING} ${
                    stageDim ? "opacity-25" : ""
                  }`}
                  style={{ left: c.x + c.w / 2, top: (STUDENT_LANE_H - 24) / 2 }}
                >
                  <MessageSquare
                    size={18}
                    strokeWidth={2}
                    className={
                      answered
                        ? active
                          ? "fill-rmit-blue text-rmit-blue"
                          : "fill-rmit-blue-interactive text-rmit-blue-interactive hover:fill-rmit-blue hover:text-rmit-blue"
                        : "text-grey-40 hover:text-grey-60"
                    }
                    aria-hidden
                  />
                </button>
              );
            }

            // ── Expanded: a wrapped-text speech-box card ──
            const box = { left: c.x, top: c.y, width: c.w, height: c.h } as const;
            const shell =
              "group absolute flex rounded-xl border text-left text-[11px] leading-snug transition-opacity";
            const tone = !answered
              ? "border-dashed border-grey-40 bg-grey-10 text-grey-70 hover:border-grey-50 hover:bg-grey-20"
              : active
                ? "border-rmit-blue-interactive bg-tint-blue text-rmit-blue-interactive"
                : "border-rmit-blue-interactive/40 bg-card text-grey-90 hover:border-rmit-blue-interactive hover:bg-tint-blue/40";
            const tail = !answered
              ? "border-grey-40 bg-grey-10"
              : active
                ? "border-rmit-blue-interactive bg-tint-blue"
                : "border-rmit-blue-interactive/40 bg-card group-hover:border-rmit-blue-interactive group-hover:bg-tint-blue/40";
            return (
              <button
                key={`${c.stage}-${c.question}`}
                type="button"
                aria-pressed={answered ? active : undefined}
                title={c.question}
                {...handlers}
                className={`${shell} ${FOCUS_RING} ${tone} ${stageDim ? "opacity-25" : ""}`}
                style={box}
              >
                <span className="overflow-hidden px-2 py-1.5">
                  <span className="line-clamp-3">{c.question}</span>
                </span>
                <span
                  className={`pointer-events-none absolute -bottom-[4px] left-4 h-2 w-2 rotate-45 border-r border-b transition-colors ${tail}`}
                  aria-hidden
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Sticky gutter label + lane controls ── */}
      <div
        className="sticky left-0 h-full border-r border-grey-30 bg-card"
        style={{ width: LABEL_W }}
      >
        <div className="flex h-full flex-col justify-center px-4">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-expanded={!collapsed}
              aria-label={collapsed ? "Expand student questions" : "Collapse student questions"}
              title={collapsed ? "Expand" : "Collapse"}
              className={`shrink-0 rounded text-grey-60 hover:text-grey-90 ${FOCUS_RING}`}
            >
              {collapsed ? (
                <ChevronRight size={14} strokeWidth={2} aria-hidden />
              ) : (
                <ChevronDown size={14} strokeWidth={2} aria-hidden />
              )}
            </button>
            <span className={`text-rmit-blue ${EYEBROW}`}>Student view</span>
          </div>
          {!collapsed && (
            <span className="mt-0.5 text-xs leading-snug text-grey-70">
              Their questions — hover to spotlight the touchpoints that answer it
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
