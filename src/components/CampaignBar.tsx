import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { Campaign } from "../data/types";
import { CAMPAIGN_H, LABEL_W, campaignRangeLabel, campaignY, scaleX } from "../lib/scale";
import { FOCUS_RING } from "../lib/styles";
import { ChannelIcon } from "./ChannelIcon";

interface Props {
  campaign: Campaign;
  index: number;
  /** present on the group summary bar — makes it a toggle for its channels */
  expanded?: boolean;
  onToggle?: () => void;
  /** present on channel bars — click opens the channel's detail panel */
  onOpen?: (id: string) => void;
}

export function CampaignBar({ campaign, index, expanded, onToggle, onOpen }: Props) {
  const left = scaleX(campaign.from);
  const width = scaleX(campaign.to) - scaleX(campaign.from);
  const range = campaignRangeLabel(campaign.from, campaign.to);
  const isToggle = onToggle !== undefined;

  // Instant custom tooltip with the flight dates — the native title tooltip
  // takes ~a second to appear. Anchored to the sticky label so it stays in
  // view wherever along the bar you hover; also shown on keyboard focus.
  const [hovered, setHovered] = useState(false);

  const label = (
    /* label sticks in view while the bar scrolls beneath it */
    <span
      className="flex min-w-0 items-center gap-1.5"
      style={{ position: "sticky", left: LABEL_W + 10 }}
    >
      <span
        aria-hidden
        className={`absolute -top-8 left-0 z-30 rounded-md bg-grey-90 px-2 py-1 text-xs font-normal whitespace-nowrap text-white shadow-md transition-opacity duration-100 ${
          hovered ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        {range}
      </span>
      {isToggle &&
        (expanded ? (
          <ChevronDown size={12} strokeWidth={2} aria-hidden />
        ) : (
          <ChevronRight size={12} strokeWidth={2} aria-hidden />
        ))}
      <span className="text-grey-70">
        <ChannelIcon channel={campaign.channel} />
      </span>
      <span className="truncate">{campaign.title}</span>
    </span>
  );

  // White like the comm cards so the schedule reads at the same visual level.
  const barClass = `absolute z-10 flex cursor-pointer items-center rounded-full border bg-white px-2.5 text-left text-xs font-medium text-grey-90 ${FOCUS_RING}`;
  const barStyle = { left, top: campaignY(index), width, height: CAMPAIGN_H };
  const hoverHandlers = {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
    onFocus: () => setHovered(true),
    onBlur: () => setHovered(false),
  };

  if (isToggle) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        aria-expanded={expanded}
        aria-label={`${campaign.title}, ${range} — ${expanded ? "collapse" : "show"} channels`}
        className={`${barClass} border-grey-40 hover:border-rmit-blue-interactive`}
        style={barStyle}
        {...hoverHandlers}
      >
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpen?.(campaign.id);
      }}
      aria-label={`${campaign.title}, ${range} — details and comments`}
      className={`${barClass} border-grey-30 hover:border-rmit-blue-interactive`}
      style={barStyle}
      {...hoverHandlers}
    >
      {label}
    </button>
  );
}
