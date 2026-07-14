import type { CampaignGroup, InboundLaneData } from "./types";

// Individual comms now live in server/data/comms.csv, loaded at runtime by
// src/lib/loadComms.ts — see that file for the column schema. That's the
// file to hand a coworker to fill in; edit it (or replace it with an
// export from a spreadsheet) and refresh the page.

// Media schedule — from the "Campaign schedule: digital and radio" slide.
// One summary bar in the Marketing lane, expandable to per-channel bars.
// Year 12 season only for now; every channel ends 3 Aug. Month floats:
// month 29 = June of Year 12, day d ≈ (d-1)/30 within the month.
const JUN_15 = 29.47;
const JUN_22 = 29.7;
const JUL_6 = 30.17;
const JUL_20 = 30.63;
const JUL_27 = 30.87;
const AUG_3 = 31.07;

export const campaignGroup: CampaignGroup = {
  id: "cmp-digital-radio",
  title: "Digital and radio",
  from: JUN_15,
  to: AUG_3,
  channels: [
    {
      id: "cmp-youtube",
      title: "YouTube",
      channel: "youtube",
      from: JUN_15,
      to: AUG_3,
      description: "Video ads across YouTube — skippable in-stream and Shorts placements.",
    },
    {
      id: "cmp-livewire",
      title: "Livewire",
      channel: "livewire",
      from: JUN_15,
      to: AUG_3,
      description: "Gaming media network — ads inside games and gaming content.",
    },
    {
      id: "cmp-radio",
      title: "Radio",
      channel: "radio",
      from: JUL_6,
      to: AUG_3,
      description: "Broadcast radio spots in the lead-up to Open Day.",
    },
    {
      id: "cmp-radio-traffic",
      title: "Radio – traffic",
      channel: "radio-traffic",
      from: JUL_27,
      to: AUG_3,
      description: "Traffic-report sponsorship reads in the final week before Open Day.",
    },
    {
      id: "cmp-tiktok",
      title: "TikTok",
      channel: "tiktok",
      from: JUN_15,
      to: AUG_3,
      description: "In-feed video ads on TikTok.",
    },
    {
      id: "cmp-meta",
      title: "Meta",
      channel: "meta",
      from: JUN_15,
      to: AUG_3,
      description: "Facebook and Instagram feed, Stories and Reels placements.",
    },
    {
      id: "cmp-reddit",
      title: "Reddit",
      channel: "reddit",
      from: JUN_22,
      to: AUG_3,
      description: "Promoted posts targeting study and career communities.",
    },
    {
      id: "cmp-display",
      title: "Digital Display",
      channel: "display",
      from: JUN_15,
      to: AUG_3,
      description: "Programmatic banner display across news and lifestyle sites.",
    },
    {
      id: "cmp-weatherzone",
      title: "Weatherzone",
      channel: "weatherzone",
      from: JUL_20,
      to: AUG_3,
      description: "Display takeover on the Weatherzone site and app.",
    },
    {
      id: "cmp-google",
      title: "Google",
      channel: "google",
      from: JUN_15,
      to: AUG_3,
      description: "Paid search on course, ATAR and Open Day keywords.",
    },
    {
      id: "cmp-pmax",
      title: "Google Performance Max",
      channel: "pmax",
      from: JUL_6,
      to: AUG_3,
      description:
        "Google's automated cross-network buying (PMax) — one campaign served across Search, YouTube, Display, Gmail and Maps.",
    },
  ],
};

// Inbound engagement — Digital and Study@RMIT. Curves are generated from a
// baseline plus labelled peaks (0–100 relative volume).
export const inbound: InboundLaneData[] = [
  {
    id: "digital",
    baseline: 14,
    peaks: [
      { month: 19.4, height: 55, label: "Open Day spike" },
      { month: 31.5, height: 88, label: "Open Day spike" },
      { month: 32.6, height: 55 },
      { month: 35.9, height: 78, label: "Offers + CoP" },
    ],
  },
  {
    id: "study",
    baseline: 8,
    peaks: [
      { month: 19.6, height: 25 },
      { month: 31.7, height: 48, label: "Course questions" },
      { month: 32.7, height: 62, label: "VTAC close" },
      { month: 36, height: 92, label: "Offer + enrolment help" },
      { month: 37.2, height: 55 },
    ],
  },
];
