// Timeline maths. The x-axis is time: month 0 = January of Year 10,
// month 37 = February after Year 12 (enrolment / O-Week).
// The base scale is (near-)UNIFORM — equal horizontal space = equal time —
// because the real comms volume is spread fairly evenly across Years 10-12
// (Year 11 is actually the densest). Density is handled on demand instead:
// ANY month can be expanded to week- then day-level width (see
// layoutTimeline / EXPANDED_MONTH_PX) so busy periods are inspected in place
// without a permanently distorted, over-weighted Year-12 season.

import { campaignGroup } from "../data/comms";
import { YEARS } from "../data/journey";
import type { Comm, Team } from "../data/types";

export const MONTHS = 38;

interface Segment {
  from: number;
  to: number;
  pxPerMonth: number;
}

export const SEGMENTS: Segment[] = [
  { from: 0, to: 31.7, pxPerMonth: 120 }, // Years 10-12 up to the crunch — uniform
  { from: 31.7, to: 33, pxPerMonth: 350 }, // Decide/Begin/Submit — widened so these
  //                                          short, distinct stages stay legible
  { from: 33, to: 36, pxPerMonth: 120 }, // Wait / Offer
  { from: 36, to: 38, pxPerMonth: 96 }, // post-school tail (no comms yet)
];

// One month at a time can be zoomed in two steps: level 1 spreads it into
// weeks, level 2 into days. Clicking a month header cycles
// collapsed → weeks → days → collapsed.
export interface ExpandedMonth {
  month: number;
  level: 1 | 2;
}

/** Widths of the one expanded month: week view (~105px/week) and day view
 *  (~30px/day). */
export const WEEK_MONTH_PX = 460;
export const EXPANDED_MONTH_PX = 900;

export function expandedMonthWidth(level: 1 | 2): number {
  return level === 1 ? WEEK_MONTH_PX : EXPANDED_MONTH_PX;
}

/** Max card rows a lane shows for collapsed months — beyond this, comms
 *  fold into a "+N more" chip that expands the month. With collage packing
 *  this is enforced as a pixel depth (see PACK_CAP_PX in layoutTimeline):
 *  a card whose packed position would land deeper than ~ROW_CAP default
 *  rows folds instead, so dense chains can't balloon the lane height. */
export const ROW_CAP = 6;

// Which month is currently expanded, and to what level. Module state, set by
// layoutTimeline — components re-render via React state in App, then read
// the updated scale during that render.
let expandedMonthState: ExpandedMonth | null = null;

function baseScaleX(month: number): number {
  let x = 0;
  for (const s of SEGMENTS) {
    if (month <= s.from) break;
    const end = Math.min(month, s.to);
    x += (end - s.from) * s.pxPerMonth;
    if (month <= s.to) break;
  }
  return x;
}

function basePxPerMonth(month: number): number {
  const seg = SEGMENTS.find((s) => month >= s.from && month < s.to);
  return (seg ?? SEGMENTS[SEGMENTS.length - 1]).pxPerMonth;
}

export function scaleX(month: number): number {
  let x = baseScaleX(month);
  const e = expandedMonthState;
  if (e !== null && month > e.month) {
    const extraPerMonth = expandedMonthWidth(e.level) - basePxPerMonth(e.month);
    x += Math.min(month - e.month, 1) * extraPerMonth;
  }
  return x;
}

// Trailing padding so late-February cards have room instead of clamping
// onto each other at the right edge. Reassigned by layoutTimeline when a
// month expands (live binding — importers see the update).
export let TOTAL_W = baseScaleX(MONTHS) + 140;

// ---- Vertical layout ----

export const LABEL_W = 184; // sticky team-label gutter
export const STAGE_H = 36;
export const YEAR_H = 30;
export const MONTH_H = 26;
export const MOMENT_H = 46; // moment-that-matters label track (two mini-lines)

// Student journey lane — the map's spine, a PERMANENT lane under the
// stage/year rows. Shows each stage's QUESTIONS directly — hover one to light
// up its linked comms in place, no panel in the way. The deep-dive panel
// (voice/needs/decisions/actions) opens from the small info button per stage.
// See StudentJourneyLane.
export const STUDENT_LANE_H = 172;
export const HEADER_H = STAGE_H + YEAR_H + STUDENT_LANE_H + MONTH_H + MOMENT_H;

