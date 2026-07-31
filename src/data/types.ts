export type CommType = "email" | "sms" | "webinar" | "call" | "event";
export type Team = "recruitment" | "marketing" | "admissions" | "conversion";
/** Sending/management platform a comm goes out of. Marketing eDMs run out of
 *  Marketo (Adobe); event registration + confirmation emails out of Cvent;
 *  text messages out of ClickSend. */
export type Platform = "marketo" | "cvent" | "clicksend" | "ras";

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
  /** Marketo campaign id parsed from the source email name (SL-XXXX-). */
  marketoId?: string;
  /** Sending platform. Defaults by channel when the CSV leaves it blank
   *  (email→Marketo, sms→ClickSend, event→Cvent). */
  platform?: Platform;
  /** send-performance metrics, stored as display strings e.g. "56.7%". */
  openRate?: string;
  clickRate?: string;
  /** Run time for in-person events, verbatim from the source e.g.
   *  "10am – 4pm". Free text, not parsed — the timeline positions by date
   *  only, so this is for the detail panel to display. */
  time?: string;
  // ── Segmentation (the tailoring axes) ──────────────────────────────────
  // How a send is targeted. A blank field means "not tailored on this axis"
  // (i.e. it goes to everyone), so the segment lens treats blanks as matching
  // any selected value. Parsed from the marketing planner's Audience column.
  /** raw audience label from the source, for display */
  audience?: string;
  /** "student" or "both" (student + parent). Parent-only sends aren't loaded. */
  recipient?: string;
  /** VTAC preference position this send targets: "#1", "#2-8", "none" */
  preference?: string;
  /** RMIT college: "COBL", "STEM", "DSC", "VE" */
  college?: string;
  /** campus: "bundoora", "city", "brunswick", "regional" */
  campus?: string;
  /** event lifecycle: "registered", "unregistered", "attended", "did-not-attend" */
  eventState?: string;
  /** equity cohort this send is tailored to, if any: "SNAP", "DDINTON" */
  equity?: string;
}

export type CampaignChannel =
  // digital + radio
  | "youtube"
  | "livewire"
  | "radio"
  | "radio-traffic"
  | "tiktok"
  | "meta"
  | "reddit"
  | "display"
  | "weatherzone"
  | "google"
  | "pmax"
  // digital + static outdoor (out-of-home placements)
  | "smartframes"
  | "escalators"
  | "wrap"
  | "billboard"
  | "posters"
  | "street-furniture"
  | "truck"
  | "retail"
  | "group";

export interface Campaign {
  id: string;
  title: string;
  channel: CampaignChannel;
  from: number;
  to: number;
  /** one-liner shown in the channel's detail panel — what this buy actually is */
  description?: string;
}

/** A media schedule: one summary bar that expands into per-channel bars. */
export interface CampaignGroup {
  id: string;
  title: string;
  from: number;
  to: number;
  channels: Campaign[];
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
