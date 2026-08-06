// Timeline maths. The x-axis is time: month 0 = January of Year 10,
// month 37 = February after Year 12 (enrolment / O-Week).
// The base scale is (near-)UNIFORM — equal horizontal space = equal time —
// because the real comms volume is spread fairly evenly across Years 10-12
// (Year 11 is actually the densest). Density is handled on demand instead:
// ANY month can be expanded to week- then day-level width (see
// layoutTimeline / EXPANDED_MONTH_PX) so busy periods are inspected in place
// without a permanently distorted, over-weighted Year-12 season.

import { campaignGroups, campaignSpan } from "../data/comms";
import { YEARS } from "../data/journey";
import type { Comm, Team } from "../data/types";

export const MONTHS = 39; // through March 2027 — Sem 1 classes begin 1 Mar

interface Segment {
  from: number;
  to: number;
  pxPerMonth: number;
}

export const SEGMENTS: Segment[] = [
  { from: 0, to: 31.7, pxPerMonth: 120 }, // Years 10-12 up to the crunch — uniform
  { from: 31.7, to: 33, pxPerMonth: 350 }, // Decide/Begin/Submit — widened so these
  //                                          short, distinct stages stay legible
  { from: 33, to: 34.5, pxPerMonth: 120 }, // Oct – mid-Nov (Wait, exams)
  { from: 34.5, to: 36, pxPerMonth: 200 }, // the December drama — CoP sprint,
  //                                          results, offer round + post-offer
  //                                          cascade all land in ~6 weeks
  { from: 36, to: 39, pxPerMonth: 96 }, // post-school tail (enrolment run-in)
];

// One month at a time can be zoomed in two steps: level 1 spreads it into
// weeks, level 2 into days. Clicking a month header cycles
// collapsed → weeks → days → collapsed.
export interface ExpandedMonth {
  month: number;
  level: 1 | 2;
}

/** Which months are expanded, and to what level — month index → 1 (weeks) or
 *  2 (days). Multiple can be open at once. */
