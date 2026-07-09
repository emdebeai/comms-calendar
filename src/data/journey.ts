import type { Moment, StageSpan, YearSpan } from "./types";

// Month 0 = January of Year 10. See src/lib/scale.ts.
// Edit these spans to move stage boundaries — everything re-lays-out.

export const STAGES: StageSpan[] = [
  { label: "Understand", from: 0, to: 6 },
  { label: "Consider", from: 6, to: 29 },
  { label: "Decide", from: 29, to: 31 },
  { label: "Begin", from: 31, to: 32 },
  { label: "Submit", from: 32, to: 33 },
  { label: "Wait", from: 33, to: 35 },
  { label: "Offer", from: 35, to: 36.5 },
  { label: "Enrol", from: 36.5, to: 38 },
];

export const YEARS: YearSpan[] = [
  { label: "Year 10", from: 0, to: 12 },
  { label: "Year 11", from: 12, to: 24 },
  { label: "Year 12", from: 24, to: 36 },
  { label: "Post-School", from: 36, to: 38 },
];

// Moments that matter — vertical bands across every swimlane. "major" gets
// heavier styling for flagship events; omit tier (or "standard") for
// process deadlines that still matter but aren't the headline moment.
export const MOMENTS: Moment[] = [
  { id: "openday-y11", label: "Open Day", from: 19.1, to: 19.9, tier: "major" },
  { id: "openday-y12", label: "Open Day", from: 31.1, to: 32, tier: "major" },
  { id: "vtac-close", label: "VTAC Timely Close", from: 32.4, to: 33 },
  { id: "cop", label: "Change of Preference", from: 35, to: 35.45 },
  { id: "offers", label: "Offer Round", from: 35.55, to: 36.4, tier: "major" },
  { id: "oweek", label: "O-Week", from: 37.3, to: 38 },
];
