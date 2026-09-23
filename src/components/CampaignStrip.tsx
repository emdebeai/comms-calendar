import { AlertTriangle, X } from "lucide-react";
import type { Campaign } from "../data/campaigns";
import type { CampaignSummary } from "../lib/campaignLens";
import { VALUES_ARE_DUMMY } from "../lib/metricValues";
import { FOCUS_RING } from "../lib/styles";
import { HEADER_H } from "../lib/scale";

interface Props {
  campaign: Campaign;
  summary: CampaignSummary;
  onOpenGaps: () => void;
  onExit: () => void;
}

/** The campaign headline — what's in scope and how much of it we can see.
 *  Pinned under the sticky header on the right, out of the gutter's way. */
export function CampaignStrip({ campaign, summary: s, onOpenGaps, onExit }: Props) {
  const gapTotal = Object.values(s.byKind).reduce((a, b) => a + b, 0) + s.unanswered.length;
  const Stat = ({ n, of, label }: { n: number; of?: number; label: string }) => (
    <div className="min-w-0">
      <p className="text-lg leading-tight font-semibold text-grey-90">
        {n}
        {of !== undefined && <span className="text-sm font-normal text-grey-60"> / {of}</span>}
      </p>
      <p className="text-xs text-grey-70">{label}</p>
    </div>
  );
  return (
    <section
      aria-label={`${campaign.name} summary`}
      className="fixed right-4 z-30 w-80 rounded-lg border border-grey-30 bg-card/85 p-4 shadow-lg backdrop-blur-md"
      style={{ top: HEADER_H + 12 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-widest text-grey-70 uppercase">Campaign</p>
          <h2 className="text-base font-semibold text-grey-90">{campaign.name}</h2>
          <p className="text-xs text-grey-70">{campaign.dates} · stage gate {campaign.markers.length ? "12 Dec" : ""}</p>
        </div>
        <button type="button" onClick={onExit} aria-label="Exit campaign view" className={`rounded-md p-1 text-grey-70 hover:bg-grey-10 ${FOCUS_RING}`}>
          <X size={15} strokeWidth={2} aria-hidden />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
        <Stat n={s.total} label="touchpoints in scope" />
        <Stat n={s.measured} of={s.total} label="measured" />
        <Stat n={s.chains - s.chainsBroken} of={s.chains} label="chains intact" />
        <Stat n={s.questionsAnswered} of={s.questions} label="questions answered" />
        <Stat n={s.withCvp} of={s.total} label="with a value proposition" />
      </div>
      <button
        type="button"
        onClick={onOpenGaps}
        className={`mt-3 flex w-full items-center justify-between rounded-md border border-amber bg-tint-amber px-3 py-2 text-left text-sm text-grey-90 hover:bg-amber/20 ${FOCUS_RING}`}
      >
        <span className="flex items-center gap-2">
          <AlertTriangle size={14} strokeWidth={2} aria-hidden />
          {gapTotal} gaps
        </span>
        <span className="text-xs text-grey-70">See all</span>
      </button>
      {VALUES_ARE_DUMMY && (
        <p className="mt-2 text-xs text-grey-60">Proxy data — figures are placeholders.</p>
      )}
    </section>
  );
}
