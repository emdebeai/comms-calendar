import { useMemo } from "react";
import type { Comm } from "../data/types";
import { CARD_H, CARD_W, TOTAL_H, TOTAL_W, commPos } from "../lib/scale";

interface Link {
  from: string;
  to: string;
}

function buildLinks(comms: Comm[]): Link[] {
  return comms.flatMap((c) => c.triggers?.map((t) => ({ from: c.id, to: t })) ?? []);
}

// Route a connector between two cards, always arriving at the target's left
// edge. Cards far enough apart horizontally get a gentle S-curve; close or
// overlapping cards get a rounded elbow — out of the source's bottom (or
// top), straight down (or up), then a quarter-turn into the target's left
// side at mid-height.
function routePath(byId: Map<string, Comm>, aId: string, bId: string): string | null {
  const from = byId.get(aId);
  const to = byId.get(bId);
  if (!from || !to) return null;
  const a = commPos(from.team, from.month, from.row);
  const b = commPos(to.team, to.month, to.row);
  const yTarget = b.y + CARD_H / 2;
  const xTarget = b.x - 3;

  if (b.x >= a.x + CARD_W + 32) {
    const x1 = a.x + CARD_W;
    const y1 = a.y + CARD_H / 2;
    const k = Math.min(70, (xTarget - x1) / 2);
    return `M${x1},${y1} C${x1 + k},${y1} ${xTarget - k},${yTarget} ${xTarget},${yTarget}`;
  }

  const goingDown = b.y > a.y;
  const y1 = goingDown ? a.y + CARD_H : a.y;
  const r = 10;
  // Vertical drop lane just left of the target's edge, clamped onto the
  // source card so the line visibly leaves it.
  const xDrop = Math.min(Math.max(b.x - 22, a.x + 16), a.x + CARD_W - 10);

  if (xDrop <= xTarget - r) {
    const dir = goingDown ? 1 : -1;
    return (
      `M${xDrop},${y1} V${yTarget - r * dir} ` +
      `Q${xDrop},${yTarget} ${xDrop + r},${yTarget} H${xTarget}`
    );
  }

  // No room to approach from the left — enter through the top/bottom instead.
  const x2 = b.x + CARD_W * 0.4;
  const y2 = goingDown ? b.y - 3 : b.y + CARD_H + 3;
  const k = Math.max(18, Math.abs(y2 - y1) / 2);
  const dir = goingDown ? 1 : -1;
  return `M${xDrop},${y1} C${xDrop},${y1 + k * dir} ${x2},${y2 - k * dir} ${x2},${y2}`;
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
    >
      <defs>
        <marker
          id="trigger-arrow"
          viewBox="0 0 8 8"
          refX="6.5"
          refY="4"
          markerWidth="5.5"
          markerHeight="5.5"
          orient="auto-start-reverse"
        >
          <path d="M0.5,0.5 L7,4 L0.5,7.5 Z" fill="var(--color-rmit-blue-interactive)" />
        </marker>
      </defs>
      {visible.map((l) => {
        const d = routePath(byId, l.from, l.to);
        if (!d) return null;
        const emphasised =
          !showAll || l.from === activeId || l.to === activeId;
        return (
          <path
            key={`${l.from}-${l.to}`}
            d={d}
            fill="none"
            stroke="var(--color-rmit-blue-interactive)"
            strokeWidth={emphasised ? 1.75 : 1.25}
            strokeLinecap="round"
            opacity={emphasised ? 1 : 0.45}
            markerEnd="url(#trigger-arrow)"
          />
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
