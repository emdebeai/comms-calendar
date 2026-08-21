import { GraduationCap } from "lucide-react";
import { linkedCommIds } from "../data/studentExperience";
import { stageEvidence } from "../data/studentSources";
import type { Comm, FeedbackEntry } from "../data/types";
import { commDateLabel } from "../lib/scale";
import { EYEBROW, FOCUS_RING } from "../lib/styles";
import { DetailPanelShell } from "./DetailPanelShell";
import { FeedbackComposer, FeedbackThread } from "./FeedbackSection";
import { COMM_COLORS, COMM_ICONS, COMM_LABELS } from "./icons";
import type { QuestionRef } from "./StudentJourneyLane";

/** Stable feedback-collection key for a question's comment thread. */
export const questionFeedbackId = (q: QuestionRef) => `q:${q.stage}:${q.question}`;

/** Break a source's detail into its separate findings — split between
 *  sentences (a full stop before a space + capital / opening quote), so
 *  internal points like "p.9" stay intact. */
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=\.)\s+(?=[A-Z“"])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

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
  const { sources } = stageEvidence(stage);

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

        {/* Sources */}
        <h3 className={`mt-6 border-t border-grey-30 pt-6 text-grey-70 ${EYEBROW}`}>Sources</h3>
        {sources.length === 0 ? (
          <p className="mt-3 text-sm text-grey-70">No sources recorded for this stage.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-4">
            {sources.map((s) => (
              <li key={s.label}>
                <p className="text-sm font-semibold text-grey-90">{s.label}</p>
                <ul className="mt-1.5 flex flex-col gap-1">
                  {splitSentences(s.detail).map((line, i) => (
                    <li key={i} className="flex gap-2 text-sm leading-snug text-grey-70">
                      <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-grey-40" aria-hidden />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
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
