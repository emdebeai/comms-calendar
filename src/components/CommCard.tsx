import { useLayoutEffect, useRef, useState } from "react";
import { ArrowRight, Link2, MessageCircle } from "lucide-react";
import type { Comm } from "../data/types";
import { CARD_W, PILL_H, commPos, monthLabel } from "../lib/scale";
import { markerAccent } from "../lib/designConfig";
import { FOCUS_RING } from "../lib/styles";
import { COMM_COLORS, COMM_ICONS } from "./icons";

interface Props {
  comm: Comm;
  dimmed: boolean;
  active: boolean;
  /** true when hidden by the type filter — kept off the pointer/tab path */
  filteredOut: boolean;
  onHover: (id: string | null) => void;
  /** click opens the detail panel (attributes + comments) */
  onOpenDetail: (id: string) => void;
  /** reports the chip's rendered height so the layout can stack rows tightly */
  onMeasure: (id: string, height: number) => void;
  feedbackCount: number;
}

/** Chip for a comm. The exact send date is marked by the type-coloured dot
 *  on the lane's baseline (drawn by Timeline); the chip hangs beneath it and
 *  carries the two things you scan for — TYPE (tinted fill + icon colour) and
 *  the CTA. Full date lives in the tooltip + panel. */
export function CommCard({
  comm,
  dimmed,
  active,
  filteredOut,
  onHover,
  onOpenDetail,
  onMeasure,
  feedbackCount,
}: Props) {
  const { x, y } = commPos(comm);
  const rootRef = useRef<HTMLButtonElement>(null);
  const [hovered, setHovered] = useState(false);

  // Chip height varies with title length / CTA — measure it so packing never
  // drifts from the DOM (web fonts, zoom, edits).
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    onMeasure(comm.id, el.offsetHeight);
    const ro = new ResizeObserver(() => onMeasure(comm.id, el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [comm.id, onMeasure]);

  const Icon = COMM_ICONS[comm.type];
  const colors = COMM_COLORS[comm.type];
  const hasTriggers = comm.triggers && comm.triggers.length > 0;
  const isEvent = comm.type === "event";

  const day = Math.round((comm.month % 1) * 30) + 1;
  const dateLabel = `${day} ${monthLabel(Math.floor(comm.month))}`;

  // A hovered/active chip lifts above its overlapping neighbours so its
  // highlight (and tooltip) is never trapped behind a chip stacked on top.
  // Hover wins over active: each card is its own stacking context, so a
  // hovered card (and the tooltip inside it) must sit strictly above every
  // other card — including a pinned/active one later in the DOM — otherwise
  // the tooltip renders behind whatever overlaps it. Kept below the sticky
  // header rows (z-40) so tooltips never cover the month/moment bands.
  const zIndex = hovered ? 30 : active ? 20 : 10;
  // Borderless tinted token — separation comes from the tint fill + the
  // full-colour left edge; hover/active add a ring/shadow for affordance.
  const stateClass = active
    ? "ring-1 ring-rmit-blue-interactive"
    : hovered
      ? "shadow-md"
      : "";

  return (
    <button
      ref={rootRef}
      type="button"
      // Filtered-out chips are dimmed to ~0.3 and must not be reachable by
      // pointer or keyboard, nor announced — otherwise they sit in the tab
      // order at failing contrast and open panels the filter is hiding.
      disabled={filteredOut}
      aria-hidden={filteredOut || undefined}
      aria-label={`${comm.title}, ${dateLabel} — details and comments`}
      className={`absolute flex items-start gap-1.5 rounded-l-none rounded-r-md px-2 py-1.5 text-left transition-opacity ${
        colors.chip
      } ${filteredOut ? "cursor-default" : "cursor-pointer"} ${stateClass} ${
        dimmed ? "opacity-15" : ""
      } ${FOCUS_RING}`}
      style={{ left: x, top: y, width: CARD_W, minHeight: PILL_H, zIndex }}
      onMouseEnter={() => {
        setHovered(true);
        onHover(comm.id);
      }}
      onMouseLeave={() => {
        setHovered(false);
        onHover(null);
      }}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        onOpenDetail(comm.id);
      }}
    >
      {/* instant tooltip — the exact date; native title tooltip is too slow */}
      <span
        aria-hidden
        className={`absolute -top-7 left-0 z-30 rounded-md bg-tooltip px-2 py-1 text-xs font-normal whitespace-nowrap text-white shadow-md transition-opacity duration-100 ${
          hovered && !filteredOut ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        {dateLabel}
      </span>
      {/* left-edge accent — full-colour strip flush on the flat left edge
          (no border now, so left-0) that the stem continues into seamlessly */}
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 w-[1.5px] ${markerAccent(colors.accent, "line")}`}
      />
      <span className={`mt-px shrink-0 ${colors.text}`}>
        <Icon size={13} strokeWidth={2} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-xs font-semibold leading-tight line-clamp-2 ${colors.text}`}>
          {comm.title}
        </span>
        {!isEvent && (
          <span className="mt-0.5 block truncate text-xs leading-tight text-grey-80">
            {comm.cta}
            <ArrowRight size={11} strokeWidth={2} className="ml-1 inline-block align-middle" aria-hidden />
          </span>
        )}
      </span>
      {(hasTriggers || feedbackCount > 0) && (
        <span className="mt-px flex shrink-0 flex-col items-end gap-0.5">
          {hasTriggers && (
            <Link2
              size={11}
              strokeWidth={1.75}
              className="text-grey-70"
              aria-label="Triggers another comm"
            />
          )}
          {feedbackCount > 0 && (
            <span
              className="flex items-center gap-0.5 text-xs leading-none text-rmit-blue"
              aria-label={`${feedbackCount} feedback notes`}
            >
              <MessageCircle size={11} strokeWidth={1.75} aria-hidden />
              {feedbackCount}
            </span>
          )}
        </span>
      )}
    </button>
  );
}
