import { ChevronDown, ChevronRight, Megaphone } from "lucide-react";
import { buildCampaignRows } from "../data/comms";
import { CAMPAIGN_ROW_H, LABEL_W, campaignRangeLabel, campaignRowY, scaleX } from "../lib/scale";
import { FOCUS_RING } from "../lib/styles";
import { ChannelIcon } from "./ChannelIcon";

interface Props {
  /** row ids currently expanded ("open-day" + schedule ids) */
  expanded: Set<string>;
  dimmed: boolean;
  onToggle: (id: string) => void;
  /** placement click → its detail panel */
  onOpenChannel: (id: string) => void;
  /** always-on click → the programme panel (its 9 channels) */
  onOpenAlwaysOn: () => void;
}

// Below this width a bar can't fit its label — icon only, label floats right.
const NARROW_PX = 150;
const BAR_H = 26;

/** The campaigns lane: labelled bars in the map's blue card language.
 *  Always-on runs the full length; the four campaigns sit beneath it; Open
 *  Day carries a chevron and expands into its two media schedules, each of
 *  which expands into its placements — the original interaction. */
export function CampaignGantt({ expanded, dimmed, onToggle, onOpenChannel, onOpenAlwaysOn }: Props) {
  const rows = buildCampaignRows(expanded);
  const dim = `transition-opacity duration-300 ${dimmed ? "opacity-[0.05] focus-visible:opacity-100" : ""}`;
  return (
    <>
      {rows.map((row) => {
        // Keep a small gap from the sticky gutter so a bar starting at month 0
        // (the always-on band) doesn't sit flush against the left edge.
        const left = Math.max(scaleX(row.from), 8);
        const width = Math.max(scaleX(row.to) - left, 26);
        const top = campaignRowY(row.line) + (CAMPAIGN_ROW_H - BAR_H) / 2;
        const range = row.allYear ? "Runs all year" : campaignRangeLabel(row.from, row.to);
        const narrow = width < NARROW_PX;
        const interactive = row.toggle || row.channel || row.id === "cmp-always-on";
        const base = `absolute flex items-center rounded-md border text-left text-xs ${dim} ${
          row.depth === 2
            ? "border-amber/30 bg-tint-amber/70 text-amber"
            : "border-amber/50 bg-tint-amber font-semibold text-amber"
        } ${narrow ? "justify-center px-1" : "px-2.5"} ${
          interactive ? `cursor-pointer hover:border-rmit-blue-interactive ${FOCUS_RING}` : ""
        }`;
        const icon = row.channel ? (
          <ChannelIcon channel={row.channel} size={12} />
        ) : (
          <Megaphone size={12} strokeWidth={2} aria-hidden />
        );
        const inner = narrow ? (
          icon
        ) : (
          <span
            className="flex min-w-0 items-center gap-1.5"
            style={{ position: "sticky", left: LABEL_W + 10 }}
          >
            <span className="shrink-0">{icon}</span>
            <span className="truncate">{row.label}</span>
            {row.toggle &&
              (row.expanded ? (
                <ChevronDown size={13} strokeWidth={2} className="ml-0.5 shrink-0" aria-hidden />
              ) : (
                <ChevronRight size={13} strokeWidth={2} className="ml-0.5 shrink-0" aria-hidden />
              ))}
          </span>
        );
        const style = { left, width, top, height: BAR_H };
        if (!interactive) {
          return (
            <div key={row.id} title={`${row.label} · ${range}`} className={base} style={style}>
              {inner}
            </div>
          );
        }
        const onClick = row.toggle
          ? () => onToggle(row.id)
          : row.channel
            ? () => onOpenChannel(row.id)
            : onOpenAlwaysOn;
        return (
          <span key={row.id}>
            <button
              type="button"
              title={`${row.label} · ${range}`}
              aria-label={
                row.toggle
                  ? `${row.label}, ${range} — ${row.expanded ? "collapse" : "expand"}`
                  : `${row.label}, ${range} — details`
              }
              aria-expanded={row.toggle ? row.expanded : undefined}
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              className={base}
              style={style}
            >
              {inner}
            </button>
            {narrow && (
              <span
                aria-hidden
                className={`pointer-events-none absolute flex items-center text-xs whitespace-nowrap text-amber ${dim}`}
                style={{ left: left + width + 6, top, height: BAR_H }}
              >
                {row.label}
              </span>
            )}
          </span>
        );
      })}
    </>
  );
}
