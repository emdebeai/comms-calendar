import { useState } from "react";
import { Check, Pencil } from "lucide-react";
import { MOMENTS, STAGES } from "../data/journey";
import { linkedQuestions } from "../data/studentExperience";
import type { Comm, CommType, FeedbackEntry } from "../data/types";
import { commDateLabel } from "../lib/scale";
import { SEGMENT_AXES } from "../lib/segments";
import { EYEBROW, FOCUS_RING } from "../lib/styles";
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
  /** admin only — delete a comment by id */
  onDelete?: (entryId: string) => void;
  /** persist a field edit made in the panel */
  onEdit?: (patch: Partial<Comm>) => void;
}

const FIELD =
  "w-full rounded-md border border-grey-30 bg-card px-2.5 py-1.5 text-sm text-grey-90 placeholder:text-grey-70 focus:border-rmit-blue-interactive focus:outline-2 focus:outline-offset-0 focus:outline-rmit-blue-interactive";
const TEAMS: Comm["team"][] = [
  "recruitment",
  "marketing-events",
  "marketing",
  "admissions",
  "conversion",
  "vtac",
];

/** Editable form for a comm's details. Text fields commit on blur, selects on
 *  change; each sends a single-field patch, which the app accumulates. */
function EditForm({ comm, onEdit }: { comm: Comm; onEdit: (patch: Partial<Comm>) => void }) {
  const set = (field: keyof Comm, value: string) =>
    onEdit({ [field]: value.trim() || undefined } as Partial<Comm>);
  const Text = ({ label, field }: { label: string; field: keyof Comm }) => (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-grey-70">{label}</span>
      <input
        type="text"
        defaultValue={(comm[field] as string) ?? ""}
        onBlur={(e) => set(field, e.target.value)}
        className={FIELD}
      />
    </label>
  );
  return (
    <div className="flex flex-col gap-3">
      <Text label="Title" field="title" />
      <label className="flex flex-col gap-1">
        <span className="text-sm text-grey-70">Type</span>
        <select
          value={comm.type}
          onChange={(e) => onEdit({ type: e.target.value as CommType })}
          className={FIELD}
        >
          {(Object.keys(COMM_LABELS) as CommType[]).map((t) => (
            <option key={t} value={t}>
              {COMM_LABELS[t]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-grey-70">Team</span>
        <select
          value={comm.team}
          onChange={(e) => onEdit({ team: e.target.value as Comm["team"] })}
          className={FIELD}
        >
          {TEAMS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <Text label="Time" field="time" />
      <label className="flex flex-col gap-1">
        <span className="text-sm text-grey-70">Moment</span>
        <select
          value={comm.momentId ?? ""}
          onChange={(e) => onEdit({ momentId: e.target.value || undefined })}
          className={FIELD}
        >
          <option value="">None</option>
          {MOMENTS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </label>
      <Text label="Primary CTA" field="cta" />
      <Text label="Secondary CTA 1" field="secondaryCta1" />
      <Text label="Secondary CTA 2" field="secondaryCta2" />
      <Text label="Audience" field="audience" />
      <Text label="Campaign" field="campaign" />
      <Text label="Theme" field="theme" />
      <Text label="Open rate" field="openRate" />
      <Text label="Click rate" field="clickRate" />
    </div>
  );
}

// Quiet Notion-style property row: sentence-case regular-weight label that
// recedes, value that carries. Blank attributes are omitted entirely rather
// than shown as a row of "—", so the rows that carry signal aren't buried.
// Uppercase EYEBROW emphasis is reserved for the section headings.
function AttributeRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-3 py-1">
      <dt className="w-32 shrink-0 text-sm text-grey-70">{label}</dt>
      <dd className="min-w-0 text-sm text-grey-90">{value}</dd>
    </div>
  );
}

export function CommDetailPanel({ comm, allComms, entries, onClose, onAdd, onDelete, onEdit }: Props) {
  const [editing, setEditing] = useState(false);
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
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className={`text-grey-70 ${EYEBROW}`}>Details</h3>
          {onEdit && (
            <button
              type="button"
              onClick={() => setEditing((e) => !e)}
              aria-pressed={editing}
              className={`flex items-center gap-1.5 rounded-md border border-grey-30 px-2.5 py-1 text-xs font-medium text-grey-80 hover:bg-grey-10 ${FOCUS_RING}`}
            >
              {editing ? (
                <>
                  <Check size={13} strokeWidth={2} aria-hidden /> Done
                </>
              ) : (
                <>
                  <Pencil size={13} strokeWidth={2} aria-hidden /> Edit
                </>
              )}
            </button>
          )}
        </div>
        {editing && onEdit ? (
          <div className="mt-3">
            <EditForm key={comm.id} comm={comm} onEdit={onEdit} />
          </div>
        ) : (
        <>
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
                <dt className="w-32 shrink-0 text-sm text-grey-70">Primary CTA</dt>
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
            <h3 className={`mt-6 border-t border-grey-30 pt-6 text-grey-70 ${EYEBROW}`}>Audience &amp; Tailoring</h3>
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
            <h3 className={`mt-6 border-t border-grey-30 pt-6 text-grey-70 ${EYEBROW}`}>Performance</h3>
            {comm.openRate || comm.clickRate ? (
              <div className="mt-2 flex gap-10">
                <div>
                  <p className="text-2xl font-semibold text-grey-90">{comm.openRate || "—"}</p>
                  {/* A webpage's two stats are traffic attribution + form
                      conversion, not send metrics — same slots, honest labels. */}
                  <p className="text-xs text-grey-70">
                    {comm.type === "webpage" ? "Traffic from linked eDM" : "Open rate"}
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-grey-90">{comm.clickRate || "—"}</p>
                  <p className="text-xs text-grey-70">
                    {comm.type === "webpage" ? "Forms started → registrations" : "Click rate"}
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-grey-70">No send data yet.</p>
            )}
          </>
        )}

        </>
        )}

        <FeedbackThread entries={entries} onDelete={onDelete} />
      </div>

      <FeedbackComposer onAdd={onAdd} />
    </DetailPanelShell>
  );
}
