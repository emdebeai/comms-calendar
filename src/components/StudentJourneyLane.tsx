import { useEffect, useReducer } from "react";
import { CheckCircle2, ChevronDown, ChevronRight, MessageSquare } from "lucide-react";
import { STAGES } from "../data/journey";
import { bubbleLayout } from "../lib/studentBubbles";
import { FONT_PX } from "../lib/packStudent";
import { LABEL_W, STUDENT_LANE_H, TOTAL_W, scaleX } from "../lib/scale";
import { EYEBROW, FOCUS_RING } from "../lib/styles";

export interface QuestionRef {
  stage: string;
  question: string;
}

/** A stage wider than this (a "massive" stage like Consider / Understand, or
 *  any stage once its months are zoomed) pins its card cluster to the left
 *  edge on scroll, so its questions stay in view instead of parking at the
 *  far-left of a huge empty band. */
const STICKY_STAGE_W = 560;

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

  // Render one card at an x RELATIVE to its stage container (so a stage's cards
  // can be wrapped in a sticky cluster). Everything else — hover/pin/open,
  // tone, spotlight dim — is unchanged.
  const renderCard = (c: (typeof cards)[number], x: number) => {
    const active = activeQuestion?.stage === c.stage && activeQuestion?.question === c.question;
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
            stageDim ? "opacity-[0.15]" : ""
          }`}
          style={{ left: x + c.w / 2, top: (STUDENT_LANE_H - 24) / 2 }}
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
    // No fixed height — the card hugs its full (untruncated) text; the layout
    // reserved a tall-enough slot so it never overlaps below. Font size comes
    // from FONT_PX (bumped in print) so screen matches the comm-card title type
    // and print reads larger — the layout measured at the same size.
    const shell =
      "group absolute block rounded-xl border px-2 py-1.5 text-left leading-tight transition-opacity";
    // ANSWERED reads as answered: blue-tinted fill at rest, a check mark, the
    // speech tail (someone speaks back), semibold, hover invitation. A GAP
    // reads as a quiet open note: dashed outline, muted regular text, NO tail
    // and NO hover feedback — still clickable for its sources, but it doesn't
    // advertise itself.
    const tone = !answered
      ? "cursor-default border-dashed border-grey-60 bg-grey-10 text-grey-70"
      : active
        ? "font-semibold border-rmit-blue-interactive bg-tint-blue text-rmit-blue-interactive"
        : "font-semibold border-rmit-blue-interactive/50 bg-tint-blue/50 text-grey-90 hover:border-rmit-blue-interactive hover:bg-tint-blue";
    const tail = active
      ? "border-rmit-blue-interactive bg-tint-blue"
      : "border-rmit-blue-interactive/50 bg-tint-blue/50 group-hover:border-rmit-blue-interactive group-hover:bg-tint-blue";
    return (
      <button
        key={`${c.stage}-${c.question}`}
        type="button"
        aria-pressed={answered ? active : undefined}
        title={answered ? `${c.question} — answered by linked touchpoints` : `${c.question} — no touchpoint answers this yet`}
        {...handlers}
        className={`${shell} ${FOCUS_RING} ${tone} ${stageDim ? "opacity-[0.15]" : ""}`}
        style={{ left: x, top: c.y, width: c.w, fontSize: FONT_PX }}
      >
        {answered ? (
          <span className="flex items-start gap-1">
            <CheckCircle2
              size={13}
              strokeWidth={2.25}
              className={`mt-[1.5px] shrink-0 ${active ? "text-rmit-blue-interactive" : "text-rmit-blue-interactive/80"}`}
              aria-hidden
            />
            <span>{c.question}</span>
          </span>
        ) : (
          c.question
        )}
        {answered && (
          <span
            className={`pointer-events-none absolute -bottom-[4px] left-4 h-2 w-2 rotate-45 border-r border-b transition-colors ${tail}`}
            aria-hidden
          />
        )}
      </button>
    );
  };

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

          {/* Cards are grouped per stage. A stage whose span is wider than the
              viewport-ish threshold (a "massive" stage like Consider/Understand,
              or any stage once its months are zoomed) gets its cluster pinned to
              the left edge with position:sticky — so scrolling through it keeps
              the questions in view instead of parking them at the far-left of a
              huge empty band. Card x is made relative to the stage container. */}
          {STAGES.map((stage) => {
            const stageCards = cards.filter((c) => c.stage === stage.label);
            if (stageCards.length === 0) return null;
            const sLeft = scaleX(stage.from);
            const sWidth = scaleX(stage.to) - sLeft;
            const wide = sWidth > STICKY_STAGE_W;
            const clusterW = Math.max(...stageCards.map((c) => c.x - sLeft + c.w)) + 4;
            const inner = stageCards.map((c) => renderCard(c, c.x - sLeft));
            return (
              <div
                key={stage.label}
                className="absolute top-0 bottom-0"
                style={{ left: sLeft, width: sWidth }}
              >
                {wide ? (
                  <div
                    data-student-cluster
                    className="sticky h-full"
                    style={{ left: LABEL_W, width: clusterW }}
                  >
                    {inner}
                  </div>
                ) : (
                  inner
                )}
              </div>
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
