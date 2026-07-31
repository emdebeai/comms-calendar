import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { Campaign } from "../data/types";
import {
  CAMPAIGN_H,
  CAMPAIGN_SUMMARY_H,
  LABEL_W,
  campaignRangeLabel,
  campaignY,
  dotY,
  scaleX,
} from "../lib/scale";
import { FOCUS_RING } from "../lib/styles";
import { ChannelIcon } from "./ChannelIcon";

interface Props {
  campaign: Campaign;
  index: number;
  /** present on the group summary bar — makes it a toggle for its channels */
  expanded?: boolean;
  /** recede into the background — a lens is dimming the map, and these
   *  always-on media buys aren't part of what's being focused */
  dimmed?: boolean;
  onToggle?: () => void;
  /** present on channel bars — click opens the channel's detail panel */
  onOpen?: (id: string) => void;
}

// Below this pixel width a channel bar can't fit its label, so it shows just
// the icon and floats the label just outside its right edge instead. Sized for
// the longest placement names (the campus-prefixed outdoor ones, e.g.
// "Bundoora: Northland Shopping Centre") — below this they'd all truncate to a
// useless "Bundoora…", which reads as several identical bars.
const NARROW_PX = 150;

export function CampaignBar({ campaign, index, expanded, dimmed, onToggle, onOpen }: Props) {
  const left = scaleX(campaign.from);
  const width = scaleX(campaign.to) - scaleX(campaign.from);
  const range = campaignRangeLabel(campaign.from, campaign.to);
  const isToggle = onToggle !== undefined;
  const narrow = !isToggle && width < NARROW_PX;

  // Instant custom tooltip with the flight dates — the native title tooltip
  // takes ~a second to appear. Anchored to the sticky label so it stays in
  // view wherever along the bar you hover; also shown on keyboard focus.
  const [hovered, setHovered] = useState(false);

  const tooltip = (
    <span
      aria-hidden
      className={`absolute -top-8 left-0 z-30 rounded-md bg-tooltip px-2 py-1 text-xs font-normal whitespace-nowrap text-white shadow-md transition-opacity duration-100 ${
        hovered ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      {range}
    </span>
  );

  // Narrow bars carry only the icon (centred); the label floats outside (see
  // below). Wide bars keep the icon + label, sticky so it stays in view as
  // the bar scrolls beneath it.
  const inner = narrow ? (
    <span className="relative flex w-full items-center justify-center">
      {tooltip}
      <ChannelIcon channel={campaign.channel} />
    </span>
  ) : (
    <span
      className="flex min-w-0 items-center gap-1.5"
      style={{ position: "sticky", left: LABEL_W + 10 }}
    >
      {tooltip}
      {/* Icon leads (aligning the summary's megaphone with the channel icons
          below); the dropdown chevron trails on the right. */}
      <span className="shrink-0">
        <ChannelIcon channel={campaign.channel} />
      </span>
      {/* Summary bar wraps to two lines like the comm cards; channels stay
          single-line (they're one short word each). */}
      <span className={isToggle ? "leading-tight line-clamp-2" : "truncate"}>
        {campaign.title}
      </span>
      {isToggle &&
        (expanded ? (
          <ChevronDown size={13} strokeWidth={2} className="ml-0.5 shrink-0" aria-hidden />
        ) : (
          <ChevronRight size={13} strokeWidth={2} className="ml-0.5 shrink-0" aria-hidden />
        ))}
    </span>
  );

  // Amber gives the whole media schedule its own colour so it reads as a
  // distinct category from the comm chips (which own the blue/teal/pink/etc
  // tokens). Icons inherit it via currentColor. Channels are borderless tinted
  // fills like the comm chips; only the summary bar keeps a border so it still
  // reads as the expand/collapse control.
  // The summary bar mirrors the comm cards: flat left edge (where the stem
  // meets it) + rounded-r-md right corner. Channels stay single-line pills.
  // Raise on hover so the flight-date tooltip clears any comm card stacked
  // above the bar (which would otherwise clip it).
  const dim = `transition-opacity duration-300 ${dimmed ? "opacity-[0.05]" : ""}`;
  const barBase = `absolute ${hovered ? "z-30" : "z-10"} flex cursor-pointer items-center bg-tint-amber text-left text-xs text-amber ${
    isToggle ? "rounded-l-none rounded-r-md" : "rounded-full"
  } ${narrow ? "justify-center px-1" : "px-2.5"} ${dim} ${FOCUS_RING}`;
  const barStyle = {
    left,
    top: campaignY(index),
    width,
    height: isToggle ? CAMPAIGN_SUMMARY_H : CAMPAIGN_H,
  };
  const hoverHandlers = {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
    onFocus: () => setHovered(true),
    onBlur: () => setHovered(false),
  };

  if (isToggle) {
    const barTop = campaignY(index);
    // The dot sits on the Marketing lane's baseline strip with the comm dots;
    // the stem drops from there all the way down to the summary bar — same
    // marker language as the comm cards.
    const baseY = dotY("marketing");
    return (
      <>
        <span
          aria-hidden
          className={`absolute z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber ring-2 ring-card ${dim}`}
          style={{ left: left + 0.75, top: baseY }}
        />
        <span
          aria-hidden
          className={`absolute w-[1.25px] bg-amber ${dim}`}
          style={{ left, top: baseY + 5, height: Math.max(barTop - (baseY + 5), 0) }}
        />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          aria-expanded={expanded}
          aria-label={`${campaign.title}, ${range} — ${expanded ? "collapse" : "show"} channels`}
          // No left border — the solid accent strip below IS the left edge, so
          // the stem carries through into the card at full 1.5px thickness.
          className={`${barBase} border-y border-r border-amber/60 font-semibold hover:border-rmit-blue-interactive`}
          style={barStyle}
          {...hoverHandlers}
        >
          <span aria-hidden className="absolute inset-y-0 left-0 w-[1.25px] bg-amber" />
          {inner}
        </button>
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpen?.(campaign.id);
        }}
        aria-label={`${campaign.title}, ${range} — details and comments`}
        className={`${barBase} font-medium hover:ring-1 hover:ring-rmit-blue-interactive`}
        style={barStyle}
        {...hoverHandlers}
      >
        {inner}
      </button>
      {narrow && (
        /* label floats just past the bar's right edge — the bar's too short
           to hold it. Decorative (the button already carries the full
           aria-label); non-interactive so it never blocks a click. */
        <span
          aria-hidden
          className={`pointer-events-none absolute z-10 flex items-center whitespace-nowrap text-xs font-medium text-amber ${dim}`}
          style={{ left: left + width + 6, top: campaignY(index), height: CAMPAIGN_H }}
        >
          {campaign.title}
        </span>
      )}
    </>
  );
}
