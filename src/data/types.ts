export type CommType = "email" | "sms" | "webinar" | "call" | "event";
export type Team = "recruitment" | "marketing" | "admissions" | "conversion";

export interface Comm {
  id: string;
  team: Team;
  title: string;
  /** primary CTA */
  cta: string;
  secondaryCta1?: string;
  secondaryCta2?: string;
  type: CommType;
  /** 0 = January of Year 10. Fractional values position within the month,
   *  e.g. 31.5 = mid-August of Year 12. */
  month: number;
  /** Vertical slot within the swimlane (0 or 1). */
  row: number;
  /** ids of comms this one sets off — drawn as a line on hover/click. */
  triggers?: string[];
  /** ties the comm to a moment-that-matters band. */
  momentId?: string;
}

export interface Campaign {
  id: string;
  title: string;
  channel: "social" | "video" | "search" | "burst" | "retargeting";
  from: number;
  to: number;
}

export interface Moment {
  id: string;
  label: string;
  from: number;
  to: number;
  /** "major" gets a solid heavy border + filled badge — flagship events like
   *  Open Day. Omit (or "standard") for process deadlines. */
  tier?: "major" | "standard";
}

export interface StageSpan {
  label: string;
  from: number;
  to: number;
}

export interface YearSpan {
  label: string;
  from: number;
  to: number;
}

export interface InboundPeak {
  month: number;
  /** 0–100 relative engagement. */
  height: number;
  label?: string;
}

export interface InboundLaneData {
  id: "digital" | "study";
  baseline: number;
  peaks: InboundPeak[];
}

export interface FeedbackEntry {
  id: string;
  author: string;
  comment: string;
  metricLabel?: string;
  metricValue?: string;
  createdAt: string; // ISO timestamp
}
