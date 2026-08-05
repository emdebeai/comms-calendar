import { useMemo } from "react";
import type { Comm } from "../data/types";
import { CARD_W, TOTAL_H, TOTAL_W, commHeight, commPos } from "../lib/scale";

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

// Route a connector between two cards, always arriving at the target's left
// edge. Cards far enough apart horizontally get a gentle S-curve; close or
// overlapping cards get a rounded elbow — out of the source's bottom (or
// top), straight down (or up), then a quarter-turn into the target's left
// side at mid-height.
function routePath(byId: Map<string, Comm>, aId: string, bId: string): Route | null {
  const from = byId.get(aId);
  const to = byId.get(bId);
  if (!from || !to) return null;
  const a = commPos(from);
  const b = commPos(to);
  const hFrom = commHeight(aId);
  const hTo = commHeight(bId);
  const yTarget = b.y + hTo / 2;
  const xTarget = b.x - 3;

  if (b.x >= a.x + CARD_W + 32) {
    const x1 = a.x + CARD_W;
    const y1 = a.y + hFrom / 2;
    const k = Math.min(70, Math.max(28, (xTarget - x1) / 2));
    return {
      d: `M${x1},${y1} C${x1 + k},${y1} ${xTarget - k},${yTarget} ${xTarget},${yTarget}`,
      start: [x1, y1],
      end: [xTarget, yTarget],
    };
  }

  // Stacked / overlapping cards — the gap between them is often just a few
  // pixels, far too tight to route through. Swing out the LEFT side instead:
  // exit the source's left edge near its target-facing corner, bow out into
  // the open space beside the cards, and land on the target's left edge at
  // mid-height. Both tangents are horizontal, so it reads as one calm
  // bracket rather than a squiggle squeezed between the cards.
  const goingDown = b.y > a.y;
  const ySrc = goingDown ? a.y + hFrom - 9 : a.y + 9;
  const xSrc = a.x - 1.5;
  // Bulge past both left edges, scaled up a little for long vertical hops.
  const bulge = Math.min(a.x, b.x) - (26 + Math.min(18, Math.abs(yTarget - ySrc) / 10));
  return {
    d: `M${xSrc},${ySrc} C${bulge},${ySrc} ${bulge},${yTarget} ${xTarget},${yTarget}`,
    start: [xSrc, ySrc],
    end: [xTarget, yTarget],
  };
}

interface Props {
  comms: Comm[];
  hiddenIds: Set<string>;
  activeId: string | null;
  showAll: boolean;
}

/** Trigger connectors: all of them when toggled on, otherwise just the
 *  hovered/pinned comm's. Links touching a comm that's folded into a
 *  "+N more" chip are skipped — no lines to invisible cards. */
export function TriggerLayer({ comms, hiddenIds, activeId, showAll }: Props) {
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
        const route = routePath(byId, l.from, l.to);
        if (!route) return null;
        const emphasised = !showAll || l.from === activeId || l.to === activeId;
        const drawIn = emphasised && !showAll; // hover reveal only
        const stroke = "var(--color-rmit-blue-interactive)";
        return (
          <g key={`${l.from}-${l.to}`} opacity={emphasised ? 1 : 0.5}>
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
