import type { Campaign, InboundLaneData } from "./types";

// Individual comms now live in public/data/comms.csv, loaded at runtime by
// src/lib/loadComms.ts — see that file for the column schema. That's the
// file to hand a coworker to fill in; edit it (or replace it with an
// export from a spreadsheet) and refresh the page.

// Always-on / burst marketing campaigns — duration bars in the Marketing lane.
export const campaigns: Campaign[] = [
  {
    id: "cmp-brand",
    title: "Always-on brand + consideration — Meta, Instagram",
    channel: "social",
    from: 0,
    to: 38,
  },
  {
    id: "cmp-tiktok",
    title: "Course discovery — TikTok, YouTube",
    channel: "video",
    from: 13,
    to: 23,
  },
  {
    id: "cmp-search",
    title: "Search — course + ATAR keywords",
    channel: "search",
    from: 26,
    to: 36,
  },
  {
    id: "cmp-openday",
    title: "Open Day burst — all channels",
    channel: "burst",
    from: 30,
    to: 32.2,
  },
  {
    id: "cmp-cop",
    title: "CoP + offers retargeting",
    channel: "retargeting",
    from: 34.8,
    to: 37,
  },
];

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