// Comms render as a DOT on the exact date (on a baseline strip at the top of
// each lane) plus a chip below it, connected by a stem. The chip carries the
// type (tinted fill + icon) and CTA so both are scannable at a glance; its
// height is MEASURED in the DOM (varies with title length / CTA presence).
// PILL_H is the minimum; DEFAULT_CARD_H is a realistic fallback used for
// unmeasured chips and the fold cap; CARD_H is a legacy trigger-line anchor.
export const CARD_W = 172;
export const PILL_H = 28;
export const DEFAULT_CARD_H = 56;
export const CARD_H = DEFAULT_CARD_H;
export const ROW_GAP = 8;
export const LANE_PAD = 12;
/** strip at the top of each outbound lane where the date dots sit */
export const DOT_STRIP_H = 18;
/** dot centre y within the strip */
export const DOT_Y = 9;

export const CHIP_H = 22; // "+N more" overflow chip strip

export const CAMPAIGN_H = 24;
export const CAMPAIGN_GAP = 6;
// The group summary bar (row 0) is taller so its label can wrap to two lines
// like the comm cards, instead of truncating. Channel rows shift down by the
// difference. Keep in sync with CampaignBar's summary rendering.
export const CAMPAIGN_SUMMARY_H = 44;
const CAMPAIGN_SUMMARY_EXTRA = CAMPAIGN_SUMMARY_H - CAMPAIGN_H;

export const INBOUND_H = 96;
export const DIVIDER_H = 32;

const OUTBOUND_TEAMS: Team[] = ["recruitment", "marketing", "admissions", "conversion"];

// Campaign bars shown in the Marketing lane: the "Digital and radio" summary
// bar alone, or summary + one bar per channel when expanded. Mutable module
// state like the rest of the layout — set by layoutTimeline.
let visibleCampaignRows = 1;

export interface LaneDef {
  id: Team | "digital" | "study" | "divider";
  label: string;
  sub?: string;
  top: number;
  height: number;
  kind: "outbound" | "inbound" | "divider";
  /** whether this lane reserves a strip for "+N more" chips */
  chipStrip: boolean;
}

/** Height of a lane's card block: dot strip + packed chip area + bottom
 *  padding + optional "+N more" strip. `cardArea` already includes the
 *  inter-row gaps. */
function laneBlockHeight(cardArea: number, chipStrip: boolean): number {
  return DOT_STRIP_H + LANE_PAD + cardArea + LANE_PAD + (chipStrip ? CHIP_H + 8 : 0);
}

/** Collapsed lanes shrink to just their gutter label strip; their comms /
 *  campaigns / curves aren't rendered. */
export const COLLAPSED_LANE_H = 40;

function buildLanes(
  cardAreaPerTeam: Record<Team, number>,
  chipTeams: Set<Team>,
  collapsed: Set<string>,
): LaneDef[] {
  const outbound = (id: Team, label: string, sub: string): Omit<LaneDef, "top"> => ({
    id,
    label,
    sub,
    kind: "outbound",
    chipStrip: !collapsed.has(id) && chipTeams.has(id),
    height: collapsed.has(id)
      ? COLLAPSED_LANE_H
      : id === "marketing"
        ? // fit whichever is deeper: the card stack or the campaign block
          Math.max(
            laneBlockHeight(cardAreaPerTeam.marketing, chipTeams.has("marketing")),
            marketingCampaignBottom(),
          )
        : laneBlockHeight(cardAreaPerTeam[id], chipTeams.has(id)),
  });
  const inbound = (id: "digital" | "study", label: string): Omit<LaneDef, "top"> => ({
    id,
    label,
    sub: "Inbound",
    kind: "inbound",
    chipStrip: false,
    height: collapsed.has(id) ? COLLAPSED_LANE_H : INBOUND_H,
  });

  const defs: Array<Omit<LaneDef, "top">> = [
    outbound("recruitment", "Recruitment", "Outbound"),
    outbound("marketing", "Marketing", "Outbound + always-on"),
    outbound("admissions", "Admissions", "Outbound"),
    outbound("conversion", "Conversion", "Outbound"),
    { id: "divider", label: "Inbound Engagement", kind: "divider", height: DIVIDER_H, chipStrip: false },
    inbound("digital", "Digital"),
    inbound("study", "Study@RMIT"),
  ];
  let top = HEADER_H;
  return defs.map((d) => {
    const lane = { ...d, top };
    top += d.height;
    return lane;
  });
}

// Mutable — rebuilt by layoutTimeline once comms load (and again whenever a
// month expands/collapses), since packing and lane heights depend on how
// densely comms cluster at the current scale. Live bindings, so every
// importer sees the update.
// yOffsetById[id] is a card's y within its lane's card area, computed by
// collage-style (skyline) packing; cardAreaByTeam[team] is the total
// card-area height the packed cards occupy.
let yOffsetById = new Map<string, number>();
let cardAreaByTeam: Record<Team, number> = {
  recruitment: DEFAULT_CARD_H,
  marketing: DEFAULT_CARD_H,
  admissions: DEFAULT_CARD_H,
  conversion: DEFAULT_CARD_H,
};
// Card depth (within the card area) that the media schedule must clear — the
// deepest marketing card in the campaign's own x-span, NOT the lane-wide max.
// Keeps the campaign block tucked under its local cards instead of the lane
// bottom. Set by layoutTimeline; used by campaignY and buildLanes.
let marketingCampaignArea = DEFAULT_CARD_H;

