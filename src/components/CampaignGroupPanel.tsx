import { Globe, Headset } from "lucide-react";
import { campaignInfo, campaignPages, compare, headline, studyChannels } from "../lib/campaign";
import { EYEBROW, FOCUS_RING } from "../lib/styles";
import { DetailPanelShell } from "./DetailPanelShell";
import { COMM_COLORS } from "./icons";
import { PageBadge } from "./CampaignSections";

// The things in a lane that aren't events — the campaign's pages, Study@'s
// channels — listed with their judged number. Opened from the lane gutter.

const fmt = (s: string) => (/^\d+$/.test(s) ? Number(s).toLocaleString() : s);
const tone = (c: ReturnType<typeof compare>) => (c === "better" ? "text-success" : c === "worse" ? "text-danger" : "text-grey-90");

export function CampaignPagesPanel({ onClose, onOpenComm }: { onClose: () => void; onOpenComm: (id: string) => void }) {
  const rows = campaignPages
    .map((c) => ({ c, i: campaignInfo(c.id)! }))
    .map(({ c, i }) => ({ c, i, h: headline(c, i) }))
    .sort((a, b) => (compare(a.h?.value ?? { metric: "", value: "" }) === "worse" ? 0 : 1) - (compare(b.h?.value ?? { metric: "", value: "" }) === "worse" ? 0 : 1));
  const worse = rows.filter((r) => r.h && compare(r.h.value) === "worse").length;
  return (
    <DetailPanelShell
      overline={`Website · ${rows.length} campaign pages`}
      title="Change of Preference pages"
      iconChipClass={`${COMM_COLORS.webpage.chip} ${COMM_COLORS.webpage.text}`}
      icon={<Globe size={16} strokeWidth={1.75} aria-hidden />}
      onClose={onClose}
    >
      <div className="flex-1 overflow-y-auto p-6">
        <p className="text-sm text-grey-80">Live for the whole window. The traffic curve in the lane is all of them together; {worse} of {rows.length} are below benchmark on their success measure.</p>
        <h3 className={`mt-5 text-grey-70 ${EYEBROW}`}>Pages</h3>
        <ul className="mt-2 divide-y divide-grey-30">
          {rows.map(({ c, i, h }) => (
            <li key={c.id}>
              <button type="button" onClick={() => onOpenComm(c.id)} className={`flex w-full items-baseline justify-between gap-3 rounded py-2.5 text-left hover:bg-grey-10 ${FOCUS_RING}`}>
                <span className="min-w-0">
                  <span className="block"><PageBadge c={c} /></span>
                  <span className="block text-xs text-grey-70">{[i.objective && `${i.objective[0].toUpperCase()}${i.objective.slice(1)}`, i.values.find((v) => v.metric === "Traffic rank")?.value && `${i.values.find((v) => v.metric === "Traffic rank")!.value} by traffic`].filter(Boolean).join(" · ")}</span>
                </span>
                {h ? (
                  <span className="shrink-0 text-right">
                    <span className={`block text-sm font-semibold ${tone(compare(h.value))}`}>{fmt(h.value.value)}</span>
                    <span className="block text-xs text-grey-70">{h.label}{h.value.benchmark ? ` · benchmark ${h.value.benchmark}` : ""}</span>
                  </span>
                ) : (
                  <span className="shrink-0 text-xs text-grey-60 italic">not measured</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </DetailPanelShell>
  );
}

export function CampaignStudyPanel({ onClose }: { onClose: () => void }) {
  return (
    <DetailPanelShell
      overline="Study@RMIT · 3 channels"
      title="Study@RMIT in the window"
      iconChipClass={`${COMM_COLORS.call.chip} ${COMM_COLORS.call.text}`}
      icon={<Headset size={16} strokeWidth={1.75} aria-hidden />}
      onClose={onClose}
    >
      <div className="flex-1 overflow-y-auto p-6">
        <p className="text-sm text-grey-80">Contacts across the window, and the worst day on each channel against normal load (the weeks before results).</p>
        <h3 className={`mt-5 text-grey-70 ${EYEBROW}`}>Channels</h3>
        <ul className="mt-2 divide-y divide-grey-30">
          {studyChannels.map((ch) => (
            <li key={ch.channel} className="flex items-baseline justify-between gap-3 py-2.5">
              <span className="min-w-0">
                <span className="block text-sm text-grey-90">{ch.label}</span>
                <span className="block text-xs text-grey-70">{ch.contacts.toLocaleString()} contacts · normal wait {ch.baseline}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className={`block text-sm font-semibold ${ch.overloaded ? "text-danger" : "text-grey-90"}`}>{ch.peakWait}</span>
                <span className="block text-xs text-grey-70">peak wait · {ch.peakDate.slice(8)} Dec</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-grey-60">Proxy figures. Source: Genesys by day and channel.</p>
      </div>
    </DetailPanelShell>
  );
}
