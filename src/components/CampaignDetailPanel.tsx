import { campaignGroups } from "../data/comms";
import type { Campaign, FeedbackEntry } from "../data/types";
import { campaignRangeLabel } from "../lib/scale";
import { EYEBROW } from "../lib/styles";
import { ChannelIcon } from "./ChannelIcon";
import { DetailPanelShell } from "./DetailPanelShell";
import { FeedbackComposer, FeedbackThread } from "./FeedbackSection";

interface Props {
  campaign: Campaign;
  entries: FeedbackEntry[];
  onClose: () => void;
  onAdd: (entry: Omit<FeedbackEntry, "id" | "createdAt">) => void;
  /** admin only — delete a comment by id */
  onDelete?: (entryId: string) => void;
}

function AttributeRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-3 py-1">
      <dt className="w-28 shrink-0 text-sm text-grey-70">{label}</dt>
      <dd className="min-w-0 text-sm text-grey-90">{value}</dd>
    </div>
  );
}

/** Detail panel for a media-schedule channel — same shell and feedback
 *  thread as comms, with plan attributes that mostly don't have data yet. */
export function CampaignDetailPanel({ campaign, entries, onClose, onAdd, onDelete }: Props) {
  const range = campaignRangeLabel(campaign.from, campaign.to);
  // ~4.35 weeks per month float unit
  const weeks = Math.max(1, Math.round((campaign.to - campaign.from) * 4.35));

  return (
    <DetailPanelShell
      overline={`Media channel · ${range}`}
      title={campaign.title}
      iconChipClass="bg-grey-20 text-grey-80"
      icon={<ChannelIcon channel={campaign.channel} size={16} />}
      onClose={onClose}
    >
      <div className="flex-1 overflow-y-auto p-5">
        {campaign.description && (
          <p className="text-sm text-grey-80">{campaign.description}</p>
        )}

        <h3 className={`mt-5 text-grey-70 ${EYEBROW}`}>Details</h3>
        <dl className="mt-2">
          <AttributeRow label="Team" value="Marketing" />
          <AttributeRow
            label="Schedule"
            value={campaignGroups.find((g) => g.channels.some((c) => c.id === campaign.id))?.title}
          />
          <AttributeRow label="Flight" value={range} />
          <AttributeRow label="Duration" value={`${weeks} week${weeks === 1 ? "" : "s"}`} />
        </dl>

        {/* Plan fields the team will want here eventually — flagged as not
            captured yet rather than silently absent. */}
        <h3 className={`mt-6 text-grey-70 ${EYEBROW}`}>Plan</h3>
        <p className="mt-2 text-sm text-grey-70">
          Budget, audience, objective and creative aren&rsquo;t captured yet — leave a
          note below if you have them.
        </p>

        <FeedbackThread entries={entries} onDelete={onDelete} />
      </div>

      <FeedbackComposer onAdd={onAdd} />
    </DetailPanelShell>
  );
}
