import { Car, CloudSun, Gamepad2, Megaphone, Monitor, Radio, type LucideIcon } from "lucide-react";
import { siGoogle, siGoogleads, siMeta, siReddit, siTiktok, siYoutube } from "simple-icons";
import type { CampaignChannel } from "../data/types";

// Channel icons. Real brands use their official logo path (simple-icons,
// CC0) rendered in currentColor so they inherit the surrounding grey —
// greyscale by design, no brand colours. Channels without a real brand mark
// (radio, generic display, the group bar) keep Lucide glyphs.
//
// NOTE: simple-icons is icon DATA (SVG paths), used only for brand logos —
// Lucide remains the UI icon library per the styleguide rule.

const BRAND_PATHS: Partial<Record<CampaignChannel, string>> = {
  youtube: siYoutube.path,
  tiktok: siTiktok.path,
  meta: siMeta.path,
  reddit: siReddit.path,
  google: siGoogle.path,
  pmax: siGoogleads.path,
};

const LUCIDE_FALLBACKS: Partial<Record<CampaignChannel, LucideIcon>> = {
  livewire: Gamepad2,
  radio: Radio,
  "radio-traffic": Car,
  display: Monitor,
  weatherzone: CloudSun,
  group: Megaphone,
};

export function ChannelIcon({ channel, size = 12 }: { channel: CampaignChannel; size?: number }) {
  const path = BRAND_PATHS[channel];
  if (path) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        className="shrink-0"
        fill="currentColor"
        aria-hidden
      >
        <path d={path} />
      </svg>
    );
  }
  const Fallback = LUCIDE_FALLBACKS[channel] ?? Megaphone;
  return <Fallback size={size} strokeWidth={1.75} className="shrink-0" aria-hidden />;
}
