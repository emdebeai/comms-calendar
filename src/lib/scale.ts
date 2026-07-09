// Timeline maths. The x-axis is time: month 0 = January of Year 10,
// month 37 = February after Year 12 (enrolment / O-Week).
// The scale is deliberately non-linear — Year 12's application season is
// where the comms density lives, so it gets more horizontal room. On top of
// that, ONE month can be expanded to day-level width (see layoutTimeline):
// the expanded month stretches to EXPANDED_MONTH_PX while everything else
// keeps its normal width, so dense periods can be inspected day by day
// without the whole 38-month canvas ballooning.

import { campaigns } from "../data/comms";
import { YEARS } from "../data/journey";
import type { Comm, Team } from "../data/types";

export const MONTHS = 38;

interface Segment {
  from: number;
  to: number;
  pxPerMonth: number;
}

export const SEGMENTS: Segment[] = [
  { from: 0, to: 12, pxPerMonth: 56 }, // Year 10
  { from: 12, to: 24, pxPerMonth: 72 }, // Year 11
  { from: 24, to: 29, pxPerMonth: 96 }, // Year 12 Jan–May
  { from: 29, to: 36, pxPerMonth: 150 }, // Year 12 Jun–Dec (application season)
  { from: 36, to: 38, pxPerMonth: 130 }, // Jan–Feb after Year 12
];

/** Width of the one expanded (day view) month. ~30px per day. */
export const EXPANDED_MONTH_PX = 900;

/** Max card rows a lane shows for collapsed months — beyond this, comms
 *  fold into a "+N more" chip that expands the month. */
export const ROW_CAP = 3;

