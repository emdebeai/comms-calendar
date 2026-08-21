import type { Moment, StageSpan, YearSpan } from "./types";

// Month 0 = January of Year 10. See src/lib/scale.ts.
// Edit these spans to move stage boundaries — everything re-lays-out.

// On average students stay in Consider right up to (and during) Open Day
// (early-mid Aug of Year 12) — deciding, starting and submitting then all
// compress into the Aug–Sep window before VTAC timely close (end of Sep).
// Stage spans follow the real VTAC calendar for a current-year Year 12,
// direct applicant (Persona 01). Month 0 = Jan of Year 10, so Year 12 runs
// months 24–35 (Aug = 31, Sep = 32, Dec = 35).
//   • Applications open 3 Aug, timely close 28 Sep → the apply stages
//     (Decide/Begin/Submit) span August–late September, not a Sep sliver.
//   • ATAR released 10 Dec.
//   • Persona 01 takes the DECEMBER offer round (23 Dec) and accepts first
//     round — so Offer sits in December, not January's Round 1.
export const STAGES: StageSpan[] = [
  { label: "Understand", from: 0, to: 6 },
  { label: "Consider", from: 6, to: 29 }, // Yr 10 – May Yr 12
  { label: "Decide", from: 29, to: 31.06 }, // June → 3 Aug (applications open)
  { label: "Begin", from: 31.06, to: 32.0 }, // 3 Aug – end Aug (VTAC timely apps open)
  { label: "Submit", from: 32.0, to: 32.9 }, // September → timely close 5pm 28 Sep
  { label: "Wait", from: 32.9, to: 35.3 }, // Oct → results 10 Dec (exams, CoP)
  { label: "Offer", from: 35.3, to: 36.2 }, // December offer round (23 Dec)
  { label: "Enrol", from: 36.2, to: 39 }, // late Dec → Feb, Sem 1 starts
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
  { label: `Post-school · ${THIS_YEAR + 1}`, from: 36, to: 39 },
];

// Moments that matter — vertical bands across every swimlane. "major" gets
// heavier styling for flagship events; omit tier (or "standard") for
// process deadlines that still matter but aren't the headline moment.
export const MOMENTS: Moment[] = [
  // Open Day 2026 runs across two Sundays — Bundoora on 2 August, City and
  // Brunswick on 9 August — so each band brackets 1–10 August (month 19/31 =
  // August, day d = (d-1)/30) rather than trailing off through September.
  { id: "openday-y10", label: "Open Day · Yr 10", from: 7.0, to: 7.3, tier: "major", dates: "Bundoora 2 Aug · City & Brunswick 9 Aug" },
  { id: "openday-y11", label: "Open Day · Yr 11", from: 19.0, to: 19.3, tier: "major", dates: "Bundoora 2 Aug · City & Brunswick 9 Aug" },
  { id: "openday-y12", label: "Open Day · Yr 12", from: 31.0, to: 31.3, tier: "major", dates: "Bundoora 2 Aug · City & Brunswick 9 Aug" },
  { id: "vtac-close", label: "VTAC Timely Close", from: 32.4, to: 33 },
  // Same span as the comms embargo below it — the exams ARE the reason the
  // embargo exists, so the moments band names them right above the hatch.
  {
    id: "vce-exams",
    label: "VCE written exams",
    from: 24 + 9 + (26 - 1) / 30, // Mon 26 Oct
    to: 24 + 10 + (18 - 1) / 30, // Wed 18 Nov
    dates: "Mon 26 Oct – Wed 18 Nov",
  },
  // Results land first, CoP follows from them — so results sit on the line
  // ABOVE CoP in the band (array order decides at an equal anchor).
  { id: "results", label: "VCE results and ATARs released", from: 35.3, to: 35.34, dates: "10 Dec · 7am" },
  // VTAC's Change of Preference technically opens 3 Aug (9am), but at RMIT
  // "CoP" means the two-day sprint from ATAR results landing (10 Dec, 7am)
  // to the final change deadline, 12 Dec (12 noon).
  { id: "cop", label: "Change of Preference", from: 35.3, to: 35.38, dates: "10 – 12 Dec · closes 12 noon" },
  // December offer round — a single day: offers released 23 Dec at 10am.
  // The whole Conversion post-offer sequence hangs off this round, so those
  // comms are tagged to it.
  { id: "offers", label: "December offer round", from: 35.733, to: 35.767, tier: "major", dates: "23 Dec · offers released 10am" },
  // The journey's terminus — Semester 1 classes begin 1 March 2027 (the
  // Last Day to Enrol EDM goes five days before).
  { id: "sem1", label: "Semester 1 classes begin", from: 38, to: 38.2, dates: "1 Mar 2027" },
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
    // VCE exam period, Mon 26 Oct – Wed 18 Nov 2026 (Year 12). Marketing and
    // Conversion both hold sends across it.
    from: 24 + 9 + (26 - 1) / 30, // 26 Oct, Yr 12 ≈ 33.83
    to: 24 + 10 + (18 - 1) / 30, //  18 Nov, Yr 12 ≈ 34.57
    label: "Comms embargo · VCE exams (Marketing + Conversion)",
  },
];
