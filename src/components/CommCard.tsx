import { ArrowRight, Link2, MessageCircle } from "lucide-react";
import type { Comm } from "../data/types";
import { CARD_H, CARD_W, commPos } from "../lib/scale";
import { COMM_COLORS, COMM_ICONS } from "./icons";

interface Props {
  comm: Comm;
  dimmed: boolean;
  active: boolean;
  onHover: (id: string | null) => void;
  /** click opens the detail panel (attributes + comments) */
  onOpenDetail: (id: string) => void;
  feedbackCount: number;
}

export function CommCard({ comm, dimmed, active, onHover, onOpenDetail, feedbackCount }: Props) {
  const { x, y } = commPos(comm.team, comm.month, comm.row);
  const Icon = COMM_ICONS[comm.type];
  const hasTriggers = comm.triggers && comm.triggers.length > 0;

  return (
    <div
      role="button"
      tabIndex={0}
      title="Click for details and comments"
      className={`absolute z-10 flex cursor-pointer gap-2 rounded-md border bg-white p-2 text-left transition-opacity ${
        active
          ? "border-rmit-blue-interactive ring-1 ring-rmit-blue-interactive"
          : "border-grey-30 hover:border-rmit-blue-interactive"
      } ${dimmed ? "opacity-30" : ""}`}
      style={{ left: x, top: y, width: CARD_W, height: CARD_H }}
      onMouseEnter={() => onHover(comm.id)}
      onMouseLeave={() => onHover(null)}
      onClick={(e) => {
        e.stopPropagation();
        onOpenDetail(comm.id);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          onOpenDetail(comm.id);
        }
      }}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${COMM_COLORS[comm.type].chip} ${COMM_COLORS[comm.type].text}`}
      >
        <Icon size={14} strokeWidth={1.75} aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-semibold leading-tight text-grey-90 line-clamp-2">
          {comm.title}
        </span>
        <span className="flex items-center gap-1 text-xs leading-tight text-rmit-blue-interactive">
          <span className="truncate">{comm.cta}</span>
          <ArrowRight size={12} strokeWidth={2} className="shrink-0" aria-hidden />
        </span>
      </span>
      {hasTriggers && (
        <Link2
          size={12}
          strokeWidth={1.75}
          className="absolute top-1 right-1 text-grey-60"
          aria-label="Triggers another comm"
        />
      )}
      {feedbackCount > 0 && (
        <span
          className="absolute right-1 flex items-center gap-0.5 text-xs leading-none text-rmit-blue-interactive"
          style={{ top: hasTriggers ? 18 : 4 }}
          aria-label={`${feedbackCount} feedback notes`}
        >
          <MessageCircle size={11} strokeWidth={1.75} aria-hidden />
          {feedbackCount}
        </span>
      )}
    </div>
  );
}
