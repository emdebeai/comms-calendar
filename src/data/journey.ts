import type { Moment, StageSpan, YearSpan } from "./types";

// Month 0 = January of Year 10. See src/lib/scale.ts.
// Edit these spans to move stage boundaries — everything re-lays-out.

// On average students stay in Consider right up to (and during) Open Day
// (early-mid Aug of Year 12) — deciding, starting and submitting then all
// compress into the Aug–Sep window before VTAC timely close (end of Sep).
export const STAGES: StageSpan[] = [
  { label: "Understand", from: 0, to: 6 },
  { label: "Consider", from: 6, to: 31.7 },
  { label: "Decide", from: 31.7, to: 32.15 },
  { label: "Begin", from: 32.15, to: 32.6 },
  { label: "Submit", from: 32.6, to: 33 },
  { label: "Wait", from: 33, to: 35 },
  { label: "Offer", from: 35, to: 36.5 },
  { label: "Enrol", from: 36.5, to: 38 },
];

// The three school-year bands run in PARALLEL, not sequence: this timeline
// shows the current planning year's activity for three audiences at once
// (one send can appear in all three bands — e.g. an email to Years 10, 11
// & 12 goes out on the same day). So every band is the current calendar
// year, and only the post-results tail rolls into next year. Computed from
// today's date so it rolls over each January.
const THIS_YEAR = new Date().getFullYear();

export const YEARS: YearSpan[] = [
  { label: `Year 10 · ${THIS_YEAR}`, from: 0, to: 12 },
  { label: `Year 11 · ${THIS_YEAR}`, from: 12, to: 24 },
  { label: `Year 12 · ${THIS_YEAR}`, from: 24, to: 36 },
  { label: `Post-school · ${THIS_YEAR + 1}`, from: 36, to: 38 },
];

// Moments that matter — vertical bands across every swimlane. "major" gets
// heavier styling for flagship events; omit tier (or "standard") for
// process deadlines that still matter but aren't the headline moment.
export const MOMENTS: Moment[] = [
  // Open Day 2026 runs across two Sundays — Bundoora on 2 August, City and
  // Brunswick on 9 August — so each band brackets 1–10 August (month 19/31 =
  // August, day d = (d-1)/30) rather than trailing off through September.
  { id: "openday-y11", label: "Open Day · Yr 11", from: 19.0, to: 19.3, tier: "major" },
  { id: "openday-y12", label: "Open Day · Yr 12", from: 31.0, to: 31.3, tier: "major" },
  { id: "vtac-close", label: "VTAC Timely Close", from: 32.4, to: 33 },
  { id: "cop", label: "Change of Preference", from: 35, to: 35.45 },
  { id: "offers", label: "Offer Round", from: 35.55, to: 36.4, tier: "major" },
  { id: "oweek", label: "O-Week", from: 37.3, to: 38 },
];

// Send embargoes — periods when outbound comms deliberately go quiet (no
// marketing, no conversion sends). Distinct from moments-that-matter: a moment
// is "something happens here", an embargo is "nothing sends here, on purpose".
// Shown as a hatched band so the gap reads as intentional, not missing data.
// Month floats: Year 12 = months 24–36, day d ≈ (d-1)/30 within the month.
export interface Embargo {
  from: number;
  to: number;
  label: string;
}

export const EMBARGOES: Embargo[] = [
  {
    // VCE exam period, Tue 27 Oct – Wed 18 Nov 2026 (Year 12). Marketing and
    // Conversion both hold sends across it.
    from: 24 + 9 + (27 - 1) / 30, // 27 Oct, Yr 12 ≈ 33.87
    to: 24 + 10 + (18 - 1) / 30, //  18 Nov, Yr 12 ≈ 34.57
    label: "Comms embargo · VCE exams (Marketing + Conversion)",
  },
];
