import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, X } from "lucide-react";
import type { Campaign } from "../data/campaigns";
import type { CampaignSummary } from "../lib/campaignLens";
import { VALUES_ARE_DUMMY } from "../lib/metricValues";
import { FOCUS_RING } from "../lib/styles";

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
  const [open, setOpen] = useState(false);
  return (
    <section
      aria-label={`${campaign.name} summary`}
      className="fixed right-4 z-30 rounded-lg border border-grey-30 bg-card/85 shadow-lg backdrop-blur-md"
      style={{ top: 8, width: open ? 320 : undefined }}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className={`flex min-w-0 flex-1 items-center gap-2 rounded-md text-left ${FOCUS_RING}`}
        >
          <span className="truncate text-sm font-semibold text-grey-90">{campaign.name}</span>
          {!open && (
            <span className="shrink-0 text-xs text-grey-70">
              {s.total} touchpoints · {s.measured} measured · {gapTotal} gaps
            </span>
          )}
          {open ? <ChevronUp size={14} strokeWidth={2} aria-hidden className="shrink-0 text-grey-70" /> : <ChevronDown size={14} strokeWidth={2} aria-hidden className="shrink-0 text-grey-70" />}
        </button>
        <button type="button" onClick={onExit} aria-label="Exit campaign view" className={`shrink-0 rounded-md p-1 text-grey-70 hover:bg-grey-10 ${FOCUS_RING}`}>
          <X size={15} strokeWidth={2} aria-hidden />
        </button>
      </div>
      {open && (
        <div className="border-t border-grey-30 px-4 pt-3 pb-4">
          <p className="text-xs text-grey-70">{campaign.dates} · stage gate 12 Dec</p>
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
          {VALUES_ARE_DUMMY && <p className="mt-2 text-xs text-grey-60">Proxy data — figures are placeholders.</p>}
        </div>
      )}
    </section>
  );
}
