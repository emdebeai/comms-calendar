import { useRef, useState } from "react";
import { MessageSquarePlus, Trash2 } from "lucide-react";
import type { FeedbackEntry } from "../data/types";
import { EYEBROW, FOCUS_RING } from "../lib/styles";
import { getUser } from "../lib/user";

interface Props {
  entries: FeedbackEntry[];
  onAdd: (entry: Omit<FeedbackEntry, "id" | "createdAt">) => void | Promise<void>;
}

const INPUT_CLASS =
  "rounded-md border border-grey-30 bg-card px-3 py-2 text-sm text-grey-90 placeholder:text-grey-70 focus:border-rmit-blue-interactive focus:outline-2 focus:outline-offset-0 focus:outline-rmit-blue-interactive";

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Feedback thread heading + entries — placed inside the panel's scroll area. */
export function FeedbackThread({
  entries,
  onDelete,
}: {
  entries: FeedbackEntry[];
  onDelete?: (entryId: string) => void;
}) {
  return (
    <>
      <h3 className={`mt-6 border-t border-grey-30 pt-6 text-grey-70 ${EYEBROW}`}>Feedback &amp; metrics</h3>
      {/* Live region so newly added notes are announced to screen readers. */}
      <div aria-live="polite">
        {entries.length === 0 ? (
          <p className="mt-3 text-sm text-grey-70">
            No notes yet — be the first to leave feedback or log a metric.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-4">
            {[...entries].reverse().map((entry) => (
              <li key={entry.id}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-grey-90">{entry.author}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-grey-70">{formatTimestamp(entry.createdAt)}</span>
                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm("Delete this comment? This can't be undone."))
                            onDelete(entry.id);
                        }}
                        aria-label={`Delete comment by ${entry.author}`}
                        className={`rounded-md p-0.5 text-grey-60 transition-colors hover:text-danger ${FOCUS_RING}`}
                      >
                        <Trash2 size={13} strokeWidth={2} aria-hidden />
                      </button>
                    )}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-grey-80">{entry.comment}</p>
                {entry.metricLabel && (
                  <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-tint-blue px-2 py-0.5 text-xs font-medium text-rmit-blue">
                    {entry.metricLabel}: {entry.metricValue}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

/** Compose form — one quiet "Add a note…" line until engaged; the name and
 *  metric fields (with visible labels) only appear while composing. Pinned
 *  to the bottom of the panel, outside the scroll area. */
export function FeedbackComposer({ onAdd }: Pick<Props, "onAdd">) {
  // Signed automatically by the NameGate identity — no per-note name typing.
  // Falls back to the manual field only if somehow no identity exists.
  const knownName = getUser()?.firstName ?? "";
  const [author, setAuthor] = useState("");
  const [comment, setComment] = useState("");
  const [metricLabel, setMetricLabel] = useState("");
  const [metricValue, setMetricValue] = useState("");
  const [composing, setComposing] = useState(false);
  const [saving, setSaving] = useState(false);
  // A note that failed to save stays in the box with the reason — losing
  // someone's typing silently is worse than any error message.
  const [error, setError] = useState<string | null>(null);

  const formRef = useRef<HTMLDivElement>(null);
  const commentRef = useRef<HTMLTextAreaElement>(null);

  const formEmpty =
    !comment.trim() && !author.trim() && !metricLabel.trim() && !metricValue.trim();

  // Collapse the compose form when focus leaves it with nothing typed.
  const onFormBlur = (e: React.FocusEvent) => {
    if (formRef.current?.contains(e.relatedTarget as Node)) return;
    if (formEmpty) setComposing(false);
  };

  const submit = async () => {
    if (!comment.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onAdd({
        author: knownName || author.trim() || "Anonymous",
        comment: comment.trim(),
        metricLabel: metricLabel.trim() || undefined,
        metricValue: metricValue.trim() || undefined,
      });
    } catch (err) {
      setSaving(false);
      setError((err as Error).message || "That note didn't save. Try again.");
      return;
    }
    setSaving(false);
    setComment("");
    setMetricLabel("");
    setMetricValue("");
    // Keep the form open and focused so a second note is one keystroke away
    // (and so focus never falls out of the dialog's tab trap).
    commentRef.current?.focus();
  };

  return (
    <div
      ref={formRef}
      className="shrink-0 border-t border-grey-30 bg-card p-5"
      onBlur={onFormBlur}
    >
      <div className="flex flex-col gap-2">
        <textarea
          ref={commentRef}
          id="fb-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          onFocus={() => setComposing(true)}
          placeholder="Add a note…"
          aria-label="Add a note"
          rows={composing ? 3 : 1}
          className={`resize-none ${INPUT_CLASS}`}
        />
        {composing && (
          <>
            {knownName ? (
              <p className="text-xs text-grey-70">
                Commenting as <span className="font-semibold text-grey-90">{knownName}</span>
              </p>
            ) : (
              <div className="flex gap-2">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <label htmlFor="fb-author" className="text-xs text-grey-70">
                    Your name (optional)
                  </label>
                  <input
                    id="fb-author"
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <label htmlFor="fb-metric" className="text-xs text-grey-70">
                  Metric (optional)
                </label>
                <input
                  id="fb-metric"
                  type="text"
                  value={metricLabel}
                  onChange={(e) => setMetricLabel(e.target.value)}
                  placeholder="e.g. Open rate"
                  className={INPUT_CLASS}
                />
              </div>
              <div className="flex w-28 flex-col gap-1">
                <label htmlFor="fb-value" className="text-xs text-grey-70">
                  Value
                </label>
                <input
                  id="fb-value"
                  type="text"
                  value={metricValue}
                  onChange={(e) => setMetricValue(e.target.value)}
                  placeholder="e.g. 42%"
                  className={INPUT_CLASS}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={submit}
              disabled={!comment.trim() || saving}
              className={`mt-1 flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-header px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
            >
              <MessageSquarePlus size={14} strokeWidth={1.75} aria-hidden />
              {saving ? "Adding…" : "Add note"}
            </button>
            {error ? (
              <p role="alert" className="text-xs text-danger">
                {error} Your note is still here — try again in a moment.
              </p>
            ) : (
              <p className="text-xs text-grey-70">
                Notes are shared with everyone using this timeline.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
