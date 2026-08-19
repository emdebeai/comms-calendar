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

// Always-on — the year-round brand paid-media programme (source: Marketing's
// "What is the 'Always On' campaign?" slides). Top-of-funnel, all RMIT
// audiences, running every week of the year — so it renders as the campaigns
// lane's floor band, not a dated bar. Seasonal messaging phases and the S1
// conversion bursts (the slides' second and third rows) are drawn inside the
// band; the personalisation team's two always-on retargeting placements are
// folded in as channels alongside the media mix.
const MAP_START = 0; // Jan, Year 10
const MAP_END = 39; // Mar, post-school year

export const alwaysOnCampaign: CampaignGroup = {
  id: "cmp-always-on",
  title: "Always-on — brand media",
  from: MAP_START,
  to: MAP_END,
  channels: [
    {
      id: "cmp-ao-youtube",
      title: "YouTube",
      channel: "youtube",
      from: MAP_START,
      to: MAP_END,
      description:
        "Video awareness in 15sec formats, supported by 6sec retargeting.",
    },
    {
      id: "cmp-ao-meta",
      title: "Meta",
      channel: "meta",
      from: MAP_START,
      to: MAP_END,
      description:
        "Broad awareness across Facebook and Instagram — a mix of video, statics and carousels.",
    },
    {
      id: "cmp-ao-spotify",
      title: "Spotify",
      channel: "spotify",
      from: MAP_START,
      to: MAP_END,
      description: "30sec audio ads reinforcing brand awareness with a highly engaged audience.",
    },
    {
      id: "cmp-ao-linkedin",
      title: "LinkedIn",
      channel: "linkedin",
      from: MAP_START,
      to: MAP_END,
      description:
        "Reaching professionals and career changers — part of the all-audiences programme, minor for this persona.",
    },
    {
      id: "cmp-ao-reddit",
      title: "Reddit",
      channel: "reddit",
      from: MAP_START,
      to: MAP_END,
      description: "Conversation ads and promoted posts driving leads.",
    },
    {
      id: "cmp-ao-google",
      title: "Google",
      channel: "google",
      from: MAP_START,
      to: MAP_END,
      description: "Paid search across the year on course and brand terms.",
    },
    {
      id: "cmp-ao-display",
      title: "Digital display",
      channel: "display",
      from: MAP_START,
      to: MAP_END,
      description:
        "Prospecting, retargeting and scaled reach via lookalike and predictive audiences — bought through Adobe Advertising Cloud.",
    },
    {
      id: "cmp-ao-program-retarget",
      title: "Program page visitor — dynamic creative",
      channel: "retargeting",
      from: MAP_START,
      to: MAP_END,
      description:
        "Dynamic creative advertising retargeting program-page visitors — creative follows the program viewed. (Personalisation: 'Program page visitor > Dynamic creative advertising'.)",
    },
    {
      id: "cmp-ao-leads-retarget",
      title: "Enquiries / leads by interest area",
      channel: "leads",
      from: MAP_START,
      to: MAP_END,
      description:
        "Lead-based media retargeting for students who submitted an enquiry, segmented by interest area and level of study. (Personalisation: 'Enquiries/Leads by IA > Advertising'.)",
    },
  ],
};

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
export const campaignGroups: CampaignGroup[] = [alwaysOnCampaign, digitalRadioCampaign, outdoorCampaign];

/** The dated seasonal flights — everything that renders as bars. Always-on is
 *  excluded: it renders as the lane's floor band (see AlwaysOnBand). Both
 *  flights are the OPEN DAY campaign's media buys, and render nested under
 *  its block in the campaign strip. */
export const flightGroups: CampaignGroup[] = [digitalRadioCampaign, outdoorCampaign];



/** Every placement across all schedules — for id lookups (detail panels). */
export const allCampaignChannels = campaignGroups.flatMap((g) => g.channels);

/** Widest span any schedule covers — used to anchor the campaign block under
 *  the marketing cards that actually sit above it. */
/** Widest span the FLIGHTS cover — i.e. the Open Day campaign's true window:
 *  the campaign spans exactly the media buys inside it. */
export const campaignSpan = {
  from: Math.min(...flightGroups.map((g) => g.from)),
  to: Math.max(...flightGroups.map((g) => g.to)),
};

/** One row of the campaigns lane. The lane is a tree: always-on + the four
 *  main campaigns; Open Day expands (chevron) into its two media schedules,
 *  and each schedule expands into its placements — all computed here so the
 *  layout (lane height) and the renderer always agree. */
export interface CampaignRow {
  id: string;
  label: string;
  from: number;
  to: number;
  /** tree depth: 0 campaign · 1 schedule · 2 placement */
  depth: 0 | 1 | 2;
  /** has children — renders a chevron and toggles on click */
  toggle?: boolean;
  expanded?: boolean;
  /** placement rows carry their channel for the icon + detail panel */
  channel?: CampaignGroup["channels"][number]["channel"];
  /** spans the whole map — label says "all year" instead of dates */
  allYear?: boolean;
}