export type ExpandedMonths = Map<number, 1 | 2>;

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
let expandedMonthsState: ExpandedMonths = new Map();

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
  // Every expanded month before `month` shifts it right by that month's extra
  // width; a month sitting INSIDE an expanded one gets a partial share (its
  // day/week offset within the widened span). Summed across all of them, so any
  // number of months can be open at once.
  for (const [m, level] of expandedMonthsState) {
    if (month <= m) continue;
    const extraPerMonth = expandedMonthWidth(level) - basePxPerMonth(m);
    x += Math.min(month - m, 1) * extraPerMonth;
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
export const MONTH_H = 38; // two lines: month name + tiny "Yr 12 · Consider" context
export const MOMENT_H = 46; // moment-that-matters label track (two mini-lines)

// Student journey lane — an OPTIONAL lane under the stage/year rows, toggled
// on from the control dock (off by default so the comms map is uncluttered).
// When on, it shows each stage's QUESTIONS as coverage cards — hover one to
// light up its linked comms in place, no panel in the way. The deep-dive panel
// (voice/needs/decisions/actions) opens from the small info button per stage.
// See StudentJourneyLane.
export const STUDENT_LANE_H = 172;

// Whether the student-journey lane is currently shown — set by layoutTimeline
// from App's toggle. HEADER_H (and therefore every lane's `top`) shrinks by
// STUDENT_LANE_H when it's off, so the canvas reclaims that vertical space
// instead of leaving an empty band. Both the layout maths here and the
// conditional render in Timeline read the same App state, so they stay in sync.
let studentLayerVisible = false;
function headerHeight(): number {
  return STAGE_H + YEAR_H + (studentLayerVisible ? STUDENT_LANE_H : 0) + MONTH_H + MOMENT_H;
}
export let HEADER_H = headerHeight();

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

export const INBOUND_H = 96;
export const DIVIDER_H = 32;

const OUTBOUND_TEAMS: Team[] = ["recruitment", "marketing", "admissions", "conversion"];

// Campaign bars shown in the Marketing lane, in draw order: every media
// schedule contributes a (taller) summary bar, plus one bar per placement
// while it's expanded. Held as a flat list of row HEIGHTS so the two schedules
// can stack with different row counts. Mutable module state like the rest of
// the layout — set by layoutTimeline.
let campaignRowHeights: number[] = campaignGroups.map(() => CAMPAIGN_SUMMARY_H);

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
export const COLLAPSED_LANE_H = 54;

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
// Placed-card rectangles per team (card-area-relative bottoms), so a "+N more"
// chip can sit below the deepest card that actually overlaps its x — hugging
// its column without colliding with a taller neighbour. Set by layoutTimeline.
type PlacedRect = { x1: number; x2: number; bottom: number };
let placedByTeam: Record<Team, PlacedRect[]> = {
  recruitment: [],
  marketing: [],
  admissions: [],
  conversion: [],
};

/** Deepest placed-card bottom (card-area-relative) among cards overlapping the
 *  horizontal band [x, x+w] in a team's lane. */
function deepestBottomAt(team: Team, x: number, w: number): number {
  let d = 0;
  for (const p of placedByTeam[team]) {
    if (p.x1 < x + w && x < p.x2) d = Math.max(d, p.bottom);
  }
  return d;
}

/** Approx width of a "+N more" chip, for overlap tests. */
const CHIP_W = 90;

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

/** y of a "+N more" chip — tucked directly under its OWN month's card column
 *  (ROW_GAP below the deepest visible card in that month), so it reads as part
 *  of that stack rather than a lane-wide band. Falls back to a single card's
 *  depth for a month with nothing placed. */
export function chipY(team: Team, monthIndex: number): number {
  const lane = laneById(team);
  const x = scaleX(monthIndex) + 4;
  const depth = deepestBottomAt(team, x, CHIP_W) || DEFAULT_CARD_H;
  return lane.top + DOT_STRIP_H + LANE_PAD + depth + ROW_GAP;
}

/** Top of the campaign block, measured from the marketing lane's top. Sits
 *  ROW_GAP below the deepest content in its OWN x-span — cards, and any chip
 *  that tucks under a column in that span (see marketingCampaignArea). Tight,
 *  no lane-wide wasted space. */
function campaignBlockTop(): number {
  return DOT_STRIP_H + LANE_PAD + marketingCampaignArea + ROW_GAP + 2;
}

/** y of campaign row `index` — a flat index across every schedule's summary
 *  and (when expanded) placement rows, in the order Timeline draws them. */
export function campaignY(index: number): number {
  let y = laneById("marketing").top + campaignBlockTop();
  for (let i = 0; i < Math.min(index, campaignRowHeights.length); i++) {
    y += campaignRowHeights[i] + CAMPAIGN_GAP;
  }
  return y;
}

/** Bottom offset (from the marketing lane top) of the whole campaign block —
 *  so the lane can grow to fit it when the media schedules are deeper than the
 *  card stack (e.g. both expanded). Mirrors campaignY's geometry. */
function marketingCampaignBottom(): number {
  const rows = campaignRowHeights.reduce((sum, h) => sum + h, 0);
  const gaps = Math.max(campaignRowHeights.length - 1, 0) * CAMPAIGN_GAP;
  return campaignBlockTop() + rows + gaps + LANE_PAD;
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
  expandedMonths: ExpandedMonths = new Map(),
  heights: Record<string, number> = {},
  openCampaigns: Set<string> = new Set(),
  collapsedLanes: Set<string> = new Set(),
  studentLayer = false,
): TimelineLayout {
  // Set the header height before anything reads it (buildLanes anchors every
  // lane's `top` to HEADER_H).
  studentLayerVisible = studentLayer;
  HEADER_H = headerHeight();
  expandedMonthsState = expandedMonths;
  cardHeightById = heights;
  campaignRowHeights = campaignGroups.flatMap((g) => [
    CAMPAIGN_SUMMARY_H,
    ...(openCampaigns.has(g.id) ? g.channels.map(() => CAMPAIGN_H) : []),
  ]);
  TOTAL_W =
    baseScaleX(MONTHS) +
    140 +
    [...expandedMonths].reduce(
      (sum, [m, level]) => sum + expandedMonthWidth(level) - basePxPerMonth(m),
      0,
    );

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
  const nextPlaced: Record<Team, PlacedRect[]> = {
    recruitment: [],
    marketing: [],
    admissions: [],
    conversion: [],
  };
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
  const campFrom = scaleX(campaignSpan.from);
  const campTo = scaleX(campaignSpan.to);
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
      const inExpanded = expandedMonthsState.has(monthIndex);
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
    nextPlaced[team] = placed;
  }
  yOffsetById = nextY;
  cardAreaByTeam = nextCardArea;
  placedByTeam = nextPlaced;

  const chips: OverflowChip[] = [...chipCounts].map(([key, count]) => {
    const [team, mi] = key.split(":");
    return { team: team as Team, monthIndex: Number(mi), count };
  });
  // A marketing chip inside the campaign's x-span tucks under whatever cards
  // overlap its x, so the campaign block must clear that chip too. Chips
  // outside the span don't move the campaigns (they hug their own column).
  for (const chip of chips) {
    if (chip.team !== "marketing") continue;
    const cx = scaleX(chip.monthIndex) + 4;
    if (cx < campTo && campFrom < cx + CHIP_W) {
      const depth = deepestBottomAt("marketing", cx, CHIP_W) || DEFAULT_CARD_H;
      campArea = Math.max(campArea, depth + ROW_GAP + CHIP_H);
    }
  }
  marketingCampaignArea = campArea;

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
