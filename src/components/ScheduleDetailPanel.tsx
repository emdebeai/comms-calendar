import { ChevronRight, Megaphone } from "lucide-react";
import type { CampaignGroup } from "../data/types";
import { campaignRangeLabel } from "../lib/scale";
import { EYEBROW, FOCUS_RING } from "../lib/styles";
import { ChannelIcon } from "./ChannelIcon";
import { DetailPanelShell } from "./DetailPanelShell";

interface Props {
  group: CampaignGroup;
  /** click-through to one placement's own detail panel */
  onOpenChannel: (id: string) => void;
  onClose: () => void;
}

/** Detail panel for a media schedule — the placement list lives HERE, not on
 *  the canvas (in-canvas placement bars turned to icon soup at most zoom
 *  levels). Each row carries its own flight dates as text, readable at any
 *  zoom; clicking one opens that placement's detail panel. */
export function ScheduleDetailPanel({ group, onOpenChannel, onClose }: Props) {
  return (
    <DetailPanelShell
      overline={
        group.id === "cmp-always-on"
          ? "Always-on programme · runs all year"
          : `Open Day campaign · ${campaignRangeLabel(group.from, group.to)}`
      }
      title={group.title}
      iconChipClass="bg-tint-amber text-amber"
      icon={<Megaphone size={16} strokeWidth={1.75} aria-hidden />}
      onClose={onClose}
    >
      <div className="flex-1 overflow-y-auto p-5">
        <h3 className={`text-grey-70 ${EYEBROW}`}>
          {group.channels.length} {group.id === "cmp-always-on" ? "channels" : "placements"}
        </h3>
        <ul className="mt-2 flex flex-col">
          {group.channels.map((c) => (
            <li key={c.id} className="border-b border-grey-20 last:border-b-0">
              <button
                type="button"
                onClick={() => onOpenChannel(c.id)}
                className={`flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left hover:bg-grey-10 ${FOCUS_RING}`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-grey-20 text-grey-80">
                  <ChannelIcon channel={c.channel} size={13} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-grey-90">
                    {c.title}
                  </span>
                  <span className="block text-xs text-grey-70">
                    {campaignRangeLabel(c.from, c.to)}
                  </span>
                </span>
                <ChevronRight size={14} strokeWidth={2} className="shrink-0 text-grey-60" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </DetailPanelShell>
  );
}
