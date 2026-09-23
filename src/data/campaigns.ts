// Campaigns — a moment that matters with a window and a scope. Read from
// data/campaigns.csv; the first one the tool measures is Change of
// Preference 2026. Dates in the CSV are ISO; here they become the map's
// month floats (0 = Jan of Year 10, Year 12 = 24–35, next year = 36+).
import raw from "../../data/campaigns.csv?raw";
import { parseCsvRows } from "../lib/csv";

export interface CampaignSpan {
  label: string;
  from: number;
  to: number;
}
export interface CampaignMarker {
  label: string;
  at: number;
  date: string;
}
export interface Campaign {
  id: string;
  name: string;
  /** the moment-that-matters this campaign hangs off */
  momentId: string;
  /** the whole campaign window */
  from: number;
  to: number;
  /** the core moment inside the window (e.g. the 3-day COP period) */
  coreFrom: number;
  coreTo: number;
  /** decision point: extend into the next windows or stop */
  stageGate: number;
  extensions: CampaignSpan[];
  markers: CampaignMarker[];
  outcomeMetric: string;
  scope: string;
  dates: string;
}

// Year 12 is the current calendar year (see journey.ts YEARS), so a date's
// month float is 24 + months since January of this year.
const THIS_YEAR = new Date().getFullYear();
export function dateToMonth(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return (y - THIS_YEAR) * 12 + 24 + (m - 1) + (d - 1) / 30;
}
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function shortDate(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

const parseSpans = (cell: string): CampaignSpan[] =>
  cell
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [label, from, to] = s.split("|");
      return { label, from: dateToMonth(from), to: dateToMonth(to) };
    });
const parseMarkers = (cell: string): CampaignMarker[] =>
  cell
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [label, date] = s.split("|");
      return { label, at: dateToMonth(date), date: shortDate(date) };
    });

export const CAMPAIGNS: Campaign[] = parseCsvRows(raw).map((r) => ({
  id: r.id,
  name: r.name,
  momentId: r.moment,
  from: dateToMonth(r.window_from),
  to: dateToMonth(r.window_to) + 1 / 30, // inclusive of the last day
  coreFrom: dateToMonth(r.core_from),
  coreTo: dateToMonth(r.core_to) + 1 / 30,
  stageGate: dateToMonth(r.stage_gate) + 1 / 30,
  extensions: parseSpans(r.extensions || ""),
  markers: parseMarkers(r.markers || ""),
  outcomeMetric: r.outcome_metric || "",
  scope: r.scope || "",
  dates: `${shortDate(r.window_from)} – ${shortDate(r.window_to)}`,
}));

export const campaignById = (id: string | null | undefined): Campaign | null =>
  (id && CAMPAIGNS.find((c) => c.id === id)) || null;
