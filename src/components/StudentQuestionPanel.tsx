import { GraduationCap } from "lucide-react";
import { linkedCommIds } from "../data/studentExperience";
import { TIER_LABEL, questionEvidence, stageEvidence } from "../data/studentSources";
import type { Comm, FeedbackEntry } from "../data/types";
import { commDateLabel } from "../lib/scale";
import { EYEBROW, FOCUS_RING } from "../lib/styles";
import { DetailPanelShell } from "./DetailPanelShell";
import { FeedbackComposer, FeedbackThread } from "./FeedbackSection";
import { COMM_COLORS, COMM_ICONS, COMM_LABELS } from "./icons";
import type { QuestionRef } from "./StudentJourneyLane";

/** Stable feedback-collection key for a question's comment thread. */
export const questionFeedbackId = (q: QuestionRef) => `q:${q.stage}:${q.question}`;

interface Props {
  question: QuestionRef;
  allComms: Comm[];
  entries: FeedbackEntry[];
  onClose: () => void;
  onAdd: (entry: Omit<FeedbackEntry, "id" | "createdAt">) => void;
  onDelete?: (entryId: string) => void;
  onOpenComm?: (commId: string) => void;
}

/** Detail panel for a single student question: the touchpoints that answer it,
 *  why we believe students ask it (sources), and a comment thread. */
export function StudentQuestionPanel({
  question,
  allComms,
  entries,
  onClose,
  onAdd,
  onDelete,
  onOpenComm,
}: Props) {
  const { stage, question: q } = question;
  const byId = new Map(allComms.map((c) => [c.id, c]));
  const linked = linkedCommIds(stage, q)
    .map((id) => byId.get(id))
    .filter((c): c is Comm => !!c);
  const { origin, tier } = questionEvidence(stage, q);
  const { sources } = stageEvidence(stage);

  const tierTone =
    tier === "triangulated" || tier === "evidenced"
      ? "bg-tint-blue text-rmit-blue-interactive"
      : tier === "directional"
        ? "bg-tint-amber text-amber"
        : "bg-grey-10 text-grey-70";

  return (
    <DetailPanelShell
      overline={`${stage} · Student question`}
      title={q}
      iconChipClass="bg-tint-blue text-rmit-blue"
      icon={<GraduationCap size={16} strokeWidth={1.75} aria-hidden />}
      onClose={onClose}
    >
      <div className="flex-1 overflow-y-auto p-6">
        {/* Touchpoints that answer it */}
        <h3 className={`text-grey-70 ${EYEBROW}`}>
          Touchpoints that answer this{linked.length > 0 && ` · ${linked.length}`}
        </h3>
        {linked.length === 0 ? (
          <p className="mt-3 rounded-md border border-dashed border-grey-30 bg-grey-10 px-3 py-2.5 text-sm text-grey-70">
            No touchpoint answers this yet — an open gap in the current map.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-1.5">
            {linked.map((c) => {
              const Icon = COMM_ICONS[c.type];
              const colors = COMM_COLORS[c.type];
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onOpenComm?.(c.id)}
                    disabled={!onOpenComm}
                    className={`flex w-full items-center gap-2.5 rounded-md border border-grey-30 bg-card px-2.5 py-2 text-left transition-colors ${
                      onOpenComm ? "hover:border-rmit-blue-interactive/60 hover:bg-tint-blue/30" : ""
                    } ${FOCUS_RING}`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${colors.chip} ${colors.text}`}
                    >
                      <Icon size={13} strokeWidth={2} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-grey-90">{c.title}</span>
                      <span className="block text-xs text-grey-70">
                        {COMM_LABELS[c.type]} · {commDateLabel(c.month)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {/* Why we believe they ask it */}
        <h3 className={`mt-6 border-t border-grey-30 pt-6 text-grey-70 ${EYEBROW}`}>
          Why we believe they ask this
        </h3>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tierTone}`}>
            {TIER_LABEL[tier]}
          </span>
          <span className="rounded-full bg-grey-10 px-2 py-0.5 text-xs text-grey-70">
            {origin === "team" ? "From the team's map" : "Derived from data"}
          </span>
        </div>
        {sources.length > 0 && (
          <ul className="mt-3 flex flex-col gap-2.5 text-sm leading-snug">
            {sources.map((s) => (
              <li key={s.label}>
                <span className="font-semibold text-grey-90">{s.label}</span>
                <span className="text-grey-70"> — {s.detail}</span>
              </li>
            ))}
          </ul>
        )}

        <FeedbackThread entries={entries} onDelete={onDelete} />
      </div>

      <FeedbackComposer onAdd={onAdd} />
    </DetailPanelShell>
  );
}
