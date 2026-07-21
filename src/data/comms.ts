import type { CampaignGroup, InboundLaneData } from "./types";

// Individual comms now live in server/data/comms.csv, loaded at runtime by
// src/lib/loadComms.ts — see that file for the column schema. That's the
// file to hand a coworker to fill in; edit it (or replace it with an
// export from a spreadsheet) and refresh the page.

// Media schedules — from the two "Campaign schedule" slides (digital + radio,
// and digital + static outdoor). Each is one summary bar in the Marketing
// lane, expandable to per-placement bars.
//
// Both slides are grids of WEEKS COMMENCING (Mondays), 15 June – 3 August, in
// the Year 12 season. A row filled through a column runs to the END of that
// week, so a buy shown in the "3 August" column runs to Sunday 9 August — the
// City/Brunswick Open Day. Likewise the "27 July" column ends Sunday 2 August,
// the Bundoora Open Day. The whole schedule is built around those two Sundays,
// so `to` is always the week's Sunday, not its Monday.
//
// Month floats: month 29 = June of Year 12, day d ≈ (d-1)/30 within the month.
const JUN = 29;
const JUL = 30;
const AUG = 31;
const d = (month: number, day: number) => month + (day - 1) / 30;

// Week-commencing Mondays (the slide's column headers)
const W_JUN_15 = d(JUN, 15);
const W_JUN_22 = d(JUN, 22);
const W_JUN_29 = d(JUN, 29);
const W_JUL_6 = d(JUL, 6);
const W_JUL_13 = d(JUL, 13);
const W_JUL_20 = d(JUL, 20);
const W_JUL_27 = d(JUL, 27);
// (no buy STARTS in the final 3 August week — it only ever runs through it,
// so that column appears below as the E_AUG_9 end date rather than a start.)

// Week-ending Sundays — where a bar actually stops
const E_JUL_19 = d(JUL, 19); // end of the 13 July week
const E_JUL_26 = d(JUL, 26); // end of the 20 July week
const E_AUG_2 = d(AUG, 2); // end of the 27 July week — Open Day, Bundoora
const E_AUG_9 = d(AUG, 9); // end of the 3 August week — Open Day, City & Brunswick

export const digitalRadioCampaign: CampaignGroup = {
  id: "cmp-digital-radio",
  title: "Digital and radio",
  from: W_JUN_15,
  to: E_AUG_9,
  channels: [
    {
      id: "cmp-youtube",
      title: "YouTube",
      channel: "youtube",
      from: W_JUN_15,
      to: E_AUG_9,
      description: "Video ads across YouTube — skippable in-stream and Shorts placements.",
    },
    {
      id: "cmp-livewire",
      title: "Livewire",
      channel: "livewire",
      from: W_JUN_15,
      to: E_AUG_9,
      description: "Gaming media network — ads inside games and gaming content.",
    },
    {
      id: "cmp-radio",
      title: "Radio",
      channel: "radio",
      from: W_JUL_6,
      // Off air for the final week — the slide greys out the 3 August column.
      to: E_AUG_2,
      description: "Broadcast radio spots in the lead-up to Open Day.",
    },
    {
      id: "cmp-radio-traffic",
      title: "Radio – traffic",
      channel: "radio-traffic",
      from: W_JUL_27,
      to: E_AUG_9,
      description: "Traffic-report sponsorship reads in the final week before Open Day.",
    },
    {
      id: "cmp-tiktok",
      title: "TikTok",
      channel: "tiktok",
      from: W_JUN_15,
      to: E_AUG_9,
      description: "In-feed video ads on TikTok.",
    },
    {
      id: "cmp-meta",
      title: "Meta",
      channel: "meta",
      from: W_JUN_15,
      to: E_AUG_9,
      description: "Facebook and Instagram feed, Stories and Reels placements.",
    },
    {
      id: "cmp-reddit",
      title: "Reddit",
      channel: "reddit",
      from: W_JUN_22,
      to: E_AUG_9,
      description: "Promoted posts targeting study and career communities.",
    },
    {
      id: "cmp-display",
      title: "Digital Display",
      channel: "display",
      from: W_JUN_15,
      to: E_AUG_9,
      description: "Programmatic banner display across news and lifestyle sites.",
    },
    {
      id: "cmp-weatherzone",
      title: "Weatherzone",
      channel: "weatherzone",
      from: W_JUL_20,
      to: E_AUG_9,
      description: "Display takeover on the Weatherzone site and app.",
    },
    {
      id: "cmp-google",
      title: "Google",
      channel: "google",
      from: W_JUN_15,
      to: E_AUG_9,
      description: "Paid search on course, ATAR and Open Day keywords.",
    },
    {
      id: "cmp-pmax",
      title: "Google Performance Max",
      channel: "pmax",
      from: W_JUL_6,
      to: E_AUG_9,
      description:
        "Google's automated cross-network buying (PMax) — one campaign served across Search, YouTube, Display, Gmail and Maps.",
    },
  ],
};

