import { MOMENTS, STAGES } from "../data/journey";
import { linkedQuestions } from "../data/studentExperience";
import type { Comm, FeedbackEntry } from "../data/types";
import { commDateLabel } from "../lib/scale";
import { SEGMENT_AXES } from "../lib/segments";
import { EYEBROW } from "../lib/styles";
import { DetailPanelShell } from "./DetailPanelShell";
import { TokenText } from "./TokenText";
import { FeedbackComposer, FeedbackThread } from "./FeedbackSection";
import { COMM_COLORS, COMM_ICONS, COMM_LABELS, PLATFORM_LABELS } from "./icons";

interface Props {
  comm: Comm;
  /** full comm list, for resolving trigger relationships to titles */
  allComms: Comm[];
  entries: FeedbackEntry[];
  onClose: () => void;
  onAdd: (entry: Omit<FeedbackEntry, "id" | "createdAt">) => void;
}

// Quiet Notion-style property row: sentence-case regular-weight label that
// recedes, value that carries. Blank attributes are omitted entirely rather
// than shown as a row of "—", so the rows that carry signal aren't buried.
// Uppercase EYEBROW emphasis is reserved for the section headings.
function AttributeRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-3 py-1">
      <dt className="w-28 shrink-0 text-sm text-grey-70">{label}</dt>
      <dd className="min-w-0 text-sm text-grey-90">{value}</dd>
    </div>
  );
}

export function CommDetailPanel({ comm, allComms, entries, onClose, onAdd }: Props) {
  const Icon = COMM_ICONS[comm.type];
  const colors = COMM_COLORS[comm.type];

  // Derived attributes. Type and date live in the header overline only —
  // repeating them as rows below just added noise.
  const day = Math.round((comm.month % 1) * 30) + 1;
  const dateLabel = `${day} ${commDateLabel(comm.month)}`;
  const stage = STAGES.find((s) => comm.month >= s.from && comm.month < s.to)?.label;
  const moment = MOMENTS.find((m) => m.id === comm.momentId)?.label;
  const teamLabel =
    comm.team === "vtac" ? "VTAC" : comm.team.charAt(0).toUpperCase() + comm.team.slice(1);
  // Related comms — both directions of the (now undirected) trigger links,
  // merged into one list so the panel doesn't assert who causes whom.
  const relatedTitles = [
    ...new Set([
      ...(comm.triggers ?? [])
        .map((id) => allComms.find((c) => c.id === id)?.title)
        .filter((t): t is string => Boolean(t)),
      ...allComms.filter((c) => c.triggers?.includes(comm.id)).map((c) => c.title),
    ]),
  ].join("; ");
  // The tailoring axes the segment lens parsed out of the audience label,
  // shown as chips (pretty labels shared with the persona-dock toggles).
  const tailoringChips = [
    ...SEGMENT_AXES.flatMap((axis) => {
      const v = comm[axis.key];
      return v ? [{ axis: axis.label, value: axis.labels[v] ?? v }] : [];
    }),
    ...(comm.equity ? [{ axis: "Equity", value: comm.equity }] : []),
  ];

  return (
    <DetailPanelShell
      overline={`${COMM_LABELS[comm.type]} · ${dateLabel}`}
      title={<TokenText text={comm.title} />}
      iconChipClass={`${colors.chip} ${colors.text}`}
      icon={<Icon size={16} strokeWidth={1.75} aria-hidden />}
      onClose={onClose}
    >
      <div className="flex-1 overflow-y-auto p-5">
        {/* ── Attributes ── */}
        <h3 className={`text-grey-70 ${EYEBROW}`}>Details</h3>
        <dl className="mt-2">
          {/* Sits first so it reads straight on from the date in the header.
              Events only — AttributeRow renders nothing when it's unset. */}
          <AttributeRow label="Time" value={comm.time} />
          <AttributeRow label="Team" value={teamLabel} />
          <AttributeRow label="Journey stage" value={stage} />
          <AttributeRow label="Moment" value={moment} />
          {comm.type !== "event" &&
            (comm.cta ? (
              <>
                <AttributeRow label="Primary CTA" value={comm.cta} />
                <AttributeRow label="Secondary 1" value={comm.secondaryCta1} />
                <AttributeRow label="Secondary 2" value={comm.secondaryCta2} />
              </>
            ) : (
              /* explicit, not omitted — "we don't know the CTA" is a data gap
                 worth surfacing to the sending team, not hiding */
              <div className="flex gap-3 py-1">
                <dt className="w-28 shrink-0 text-sm text-grey-70">Primary CTA</dt>
                <dd className="min-w-0 text-sm text-grey-70 italic">Not recorded</dd>
              </div>
            ))}
          <AttributeRow label="Related comms" value={relatedTitles} />
          <AttributeRow
            label="Student question"
            value={
              linkedQuestions(comm.id)
                .map((lq) => `“${lq.question}” (${lq.stage})`)
                .join("; ") || undefined
            }
          />
          <AttributeRow label="Sent from" value={comm.platform ? PLATFORM_LABELS[comm.platform] : undefined} />
          {comm.platform === "marketo" && <AttributeRow label="Marketo ID" value={comm.marketoId} />}
        </dl>

        {/* ── Audience & tailoring — who this send goes to and how it's cut.
            The raw audience label is the messy source of truth (verbatim from
            the planner); the chips are what the segment lens parsed out of it,
            so this section doubles as a key for the persona-dock toggles. */}
        {(comm.audience || comm.campaign || comm.theme || tailoringChips.length > 0) && (
          <>
            <h3 className={`mt-6 text-grey-70 ${EYEBROW}`}>Audience & Tailoring</h3>
            <dl className="mt-2">
              <AttributeRow label="Audience" value={comm.audience} />
              <AttributeRow label="Campaign" value={comm.campaign} />
              <AttributeRow label="Theme" value={comm.theme} />
            </dl>
            {tailoringChips.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {tailoringChips.map((chip) => (
                  <span
                    key={chip.axis + chip.value}
                    className="rounded-full bg-grey-10 px-2 py-0.5 text-xs text-grey-80"
                  >
                    <span className="text-grey-60">{chip.axis} · </span>
                    <span className="font-medium text-grey-90">{chip.value}</span>
                  </span>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Send performance — plain stats, whitespace does the work ── */}
        {comm.type !== "event" && (
          <>
            <h3 className={`mt-6 text-grey-70 ${EYEBROW}`}>Performance</h3>
            {comm.openRate || comm.clickRate ? (
              <div className="mt-2 flex gap-10">
                <div>
                  <p className="text-2xl font-semibold text-grey-90">{comm.openRate || "—"}</p>
                  <p className="text-xs text-grey-70">Open rate</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-grey-90">{comm.clickRate || "—"}</p>
                  <p className="text-xs text-grey-70">Click rate</p>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-grey-70">No send data yet.</p>
            )}
          </>
        )}

        <FeedbackThread entries={entries} />
      </div>

      <FeedbackComposer onAdd={onAdd} />
    </DetailPanelShell>
  );
}
