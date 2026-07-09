import type { Campaign } from "../data/types";
import { CAMPAIGN_H, LABEL_W, campaignY, scaleX } from "../lib/scale";
import { CHANNEL_ICONS } from "./icons";

export function CampaignBar({ campaign, index }: { campaign: Campaign; index: number }) {
  const Icon = CHANNEL_ICONS[campaign.channel];
  const left = scaleX(campaign.from);
  const width = scaleX(campaign.to) - scaleX(campaign.from);

  return (
    <div
      className="absolute z-10 flex items-center rounded-full border border-grey-30 bg-grey-20 px-2.5 text-xs font-medium text-grey-80"
      style={{ left, top: campaignY(index), width, height: CAMPAIGN_H }}
      title={campaign.title}
    >
      {/* label sticks in view while the bar scrolls beneath it */}
      <span
        className="flex min-w-0 items-center gap-1.5"
        style={{ position: "sticky", left: LABEL_W + 10 }}
      >
        <Icon size={12} strokeWidth={1.75} className="shrink-0" aria-hidden />
        <span className="truncate">{campaign.title}</span>
      </span>
    </div>
  );
}
