import { useMemo } from "react";
import type { Comm } from "../data/types";
import { CARD_W, MARKER_SIZE, TOTAL_H, TOTAL_W, commHeight, commPos, markerPos } from "../lib/scale";

interface Link {
  from: string;
  to: string;
}

function buildLinks(comms: Comm[]): Link[] {
  return comms.flatMap((c) => c.triggers?.map((t) => ({ from: c.id, to: t })) ?? []);
}

interface Route {
  d: string;
  /** endpoints, for the anchor dots */
  start: [number, number];
  end: [number, number];
}

/** Where a connector attaches to a comm: its card box, or its icon marker
 *  when the comm sits in a collapsed lane (markerPos centres on the date). */
function anchorOf(comm: Comm, collapsed: Set<string>) {
  if (collapsed.has(comm.team)) {
    const p = markerPos(comm);
    const left = p.x - MARKER_SIZE / 2;
    return { left, right: left + MARKER_SIZE, midY: p.y + MARKER_SIZE / 2 };
  }
  const p = commPos(comm);
  const h = commHeight(comm.id);
  return { left: p.x, right: p.x + CARD_W, midY: p.y + h / 2 };
}

// Route a connector between two cards, always arriving at the target's left
// edge. Cards far enough apart horizontally get a gentle S-curve; close or
// overlapping cards get a rounded elbow — out of the source's bottom (or
// top), straight down (or up), then a quarter-turn into the target's left
// side at mid-height.
function routePath(
  byId: Map<string, Comm>,
  aId: string,
  bId: string,
  collapsed: Set<string>,
): Route | null {
  const from = byId.get(aId);
  const to = byId.get(bId);
  if (!from || !to) return null;
  const a = anchorOf(from, collapsed);
  const b = anchorOf(to, collapsed);
  const yTarget = b.midY;
  const xTarget = b.left - 3;

  if (b.left >= a.right + 32) {
    const x1 = a.right;
    const y1 = a.midY;
    const k = Math.min(70, Math.max(28, (xTarget - x1) / 2));
    return {
      d: `M${x1},${y1} C${x1 + k},${y1} ${xTarget - k},${yTarget} ${xTarget},${yTarget}`,
      start: [x1, y1],
      end: [xTarget, yTarget],
    };
  }

  // Stacked / overlapping — the gap between endpoints is often just a few
  // pixels, far too tight to route through. Bracket around the RIGHT side
  // instead: out of the source's right edge at mid-height, bow into the open
  // space beside them, back into the target's right edge at mid-height.
  const ySrc = a.midY;
  const xSrc = a.right + 1.5;
  const xTgt = b.right + 3;
  const bulge = Math.max(a.right, b.right) + 26 + Math.min(18, Math.abs(yTarget - ySrc) / 10);
  return {
    d: `M${xSrc},${ySrc} C${bulge},${ySrc} ${bulge},${yTarget} ${xTgt},${yTarget}`,
    start: [xSrc, ySrc],
    end: [xTgt, yTarget],
  };
}

interface Props {
  comms: Comm[];
  hiddenIds: Set<string>;
  collapsedLanes: Set<string>;
  activeId: string | null;
  showAll: boolean;
  /** a question/moment spotlight is active — the whole map has dimmed, so the
   *  show-all trigger web recedes with it instead of staying bright on top. */
  recede?: boolean;
}

/** Trigger connectors: all of them when toggled on, otherwise just the
 *  hovered/pinned comm's. Links touching a comm that's folded into a
 *  "+N more" chip are skipped — no lines to invisible cards. */
export function TriggerLayer({ comms, hiddenIds, collapsedLanes, activeId, showAll, recede }: Props) {
  const links = useMemo(
    () =>
      buildLinks(comms).filter((l) => !hiddenIds.has(l.from) && !hiddenIds.has(l.to)),
    [comms, hiddenIds],
  );
  const byId = useMemo(() => new Map(comms.map((c) => [c.id, c])), [comms]);

  const visible = showAll
    ? links
    : links.filter((l) => l.from === activeId || l.to === activeId);
  if (visible.length === 0) return null;

  return (
    <svg
      className="pointer-events-none absolute top-0 left-0 z-20 overflow-visible"
      width={TOTAL_W}
      height={TOTAL_H}
      aria-hidden="true"
    >
      {/* Plain connectors, no arrowheads — these show that two comms are
          RELATED without asserting a direction of causality, which keeps the
          "what triggers what" conversation lighter. Each line sits on a soft
          card-coloured casing so it reads OVER the cards it crosses instead
          of colliding with their text, and both ends are anchored with a
          small dot. Hover-revealed lines draw in; the show-all overlay keeps
          non-hovered links dashed and quiet. */}
      {visible.map((l) => {
        const route = routePath(byId, l.from, l.to, collapsedLanes);
        if (!route) return null;
        const emphasised = !showAll || l.from === activeId || l.to === activeId;
        const drawIn = emphasised && !showAll; // hover reveal only
        // Under a question/moment spotlight the whole map dims — the show-all
        // web recedes with it rather than sitting bright over the dimmed cards.
        const groupOpacity = emphasised ? 1 : recede ? 0.12 : 0.5;
        const stroke = "var(--color-rmit-blue-interactive)";
        return (
          <g key={`${l.from}-${l.to}`} opacity={groupOpacity}>
            {/* casing — separates the line from whatever it crosses */}
            <path
              d={route.d}
              fill="none"
              stroke="var(--color-card)"
              strokeWidth={emphasised ? 4.5 : 3.5}
              strokeLinecap="round"
              opacity={0.85}
            />
            <path
              d={route.d}
              fill="none"
              stroke={stroke}
              strokeWidth={emphasised ? 1.75 : 1.25}
              strokeLinecap="round"
              strokeDasharray={emphasised ? undefined : "3 5"}
              pathLength={drawIn ? 1 : undefined}
              className={drawIn ? "animate-draw-line" : undefined}
            />
            {/* endpoint anchors */}
            <circle cx={route.start[0]} cy={route.start[1]} r={2.5} fill={stroke} />
            <circle
              cx={route.end[0]}
              cy={route.end[1]}
              r={2.5}
              fill="var(--color-card)"
              stroke={stroke}
              strokeWidth={1.5}
            />
          </g>
        );
      })}
    </svg>
  );
}

/** ids connected to the active comm (either direction). */
export function connectedIds(comms: Comm[], activeId: string | null): Set<string> {
  const set = new Set<string>();
  if (!activeId) return set;
  for (const l of buildLinks(comms)) {
    if (l.from === activeId) set.add(l.to);
    if (l.to === activeId) set.add(l.from);
  }
  return set;
}
