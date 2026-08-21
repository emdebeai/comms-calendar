import type { Comm } from "../data/types";
import type { Bubble } from "../lib/studentBubbles";
import { HEADER_H, MARKER_SIZE, STUDENT_LANE_H, TOTAL_W, commPos, markerPos } from "../lib/scale";
import type { QuestionRef } from "./StudentJourneyLane";

// Comm positions are root-relative (they include HEADER_H). The swimlane is the
// last header block, so its top sits at HEADER_H - STUDENT_LANE_H; a comm's
// band-local y is therefore its root y minus that band top.
const BAND_TOP = () => HEADER_H - STUDENT_LANE_H;

interface Props {
  activeQuestion: QuestionRef | null;
  bubbles: Bubble[];
  comms: Comm[];
  hiddenIds: Set<string>;
  collapsedLanes: Set<string>;
}

/** Where a connector lands on a touchpoint — its card's top-left, or its icon
 *  marker when the lane is collapsed. Band-local (comm y + the band height,
 *  since the swimlane sits directly above the lanes). */
function commAnchor(comm: Comm, collapsed: Set<string>): { x: number; y: number } {
  if (collapsed.has(comm.team)) {
    const p = markerPos(comm);
    return { x: p.x + MARKER_SIZE / 2, y: p.y - BAND_TOP() + MARKER_SIZE / 2 };
  }
  const p = commPos(comm);
  return { x: p.x + 8, y: p.y - BAND_TOP() };
}

/** Connectors from the hovered/pinned question's bubble down to the touchpoints
 *  that answer it. One question at a time — the arrows only draw for the active
 *  bubble, so the swimlane never becomes a web. Same connector language as the
 *  trigger lines (soft casing, anchored ends), with a small arrowhead at the
 *  touchpoint to read as "this answers that". */
export function StudentThreadLayer({
  activeQuestion,
  bubbles,
  comms,
  hiddenIds,
  collapsedLanes,
}: Props) {
  if (!activeQuestion) return null;
  const bubble = bubbles.find(
    (b) => b.stage === activeQuestion.stage && b.question === activeQuestion.question,
  );
  if (!bubble || bubble.commIds.length === 0) return null;

  const byId = new Map(comms.map((c) => [c.id, c]));
  const bx = bubble.x + bubble.w / 2;
  const by = bubble.y + bubble.h;
  const stroke = "var(--color-rmit-blue-interactive)";

  const routes = bubble.commIds
    .filter((id) => !hiddenIds.has(id))
    .map((id) => byId.get(id))
    .filter((c): c is Comm => !!c)
    .map((c) => commAnchor(c, collapsedLanes));

  if (routes.length === 0) return null;

  return (
    <svg
      className="pointer-events-none absolute top-0 left-0 z-20 overflow-visible"
      width={TOTAL_W}
      height={STUDENT_LANE_H}
      aria-hidden="true"
    >
      {routes.map((t, i) => {
        const k = Math.max(20, Math.min(90, (t.y - by) / 2));
        const d = `M${bx},${by} C${bx},${by + k} ${t.x},${t.y - k} ${t.x},${t.y}`;
        return (
          <g key={i} className="animate-draw-line">
            {/* casing so the line reads over whatever it crosses */}
            <path d={d} fill="none" stroke="var(--color-card)" strokeWidth={4.5} strokeLinecap="round" opacity={0.85} />
            <path d={d} fill="none" stroke={stroke} strokeWidth={1.75} strokeLinecap="round" />
            {/* arrowhead at the touchpoint */}
            <path
              d={`M${t.x - 3.5},${t.y - 5} L${t.x},${t.y} L${t.x + 3.5},${t.y - 5}`}
              fill="none"
              stroke={stroke}
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        );
      })}
      {/* anchor dot at the bubble */}
      <circle cx={bx} cy={by} r={2.5} fill={stroke} />
    </svg>
  );
}
