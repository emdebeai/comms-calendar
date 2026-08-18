export type CommType = "email" | "sms" | "webinar" | "call" | "event";
export type Team = "recruitment" | "marketing-events" | "marketing" | "admissions" | "conversion" | "vtac";
/** Sending/management platform a comm goes out of. Marketing eDMs run out of
 *  Marketo (Adobe); event registration + confirmation emails out of Cvent;
 *  text messages out of ClickSend. */
export type Platform = "marketo" | "cvent" | "clicksend" | "ras" | "vtac";

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
  /** source campaign the send belongs to (e.g. "Open Day", "Nurture SL") */
  campaign?: string;
  /** internal creative theme/summary from the planner */
  theme?: string;
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
  // always-on brand media
  | "spotify"
  | "linkedin"
  | "retargeting"
  | "leads"
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
/** A labelled span within the always-on band (a messaging phase or a
 *  conversion burst). Positions are CALENDAR-year floats (0 = Jan, 11.x = Dec)
 *  — the band tiles them across every school-year band, since each band is
 *  the same calendar year. */
export interface CampaignPhase {
  label: string;
  from: number;
  to: number;
}

export interface CampaignGroup {
  id: string;
  title: string;
  from: number;
  to: number;
  channels: Campaign[];
  /** always-on only — seasonal messaging phases shown inside the floor band */
  phases?: CampaignPhase[];
  /** always-on only — short conversion bursts (e.g. S1 intake pushes) */
  bursts?: CampaignPhase[];
}

export interface Moment {
  id: string;
  label: string;
  from: number;
  to: number;
  /** "major" gets a solid heavy border + filled badge — flagship events like
   *  Open Day. Omit (or "standard") for process deadlines. */
  tier?: "major" | "standard";
  /** confirmed calendar dates/times, shown as a tooltip on hover — omit when
   *  the exact date isn't confirmed (no tooltip beats a made-up one) */
  dates?: string;
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
  /** Real measured series (month float → raw value). When present, the curve
   *  draws ONLY across the series' span — outside it the lane stays blank —
   *  and `peaks` are used purely as labels (y looked up from the series). */
  series?: { month: number; value: number }[];
  /** Small caption at the series start naming the data source. */
  seriesNote?: string;
  /** Multi-line mode: one line per channel, sharing a single scale. When
   *  present it replaces the single curve entirely. Lines break across gaps
   *  of more than 1.5 months (e.g. the Feb → Aug hole in an extract). */
  channels?: InboundChannelSeries[];
}

export interface InboundChannelSeries {
  label: string;
  /** CSS colour custom-property name, e.g. "--color-teal" */
  color: string;
  points: { month: number; value: number }[];
}

export interface FeedbackEntry {
  id: string;
  author: string;
  comment: string;
  metricLabel?: string;
  metricValue?: string;
  createdAt: string; // ISO timestamp
}
