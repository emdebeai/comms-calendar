import { Link2 } from "lucide-react";
import type { CommType } from "../data/types";
import { COMM_COLORS, COMM_ICONS, COMM_LABELS } from "./icons";

const ALL_TYPES = Object.keys(COMM_ICONS) as CommType[];

interface Props {
  activeTypes: Set<CommType>;
  onToggle: (t: CommType) => void;
  onReset: () => void;
  showLines: boolean;
  onToggleLines: () => void;
}

export function Legend({ activeTypes, onToggle, onReset, showLines, onToggleLines }: Props) {
  const allActive = activeTypes.size === ALL_TYPES.length;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onReset}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
            allActive
              ? "border-rmit-blue bg-rmit-blue text-white"
              : "border-grey-30 bg-white text-grey-80 hover:border-grey-40"
          }`}
        >
          All types
        </button>
        {ALL_TYPES.map((t) => {
          const Icon = COMM_ICONS[t];
          const c = COMM_COLORS[t];
          const on = activeTypes.has(t);
          const selected = on && !allActive;
          const dimmed = !on && !allActive;
          return (
            <button
              key={t}
              type="button"
              onClick={() => onToggle(t)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${c.text} ${
                selected
                  ? `${c.chip} ${c.border}`
                  : `border-grey-30 bg-white hover:border-grey-40 ${dimmed ? "opacity-40" : ""}`
              }`}
            >
              <Icon size={14} strokeWidth={1.75} aria-hidden />
              {COMM_LABELS[t]}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-grey-70">
        <span className="flex items-center gap-1.5">
          <span className="h-3.5 w-6 rounded-sm border border-dashed border-grey-40 bg-white" />
          Moment that matters — hover or click its label to see linked comms
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3.5 w-6 rounded-full border border-grey-30 bg-grey-20" />
          Always-on campaign
        </span>
        <button
          type="button"
          onClick={onToggleLines}
          aria-pressed={showLines}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
            showLines
              ? "border-rmit-blue bg-rmit-blue text-white"
              : "border-grey-30 bg-white text-grey-80 hover:border-grey-40"
          }`}
        >
          <Link2 size={12} strokeWidth={1.75} aria-hidden />
          {showLines ? "Trigger lines on" : "Show trigger lines"}
        </button>
        {!showLines && (
          <span className="text-xs text-grey-60">or hover a comm to trace it</span>
        )}
        <span className="text-xs text-grey-60">
          Click a comm for details + comments · click any month (or a +N more
          chip) for a day-by-day view
        </span>
      </div>
    </div>
  );
}