// Which month (integer index) is currently expanded. Module state, set by
// layoutTimeline — components re-render via React state in App, then read
// the updated scale during that render.
let expandedMonthState: number | null = null;

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
  if (e !== null && month > e) {
    const extraPerMonth = EXPANDED_MONTH_PX - basePxPerMonth(e);
    x += Math.min(month - e, 1) * extraPerMonth;
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
export const HEADER_H = STAGE_H + YEAR_H + MONTH_H + MOMENT_H;

export const CARD_W = 172;
export const CARD_H = 64;
export const ROW_GAP = 10;
export const LANE_PAD = 14;

export const CHIP_H = 22; // "+N more" overflow chip strip

export const CAMPAIGN_H = 24;
export const CAMPAIGN_GAP = 6;

export const INBOUND_H = 96;
export const DIVIDER_H = 32;

const OUTBOUND_TEAMS: Team[] = ["recruitment", "marketing", "admissions", "conversion"];

export interface LaneDef {
  id: Team | "digital" | "study" | "divider";
  label: string;
  sub?: string;
  top: number;
  height: number;
  kind: "outbound" | "inbound" | "divider";
  rows: number;
  /** whether this lane reserves a strip for "+N more" chips */
  chipStrip: boolean;
}

/** Height of a lane's card area: padding + rows + optional chip strip. */
function commArea(rows: number, chipStrip: boolean): number {
  return (
    LANE_PAD * 2 +
    rows * CARD_H +
    (rows - 1) * ROW_GAP +
    (chipStrip ? CHIP_H + 8 : 0)
  );
}

function buildLanes(rowsPerTeam: Record<Team, number>, chipTeams: Set<Team>): LaneDef[] {
  const outbound = (id: Team, label: string, sub: string): Omit<LaneDef, "top"> => ({
    id,
    label,
    sub,
    kind: "outbound",
    rows: rowsPerTeam[id],
    chipStrip: chipTeams.has(id),
    height:
      commArea(rowsPerTeam[id], chipTeams.has(id)) +
      (id === "marketing" ? 12 + campaigns.length * (CAMPAIGN_H + CAMPAIGN_GAP) : 0),
  });

  const defs: Array<Omit<LaneDef, "top">> = [
    outbound("recruitment", "Recruitment", "Outbound"),
    outbound("marketing", "Marketing", "Outbound + always-on"),
    outbound("admissions", "Admissions", "Outbound"),
    outbound("conversion", "Conversion", "Outbound"),
    { id: "divider", label: "Inbound Engagement", kind: "divider", height: DIVIDER_H, rows: 0, chipStrip: false },
    { id: "digital", label: "Digital", sub: "Inbound", kind: "inbound", height: INBOUND_H, rows: 0, chipStrip: false },
    { id: "study", label: "Study@RMIT", sub: "Inbound", kind: "inbound", height: INBOUND_H, rows: 0, chipStrip: false },
  ];
  let top = HEADER_H;
  return defs.map((d) => {
    const lane = { ...d, top };
    top += d.height;
    return lane;
  });
}

// Mutable — rebuilt by layoutTimeline once comms load (and again whenever a
// month expands/collapses), since row counts and lane heights depend on how
// densely comms cluster at the current scale. Live bindings, so every
// importer sees the update.
export let LANES: LaneDef[] = buildLanes(
  { recruitment: 2, marketing: 2, admissions: 2, conversion: 2 },
  new Set(),
);
export let TOTAL_H = LANES[LANES.length - 1].top + LANES[LANES.length - 1].height;

export function laneById(id: string): LaneDef {
  const lane = LANES.find((l) => l.id === id);
  if (!lane) throw new Error(`Unknown lane: ${id}`);
  return lane;
}

export function commPos(team: Team, month: number, row: number) {
  const lane = laneById(team);
  const x = Math.min(scaleX(month), TOTAL_W - CARD_W - 4);
  const y = lane.top + LANE_PAD + row * (CARD_H + ROW_GAP);
  return { x, y };
}

/** y of a team lane's "+N more" chip strip (below the last card row). */
export function chipY(team: Team): number {
  const lane = laneById(team);
  return lane.top + LANE_PAD + lane.rows * CARD_H + (lane.rows - 1) * ROW_GAP + 8;
}

export function campaignY(index: number): number {
  const lane = laneById("marketing");
  return (
    lane.top +
    LANE_PAD +
    lane.rows * (CARD_H + ROW_GAP) +
    (lane.chipStrip ? CHIP_H + 8 : 0) +
    2 +
    index * (CAMPAIGN_H + CAMPAIGN_GAP)
  );
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
// updates the scale, greedily assigns each comm a vertical row within its
// team's lane so nothing overlaps horizontally, folds collapsed-month
// overflow (row >= ROW_CAP) into "+N more" chips, and rebuilds lane
// heights. Comms in the expanded month are never folded — expanding is how
// you see them all, spread day by day.
export function layoutTimeline(raw: Comm[], expandedMonth: number | null): TimelineLayout {
  expandedMonthState = expandedMonth;
  TOTAL_W =
    baseScaleX(MONTHS) +
    140 +
    (expandedMonth !== null ? EXPANDED_MONTH_PX - basePxPerMonth(expandedMonth) : 0);

  const GAP = 8;
  const rowById = new Map<string, number>();
  const rowsPerTeam: Record<Team, number> = {
    recruitment: 1,
    marketing: 1,
    admissions: 1,
    conversion: 1,
  };
  const chipCounts = new Map<string, number>(); // "team:monthIndex" -> hidden count
  const hiddenIds = new Set<string>();

  for (const team of OUTBOUND_TEAMS) {
    const list = raw.filter((c) => c.team === team).sort((a, b) => a.month - b.month);
    const rowEndX: number[] = [];
    let maxShownRows = 1;
    for (const c of list) {
      const x = scaleX(c.month);
      let row = rowEndX.findIndex((endX) => x >= endX);
      if (row === -1) {
        row = rowEndX.length;
        rowEndX.push(0);
      }
      rowEndX[row] = x + CARD_W + GAP;
      rowById.set(c.id, row);

      const monthIndex = Math.floor(c.month);
      const inExpanded = expandedMonth !== null && monthIndex === expandedMonth;
      if (row >= ROW_CAP && !inExpanded) {
        hiddenIds.add(c.id);
        const key = `${team}:${monthIndex}`;
        chipCounts.set(key, (chipCounts.get(key) ?? 0) + 1);
      } else {
        maxShownRows = Math.max(maxShownRows, row + 1);
      }
    }
    rowsPerTeam[team] = maxShownRows;
  }

  const chips: OverflowChip[] = [...chipCounts].map(([key, count]) => {
    const [team, mi] = key.split(":");
    return { team: team as Team, monthIndex: Number(mi), count };
  });

  LANES = buildLanes(rowsPerTeam, new Set(chips.map((c) => c.team)));
  TOTAL_H = LANES[LANES.length - 1].top + LANES[LANES.length - 1].height;

  return {
    comms: raw.map((c) => ({ ...c, row: rowById.get(c.id) ?? 0 })),
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