// Measured card heights by comm id (from layoutTimeline's `heights` arg).
// Exposed so connectors can anchor to a card's real bottom/centre instead of
// the DEFAULT_CARD_H slot, which would leave a gap under short cards.
let cardHeightById: Record<string, number> = {};

/** Measured pixel height of a comm's card (DEFAULT_CARD_H until measured). */
export function commHeight(id: string): number {
  return cardHeightById[id] ?? DEFAULT_CARD_H;
}

export let LANES: LaneDef[] = buildLanes(cardAreaByTeam, new Set(), new Set());
export let TOTAL_H = LANES[LANES.length - 1].top + LANES[LANES.length - 1].height;

export function laneById(id: string): LaneDef {
  const lane = LANES.find((l) => l.id === id);
  if (!lane) throw new Error(`Unknown lane: ${id}`);
  return lane;
}

export function commPos(comm: Pick<Comm, "id" | "team" | "month">) {
  const lane = laneById(comm.team);
  const x = Math.min(scaleX(comm.month), TOTAL_W - CARD_W - 4);
  const y = lane.top + DOT_STRIP_H + LANE_PAD + (yOffsetById.get(comm.id) ?? 0);
  return { x, y };
}

/** y of a team lane's date-dot centres (the baseline strip at the top). */
export function dotY(team: Team): number {
  return laneById(team).top + DOT_Y;
}

/** y of a team lane's "+N more" chip strip (below the last card row). */
export function chipY(team: Team): number {
  const lane = laneById(team);
  return lane.top + DOT_STRIP_H + LANE_PAD + cardAreaByTeam[team] + 8;
}

export function campaignY(index: number): number {
  const lane = laneById("marketing");
  // Sits ROW_GAP below the deepest card in its own column — same tight gap the
  // comm cards have between each other. No "+N more" chip-strip reservation:
  // the chips live at the lane-wide depth off to the sides, not in this column.
  const base =
    lane.top +
    DOT_STRIP_H +
    LANE_PAD +
    marketingCampaignArea +
    ROW_GAP +
    2 +
    index * (CAMPAIGN_H + CAMPAIGN_GAP);
  // Channel rows (index ≥ 1) sit below the taller two-line summary bar.
  return index === 0 ? base : base + CAMPAIGN_SUMMARY_EXTRA;
}

/** Bottom offset (from the marketing lane top) of the whole campaign block —
 *  so the lane can grow to fit it when the media schedule is deeper than the
 *  card stack (e.g. all channels expanded). Mirrors campaignY's geometry. */
function marketingCampaignBottom(): number {
  const c0 = DOT_STRIP_H + LANE_PAD + marketingCampaignArea + ROW_GAP + 2;
  const last = visibleCampaignRows - 1;
  const bottom =
    last === 0
      ? c0 + CAMPAIGN_SUMMARY_H
      : c0 + CAMPAIGN_SUMMARY_EXTRA + last * (CAMPAIGN_H + CAMPAIGN_GAP) + CAMPAIGN_H;
  return bottom + LANE_PAD;
}

export interface OverflowChip {
  team: Team;
  monthIndex: number;
  count: number;
}

export interface TimelineLayout {
  comms: Comm[];
  hiddenIds: Set<string>;
  chips: OverflowChip[];
}

