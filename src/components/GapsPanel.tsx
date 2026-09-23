import { AlertTriangle } from "lucide-react";
import type { Comm } from "../data/types";
import type { Campaign } from "../data/campaigns";
import { GAP_LABELS, GAP_ORDER, type CampaignSummary, type Gap, type GapKind } from "../lib/campaignLens";
import { EYEBROW, FOCUS_RING } from "../lib/styles";
import { DetailPanelShell } from "./DetailPanelShell";
import { COMM_COLORS, COMM_ICONS, COMM_LABELS } from "./icons";
import { TokenText } from "./TokenText";
import { commDateLabel } from "../lib/scale";

interface Props {
  campaign: Campaign;
  comms: Comm[];
  gapMap: Map<string, Gap[]>;
  summary: CampaignSummary;
  onClose: () => void;
  onOpenComm: (id: string) => void;
}


const WHY: Record<GapKind, string> = {
  "not-measured": "No metrics exist or none are loaded — we can't say whether it worked.",
  "no-utm": "Web traffic can't be traced back to the send, so its chain stops at the channel.",
  "chain-broken": "The next step isn't measured, so the chain can't be followed through.",
  "no-benchmark": "Numbers exist but nothing to judge them against.",
  "no-cvp": "No recorded value proposition — the ask to the student isn't stated.",
};

/** Every gap in the campaign, grouped by kind, each row opening its
 *  touchpoint. The working list for the stakeholder sessions. */
export function GapsPanel({ campaign, comms, gapMap, summary, onClose, onOpenComm }: Props) {
  const byId = new Map(comms.map((c) => [c.id, c]));
  const groups = GAP_ORDER.map((kind) => ({
    kind,
    items: [...gapMap.entries()]
      .flatMap(([id, gaps]) => gaps.filter((g) => g.kind === kind).map((g) => ({ id, g })))
      .map(({ id, g }) => ({ comm: byId.get(id)!, g }))
      .filter((x) => x.comm)
      .sort((a, b) => a.comm.month - b.comm.month),
  })).filter((g) => g.items.length);

  return (
    <DetailPanelShell
      overline={campaign.name}
      title="Gaps"
      iconChipClass="bg-tint-amber text-grey-90"
      icon={<AlertTriangle size={16} strokeWidth={1.75} aria-hidden />}
      onClose={onClose}
    >
      <div className="flex-1 overflow-y-auto p-6">
        {groups.map(({ kind, items }, i) => (
          <section key={kind} className={i ? "mt-6 border-t border-grey-30 pt-6" : ""}>
            <h3 className={`text-grey-70 ${EYEBROW}`}>{GAP_LABELS[kind]} · {items.length}</h3>
            <p className="mt-1 text-sm text-grey-70">{WHY[kind]}</p>
            <ul className="mt-3 flex flex-col gap-1.5">
              {items.map(({ comm, g }) => {
                const Icon = COMM_ICONS[comm.type];
                const colors = COMM_COLORS[comm.type];
                return (
                  <li key={comm.id + g.label}>
                    <button
                      type="button"
                      onClick={() => onOpenComm(comm.id)}
                      className={`flex w-full items-center gap-2.5 rounded-md border border-grey-30 bg-card px-2.5 py-2 text-left transition-colors hover:border-rmit-blue-interactive/60 hover:bg-tint-blue/30 ${FOCUS_RING}`}
                    >
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${colors.chip} ${colors.text}`}>
                        <Icon size={13} strokeWidth={2} aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-grey-90"><TokenText text={comm.title} /></span>
                        <span className="block text-xs text-grey-70">{COMM_LABELS[comm.type]} · {commDateLabel(comm.month)} · {g.detail}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        {summary.unanswered.length > 0 && (
          <section className="mt-6 border-t border-grey-30 pt-6">
            <h3 className={`text-grey-70 ${EYEBROW}`}>Questions we don&rsquo;t answer · {summary.unanswered.length}</h3>
            <p className="mt-1 text-sm text-grey-70">Student questions in this window with no in-scope touchpoint — where we fall short of what they expect.</p>
            <ul className="mt-3 flex flex-col gap-2">
              {summary.unanswered.map((q) => (
                <li key={q.stage + q.question} className="rounded-md border border-dashed border-grey-60 px-3 py-2 text-sm text-grey-90">
                  <span className="text-xs text-grey-60">{q.stage} · </span>{q.question}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </DetailPanelShell>
  );
}
