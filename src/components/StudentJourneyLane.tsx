import { useEffect, useReducer } from "react";
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
  // The packer measures text with canvas; if the webfont (Inter) lands after
  // first paint, re-run the layout once so slot heights match the real face
  // and stack gaps stay uniform.
  const [, fontsReady] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    let live = true;
    document.fonts?.ready.then(() => live && fontsReady());
    return () => {
      live = false;
    };
  }, []);

  const cards = bubbleLayout();

  return (
    // z-30 keeps the lane below the sticky header bands (z-40) so it scrolls
    // cleanly under them, and above the canvas moment windows (z-10) so the
    // cards stay clickable. Matches the stage row it hangs from.
    <div className="relative z-30" style={{ height: STUDENT_LANE_H }}>
      {/* ── Canvas side (transparent — moment context shows through) ── */}
      <div className="absolute top-0" style={{ left: LABEL_W, width: TOTAL_W, height: STUDENT_LANE_H }}>
        <div className="relative h-full">
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
            // No fixed height — the card hugs its full (untruncated) text; the
            // packer reserved a tall-enough slot so it never overlaps below.
            const box = { left: c.x, top: c.y, width: c.w } as const;
            // text-xs leading-tight — the comm cards' title type, exactly.
            const shell =
              "group absolute block rounded-xl border px-2 py-1.5 text-left text-xs leading-tight transition-opacity";
            // Answered questions carry the touchpoint cards' title weight
            // (font-semibold); open questions stay lighter, so weight itself
            // signals "this one is answered".
            const tone = !answered
              ? "border-dashed border-grey-40 bg-grey-10 text-grey-70 hover:border-grey-50 hover:bg-grey-20"
              : active
                ? "font-semibold border-rmit-blue-interactive bg-tint-blue text-rmit-blue-interactive"
                : "font-semibold border-rmit-blue-interactive/40 bg-card text-grey-90 hover:border-rmit-blue-interactive hover:bg-tint-blue/40";
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
                {c.question}
                <span
                  className={`pointer-events-none absolute -bottom-[4px] left-4 h-2 w-2 rotate-45 border-r border-b transition-colors ${tail}`}
                  aria-hidden
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Sticky gutter label — the whole block toggles collapse, matching
          the touchpoint lanes' gutters (same padding, chevron, hover). ── */}
      <button
        type="button"
        onClick={onToggleCollapse}
        aria-expanded={!collapsed}
        aria-label={collapsed ? "Expand student questions" : "Collapse student questions"}
        className={`sticky left-0 flex h-full w-full flex-col py-2.5 border-r border-b border-grey-30 bg-card px-4 text-left hover:bg-grey-20 ${FOCUS_RING}`}
        style={{ width: LABEL_W }}
      >
        <span className="flex items-center gap-1.5">
          {collapsed ? (
            <ChevronRight size={13} strokeWidth={2} className="text-grey-60" aria-hidden />
          ) : (
            <ChevronDown size={13} strokeWidth={2} className="text-grey-60" aria-hidden />
          )}
          <span className={`text-grey-90 ${EYEBROW}`}>Student questions</span>
        </span>
      </button>
    </div>
  );
}