// Lays the whole timeline out for the given expanded month (or none):
// updates the scale, collage-packs each comm into the highest free slot in
// its team's lane (see PACK_CAP_PX below), folds anything that would land
// deeper than the cap into "+N more" chips, and rebuilds lane heights.
// Comms in the expanded month are never folded — expanding is how you see
// them all, spread day by day.
export function layoutTimeline(
  raw: Comm[],
  expandedMonth: ExpandedMonth | null,
  heights: Record<string, number> = {},
  campaignsOpen = false,
  collapsedLanes: Set<string> = new Set(),
): TimelineLayout {
  expandedMonthState = expandedMonth;
  cardHeightById = heights;
  visibleCampaignRows = 1 + (campaignsOpen ? campaignGroup.channels.length : 0);
  TOTAL_W =
    baseScaleX(MONTHS) +
    140 +
    (expandedMonth !== null
      ? expandedMonthWidth(expandedMonth.level) - basePxPerMonth(expandedMonth.month)
      : 0);

  const GAP = 8;
  const chipCounts = new Map<string, number>(); // "team:monthIndex" -> hidden count
  const hiddenIds = new Set<string>();

  // Collage-style (best-fit skyline) packing with a hard depth cap. Each
  // card takes the HIGHEST free slot among the cards it actually overlaps
  // horizontally — never a global row baseline — so a short card's gap
  // can't inherit the height of a tall card months away. A card whose best
  // slot would land deeper than ~ROW_CAP default rows folds into that
  // month's "+N more" chip instead (folding and placement are the same
  // pass, so lane height genuinely cannot exceed the cap), except inside
  // the expanded month, where everything shows.
  const PACK_CAP_PX = ROW_CAP * DEFAULT_CARD_H + (ROW_CAP - 1) * ROW_GAP;
  const nextY = new Map<string, number>();
  const nextCardArea: Record<Team, number> = {
    recruitment: DEFAULT_CARD_H,
    marketing: DEFAULT_CARD_H,
    admissions: DEFAULT_CARD_H,
    conversion: DEFAULT_CARD_H,
  };
  // The media schedule sits below the marketing cards, but only needs to
  // clear the cards in ITS OWN column (the campaign x-span) — not the lane's
  // globally-deepest stack (e.g. the dense COP cluster far to the right).
  // Otherwise a big empty gap opens above it at the campaign's position.
  const campFrom = scaleX(campaignGroup.from);
  const campTo = scaleX(campaignGroup.to);
  let campArea = DEFAULT_CARD_H;
  for (const team of OUTBOUND_TEAMS) {
    // Collapsed lanes contribute no card area (they shrink to the label
    // strip) and their comms aren't placed — buildLanes overrides the height.
    if (collapsedLanes.has(team)) {
      nextCardArea[team] = DEFAULT_CARD_H;
      continue;
    }
    const list = raw.filter((c) => c.team === team).sort((a, b) => a.month - b.month);
    const placed: { x1: number; x2: number; y: number; bottom: number }[] = [];
    let area = 0;
    for (const c of list) {
      const x1 = Math.min(scaleX(c.month), TOTAL_W - CARD_W - 4);
      const x2 = x1 + CARD_W + GAP;
      const h = heights[c.id] ?? DEFAULT_CARD_H;
      const overlapping = placed.filter((p) => x1 < p.x2 && p.x1 < x2);
      const candidates = [0, ...overlapping.map((p) => p.bottom + ROW_GAP)].sort(
        (a, b) => a - b,
      );
      const y =
        candidates.find((cy) =>
          overlapping.every((p) => cy + h + ROW_GAP <= p.y || cy >= p.bottom + ROW_GAP),
        ) ?? 0;

      const monthIndex = Math.floor(c.month);
      const inExpanded = expandedMonth !== null && monthIndex === expandedMonth.month;
      if (y + h > PACK_CAP_PX && !inExpanded) {
        hiddenIds.add(c.id);
        const key = `${team}:${monthIndex}`;
        chipCounts.set(key, (chipCounts.get(key) ?? 0) + 1);
        continue; // not placed — later cards can take the slot it would have
      }
      placed.push({ x1, x2, y, bottom: y + h });
      nextY.set(c.id, y);
      area = Math.max(area, y + h);
      if (team === "marketing" && x1 < campTo && campFrom < x2) {
        campArea = Math.max(campArea, y + h);
      }
    }
    nextCardArea[team] = Math.max(area, DEFAULT_CARD_H);
  }
  yOffsetById = nextY;
  cardAreaByTeam = nextCardArea;
  marketingCampaignArea = campArea;

  const chips: OverflowChip[] = [...chipCounts].map(([key, count]) => {
    const [team, mi] = key.split(":");
    return { team: team as Team, monthIndex: Number(mi), count };
  });

  LANES = buildLanes(nextCardArea, new Set(chips.map((c) => c.team)), collapsedLanes);
  TOTAL_H = LANES[LANES.length - 1].top + LANES[LANES.length - 1].height;

  return {
    comms: raw,
    hiddenIds,
    chips,
  };
}

export const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function monthLabel(m: number): string {
  return MONTH_LABELS[m % 12];
}

export function commDateLabel(month: number): string {
  const year = YEARS.find((y) => month >= y.from && month < y.to) ?? YEARS[YEARS.length - 1];
  return `${monthLabel(Math.floor(month))} · ${year.label}`;
}

/** "15 Jun – 3 Aug" for a campaign's from/to month floats (date range only). */
export function campaignRangeLabel(from: number, to: number): string {
  const dayOf = (m: number) => Math.round((m % 1) * 30) + 1;
  return `${dayOf(from)} ${monthLabel(Math.floor(from))} – ${dayOf(to)} ${monthLabel(Math.floor(to))}`;
}