// Out-of-home buy, from the "Campaign schedule: digital and static outdoor"
// slide. The slide colour-codes placements by campus — City, Brunswick and
// Bundoora — and that campus-led naming is kept here (spelled out in full,
// rather than the slide's "Brun:"/"Bund:") so each row still says where it is.
// The Brunswick and Bundoora placements ring
// their own campus in the weeks before its Open Day; the city placements run
// latest, through to the 9 August City/Brunswick Open Day.
export const outdoorCampaign: CampaignGroup = {
  id: "cmp-outdoor",
  title: "Digital and static outdoor",
  from: W_JUN_29,
  to: E_AUG_9,
  channels: [
    // ── City ──
    {
      id: "cmp-jcd-smartframes",
      title: "JCD SmartFrames",
      channel: "smartframes",
      from: W_JUL_13,
      to: E_AUG_2,
      description: "JCDecaux digital SmartFrames across the city network.",
    },
    {
      id: "cmp-library-townhall-escalators",
      title: "State Library & Town Hall escalators",
      channel: "escalators",
      from: W_JUL_6,
      to: E_AUG_9,
      description:
        "Escalator panels in the State Library and Town Hall stations — read at eye level on the way up.",
    },
    {
      id: "cmp-library-wrap",
      title: "State Library Wrap",
      channel: "wrap",
      from: W_JUL_20,
      to: E_AUG_9,
      description: "Full station wrap at State Library — the flagship city placement.",
    },
    // ── Brunswick ──
    {
      id: "cmp-brun-dawson-st",
      title: "Brunswick: Dawson St 7-11",
      channel: "billboard",
      from: W_JUN_29,
      to: E_AUG_9,
      description: "Static billboard at the Dawson St 7-Eleven, Brunswick.",
    },
    {
      id: "cmp-brun-hope-st",
      title: "Brunswick: Hope St rail crossing",
      channel: "billboard",
      from: W_JUN_29,
      to: E_AUG_9,
      description: "Static billboard at the Hope St rail crossing, Brunswick.",
    },
    {
      id: "cmp-brun-tullamarine",
      title: "Brunswick: Tullamarine Fwy",
      channel: "billboard",
      from: W_JUN_29,
      to: E_JUL_19,
      description: "Tullamarine Freeway billboard — the early-burst Brunswick placement.",
    },
    {
      id: "cmp-brun-posters",
      title: "Brunswick: street/rock posters",
      channel: "posters",
      from: W_JUL_13,
      to: E_AUG_9,
      description: "Fly-posted street and rock posters through the Brunswick strip.",
    },
    // ── Bundoora ── (all wrap up after 26 July, ahead of the 2 August Open Day)
    {
      id: "cmp-bund-metro-ring-rd",
      title: "Bundoora: Metro Ring Rd",
      channel: "billboard",
      from: W_JUN_29,
      to: E_JUL_26,
      description: "Metropolitan Ring Road billboard on the approach to Bundoora.",
    },
    {
      id: "cmp-bund-dfo-uni-hill",
      title: "Bundoora: DFO Uni Hill",
      channel: "retail",
      from: W_JUN_29,
      to: E_JUL_26,
      description: "Retail placement at DFO Uni Hill, next door to the Bundoora campus.",
    },
    {
      id: "cmp-bund-northland",
      title: "Bundoora: Northland Shopping Centre",
      channel: "retail",
      from: W_JUN_29,
      to: E_JUL_26,
      description: "Retail placement inside Northland Shopping Centre.",
    },
    {
      id: "cmp-bund-hype-truck",
      title: "Bundoora: Hype Truck",
      channel: "truck",
      from: W_JUL_20,
      to: E_JUL_26,
      description:
        "Mobile billboard truck — a single week of roaming activation in the run-up to the Bundoora Open Day.",
    },
    {
      id: "cmp-bund-pt-street-furniture",
      title: "Bundoora: PT street furniture",
      channel: "street-furniture",
      from: W_JUN_29,
      to: E_JUL_26,
      description: "Bus and tram shelter panels on the public-transport routes into Bundoora.",
    },
  ],
};

// Every media schedule, in the order they stack in the Marketing lane.
export const campaignGroups: CampaignGroup[] = [digitalRadioCampaign, outdoorCampaign];

/** Every placement across all schedules — for id lookups (detail panels). */
export const allCampaignChannels = campaignGroups.flatMap((g) => g.channels);

/** Widest span any schedule covers — used to anchor the campaign block under
 *  the marketing cards that actually sit above it. */
export const campaignSpan = {
  from: Math.min(...campaignGroups.map((g) => g.from)),
  to: Math.max(...campaignGroups.map((g) => g.to)),
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