/** Rows of the campaigns lane for the current expansion state (row ids). */
export function buildCampaignRows(expanded: Set<string>): CampaignRow[] {
  const rows: CampaignRow[] = [
    {
      id: alwaysOnCampaign.id,
      label: "Always-on — brand media",
      from: alwaysOnCampaign.from,
      to: alwaysOnCampaign.to,
      depth: 0,
      allYear: true,
    },
    { id: "early-awareness", label: "Early awareness — emails and socials", from: 24, to: 29, depth: 0 },
    {
      id: "open-day",
      label: "Open Day",
      from: campaignSpan.from,
      to: campaignSpan.to,
      depth: 0,
      toggle: true,
      expanded: expanded.has("open-day"),
    },
  ];
  if (expanded.has("open-day")) {
    for (const g of flightGroups) {
      rows.push({
        id: g.id,
        label: `${g.title} — ${g.channels.length} placements`,
        from: g.from,
        to: g.to,
        depth: 1,
        toggle: true,
        expanded: expanded.has(g.id),
      });
      if (expanded.has(g.id)) {
        for (const c of g.channels) {
          rows.push({ id: c.id, label: c.title, from: c.from, to: c.to, depth: 2, channel: c.channel });
        }
      }
    }
  }
  rows.push(
    { id: "vtac-timely", label: "VTAC Timely", from: 32, to: 33.5, depth: 0 },
    { id: "cop", label: "Change of Preference", from: 34, to: 36, depth: 0 },
  );
  return rows;
}

