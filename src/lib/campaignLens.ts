// The campaign lens — which touchpoints are in scope for a campaign, and the
// gaps each one carries. Gaps are the product: every rule here is a plain
// statement of something we can't see or haven't decided.
import type { Comm } from "../data/types";
import type { Campaign } from "../data/campaigns";
import { linkedCommIds, stageQuestions } from "../data/studentExperience";
import { STAGES } from "../data/journey";
import { CHAINS, isLaneRef } from "./chains";
import { valuesFor } from "./metricValues";

export type GapKind = "not-measured" | "no-utm" | "chain-broken" | "no-benchmark" | "no-cvp";

export interface Gap {
  kind: GapKind;
  /** short label for markers */
  label: string;
  /** one sentence — what's missing and why it matters */
  detail: string;
}

/** Consequence order — what stops the story first. */
export const GAP_ORDER: GapKind[] = ["chain-broken", "no-utm", "not-measured", "no-benchmark", "no-cvp"];
export const rankGaps = (gaps: Gap[]) => [...gaps].sort((a, b) => GAP_ORDER.indexOf(a.kind) - GAP_ORDER.indexOf(b.kind));

export const GAP_LABELS: Record<GapKind, string> = {
  "not-measured": "Not measured",
  "no-utm": "Can't be traced",
  "chain-broken": "Chain breaks",
  "no-benchmark": "No benchmark",
  "no-cvp": "No value proposition",
};

/** In scope = tagged to the campaign's moment, tagged with its campaign
 *  name, or sitting inside the window. */
export function inScope(c: Comm, campaign: Campaign): boolean {
  if (c.momentId === campaign.momentId) return true;
  if ((c.campaign ?? "").toLowerCase().replace(/[^a-z]/g, "") === "cop") return true;
  return c.month >= campaign.from && c.month < campaign.to;
}

export function gapsFor(c: Comm): Gap[] {
  const gaps: Gap[] = [];
  const values = valuesFor(c.id);
  if (values.length === 0) {
    gaps.push({ kind: "not-measured", label: "Not measured", detail: "No metrics loaded for this touchpoint." });
  } else if (values.some((v) => !v.benchmark)) {
    const n = values.filter((v) => !v.benchmark).length;
    gaps.push({ kind: "no-benchmark", label: "No benchmark", detail: `${n} of ${values.length} metrics have nothing to compare against.` });
  }
  if ((c.type === "email" || c.type === "sms") && c.utm === "no") {
    gaps.push({ kind: "no-utm", label: "Can't be traced", detail: "Its CTAs aren't tagged, so web traffic can't be traced back to this send." });
  }
  const broken = CHAINS.filter((ch) => (ch.from === c.id || ch.to === c.id) && !ch.measured);
  if (broken.length) {
    gaps.push({ kind: "chain-broken", label: "Next step not measured", detail: `${broken.length} link${broken.length > 1 ? "s" : ""} to the next step can't be measured.` });
  }
  const channelOnly = CHAINS.some((ch) => isLaneRef(ch.from) && ch.to === c.id);
  if (channelOnly && !CHAINS.some((ch) => !isLaneRef(ch.from) && ch.to === c.id)) {
    gaps.push({ kind: "no-utm", label: "Channel only", detail: "Marketo sees the click; the page only sees 'eDM channel', not which send or CTA." });
  }
  if (!c.cvp) {
    gaps.push({ kind: "no-cvp", label: "No CVP", detail: "No value proposition recorded — what is this asking the student to believe?" });
  }
  return gaps;
}

export interface CampaignSummary {
  total: number;
  measured: number;
  chains: number;
  chainsBroken: number;
  withCvp: number;
  questions: number;
  questionsAnswered: number;
  teams: number;
  /** the campaign in one breath, from the numbers */
  story: string;
  /** questions in the window's stages with no in-scope touchpoint */
  unanswered: { stage: string; question: string }[];
  byKind: Record<GapKind, number>;
}

export function summarise(comms: Comm[], campaign: Campaign, gapMap: Map<string, Gap[]>): CampaignSummary {
  const scoped = comms.filter((c) => inScope(c, campaign));
  const ids = new Set(scoped.map((c) => c.id));
  const byKind: Record<GapKind, number> = { "not-measured": 0, "no-utm": 0, "chain-broken": 0, "no-benchmark": 0, "no-cvp": 0 };
  for (const c of scoped) for (const g of gapMap.get(c.id) ?? []) byKind[g.kind]++;
  const chains = CHAINS.filter((ch) => ids.has(ch.to) || ids.has(ch.from));
  // Student questions the window covers — the stages it overlaps.
  const stages = STAGES.filter((s) => s.to > campaign.from && s.from < campaign.to).map((s) => s.label);
  const qs = stages.flatMap((stage) => stageQuestions(stage).map((question) => ({ stage, question })));
  const unanswered = qs.filter((q) => !linkedCommIds(q.stage, q.question).some((id) => ids.has(id)));
  const measured = scoped.filter((c) => !(gapMap.get(c.id) ?? []).some((g) => g.kind === "not-measured")).length;
  const chainsBroken = chains.filter((ch) => !ch.measured).length;
  const teams = new Set(scoped.map((c) => c.team)).size;
  const story = [
    `${scoped.length} touchpoints across ${teams} teams; ${measured} are measured.`,
    chains.length
      ? `${chains.length - chainsBroken} of ${chains.length} chains can be followed to the next step${chainsBroken ? `; ${chainsBroken} break` : ""}.`
      : "No chains are recorded.",
    `${unanswered.length} of ${qs.length} student questions in the window have no touchpoint.`,
  ].join(" ");
  return {
    total: scoped.length,
    measured,
    chains: chains.length,
    chainsBroken,
    withCvp: scoped.filter((c) => c.cvp).length,
    questions: qs.length,
    questionsAnswered: qs.length - unanswered.length,
    teams,
    story,
    unanswered,
    byKind,
  };
}