// Inbound engagement — Digital and Study@RMIT. Curves are generated from a
// baseline plus labelled peaks (0–100 relative volume).
export const inbound: InboundLaneData[] = [
  {
    id: "digital",
    baseline: 14,
    // Real weekly traffic (Adobe, "inferred school leaver" segment, People per
    // week) mapped onto the Year 12 · 2026 band only — the extract runs
    // Aug 2025 – Aug 2026, so only its 2026 portion lands in the band and the
    // Yr 10/11 bands stay deliberately blank (no measured SL series there).
    series: [
      { month: 24.100, value: 932 }, // w/c 4 Jan
      { month: 24.333, value: 1090 }, // w/c 11 Jan
      { month: 24.567, value: 1169 }, // w/c 18 Jan
      { month: 24.800, value: 1186 }, // w/c 25 Jan
      { month: 25.000, value: 1373 }, // w/c 1 Feb
      { month: 25.233, value: 1341 }, // w/c 8 Feb
      { month: 25.467, value: 1288 }, // w/c 15 Feb
      { month: 25.700, value: 1250 }, // w/c 22 Feb
      { month: 26.000, value: 1115 }, // w/c 1 Mar
      { month: 26.233, value: 1193 }, // w/c 8 Mar
      { month: 26.467, value: 1352 }, // w/c 15 Mar
      { month: 26.700, value: 1557 }, // w/c 22 Mar
      { month: 26.933, value: 1197 }, // w/c 29 Mar
      { month: 27.133, value: 1005 }, // w/c 5 Apr
      { month: 27.367, value: 1090 }, // w/c 12 Apr
      { month: 27.600, value: 1386 }, // w/c 19 Apr
      { month: 27.833, value: 1271 }, // w/c 26 Apr
      { month: 28.067, value: 1181 }, // w/c 3 May
      { month: 28.300, value: 1236 }, // w/c 10 May
      { month: 28.533, value: 1225 }, // w/c 17 May
      { month: 28.767, value: 1162 }, // w/c 24 May
      { month: 29.000, value: 1129 }, // w/c 31 May
      { month: 29.200, value: 1128 }, // w/c 7 Jun
      { month: 29.433, value: 1132 }, // w/c 14 Jun
      { month: 29.667, value: 1197 }, // w/c 21 Jun
      { month: 29.900, value: 867 }, // w/c 28 Jun
      { month: 30.133, value: 1706 }, // w/c 5 Jul
      { month: 30.367, value: 2113 }, // w/c 12 Jul
      { month: 30.600, value: 3491 }, // w/c 19 Jul
      { month: 30.833, value: 3898 }, // w/c 26 Jul
      // Aug – Dec below are the extract's 2025 weeks placed AS IF 2026 (by
      // calendar position), completing the Jan – Dec cycle on the Year 12
      // band — same indicative treatment as the Study@RMIT and VTAC lanes.
      // (The 2025 w/c 27 Jul week is skipped — its calendar slot is already
      // held by the real 2026 reading.)
      { month: 31.067, value: 3190 }, // w/c 3 Aug (2025)
      { month: 31.300, value: 2588 }, // w/c 10 Aug (2025)
      { month: 31.533, value: 1642 }, // w/c 17 Aug (2025)
      { month: 31.767, value: 1429 }, // w/c 24 Aug (2025)
      { month: 32.000, value: 1315 }, // w/c 31 Aug (2025)
      { month: 32.200, value: 1224 }, // w/c 7 Sep (2025)
      { month: 32.433, value: 1154 }, // w/c 14 Sep (2025)
      { month: 32.667, value: 1049 }, // w/c 21 Sep (2025)
      { month: 32.900, value: 1013 }, // w/c 28 Sep (2025)
      { month: 33.133, value: 1144 }, // w/c 5 Oct (2025)
      { month: 33.367, value: 1147 }, // w/c 12 Oct (2025)
      { month: 33.600, value: 2261 }, // w/c 19 Oct (2025)
      { month: 33.833, value: 3024 }, // w/c 26 Oct (2025)
      { month: 34.033, value: 1676 }, // w/c 2 Nov (2025)
      { month: 34.267, value: 1134 }, // w/c 9 Nov (2025)
      { month: 34.500, value: 1217 }, // w/c 16 Nov (2025)
      { month: 34.733, value: 1086 }, // w/c 23 Nov (2025)
      { month: 34.967, value: 1104 }, // w/c 30 Nov (2025)
      { month: 35.200, value: 1919 }, // w/c 7 Dec (2025)
      { month: 35.433, value: 1206 }, // w/c 14 Dec (2025)
      { month: 35.667, value: 909 }, // w/c 21 Dec (2025)
      { month: 35.900, value: 671 }, // w/c 28 Dec (2025)
    ],
    seriesNote: "Adobe — weekly visitors, inferred school leavers · Jan–Jul 2026 + Aug–Dec 2025 placed by calendar month",
    peaks: [
      { month: 30.833, height: 0, label: "Open Day lead-up" },
      { month: 31.067, height: 0, label: "Open Day" },
      { month: 33.833, height: 0, label: "Exam lead-up" },
      { month: 35.2, height: 0, label: "Results + CoP" },
    ],
  },
  {
    id: "study",
    baseline: 8,
    peaks: [],
    // Study@RMIT SL enquiry volume by channel (Salesforce, Aug 2025 – Mar 2026
    // extract). Months are placed by CALENDAR position on the Year 12 band —
    // like the VTAC lane, indicative cycle rather than 2026-aligned. Outbound
    // Phone and "Other" are excluded (inbound enquiries only); March is
    // omitted (3 records — partial month at the extract cut-off). Counts are
    // STUDENTS ONLY ("I am currently" = Studying Year 12 / Completed VCE) —
    // parent and careers-advisor enquiries (~5%) are excluded from this
    // persona's lane; see studyatrawdata.xlsx for the record-level source.
    // Zeros are
    // months where the channel logged nothing. The Feb → Aug gap is real
    // (nothing in the extract between the two runs), so lines break there.
    seriesNote: "Salesforce — SL enquiries by channel, students only (Yr 12 / completed VCE) · Aug 2025 – Feb 2026, placed by calendar month",
    channels: [
      { label: "Phone", color: "--color-indigo", points: [
        { month: 24.5, value: 214 }, { month: 25.5, value: 58 },
        { month: 31.5, value: 33 }, { month: 32.5, value: 26 }, { month: 33.5, value: 28 }, { month: 34.5, value: 28 }, { month: 35.5, value: 395 },
      ]},
      { label: "Chat", color: "--color-teal", points: [
        { month: 24.5, value: 140 }, { month: 25.5, value: 64 },
        { month: 31.5, value: 193 }, { month: 32.5, value: 177 }, { month: 33.5, value: 110 }, { month: 34.5, value: 36 }, { month: 35.5, value: 347 },
      ]},
      { label: "Webform", color: "--color-rmit-blue-interactive", points: [
        { month: 24.5, value: 34 }, { month: 25.5, value: 15 },
        { month: 31.5, value: 113 }, { month: 32.5, value: 78 }, { month: 33.5, value: 63 }, { month: 34.5, value: 58 }, { month: 35.5, value: 45 },
      ]},
      { label: "Face-to-face", color: "--color-pink", points: [
        { month: 24.5, value: 28 }, { month: 25.5, value: 6 },
        { month: 31.5, value: 0 }, { month: 32.5, value: 0 }, { month: 33.5, value: 0 }, { month: 34.5, value: 7 }, { month: 35.5, value: 38 },
      ]},
      { label: "Email", color: "--color-purple", points: [
        { month: 24.5, value: 0 }, { month: 25.5, value: 0 },
        { month: 31.5, value: 29 }, { month: 32.5, value: 17 }, { month: 33.5, value: 28 }, { month: 34.5, value: 3 }, { month: 35.5, value: 0 },
      ]},
      { label: "Meeting", color: "--color-amber", points: [
        { month: 24.5, value: 0 }, { month: 25.5, value: 0 },
        { month: 31.5, value: 3 }, { month: 32.5, value: 1 }, { month: 33.5, value: 4 }, { month: 34.5, value: 0 }, { month: 35.5, value: 0 },
      ]},
    ],
  },
];
