import { useState } from "react";
import { MessageSquarePlus, X } from "lucide-react";
import { MOMENTS, STAGES } from "../data/journey";
import type { Comm, FeedbackEntry } from "../data/types";
import { commDateLabel } from "../lib/scale";
import { COMM_COLORS, COMM_ICONS, COMM_LABELS } from "./icons";

interface Props {
  comm: Comm;
  /** full comm list, for resolving trigger relationships to titles */
  allComms: Comm[];
  entries: FeedbackEntry[];
  onClose: () => void;
  onAdd: (entry: Omit<FeedbackEntry, "id" | "createdAt">) => void;
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function AttributeRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex gap-3 py-1.5">
      <dt className="w-32 shrink-0 text-xs font-semibold tracking-widest text-grey-60 uppercase">
        {label}
      </dt>
      <dd className={`min-w-0 text-sm ${value ? "text-grey-90" : "text-grey-60"}`}>
        {value || "—"}
      </dd>
    </div>
  );
}

export function CommDetailPanel({ comm, allComms, entries, onClose, onAdd }: Props) {
  const [author, setAuthor] = useState("");
  const [comment, setComment] = useState("");
  const [metricLabel, setMetricLabel] = useState("");
  const [metricValue, setMetricValue] = useState("");

  const Icon = COMM_ICONS[comm.type];
  const colors = COMM_COLORS[comm.type];

  // Derived attributes
  const day = Math.round((comm.month % 1) * 30) + 1;
  const dateLabel = `${day} ${commDateLabel(comm.month)}`;
  const stage = STAGES.find((s) => comm.month >= s.from && comm.month < s.to)?.label;
  const moment = MOMENTS.find((m) => m.id === comm.momentId)?.label;
  const teamLabel = comm.team.charAt(0).toUpperCase() + comm.team.slice(1);
  const triggersTitles = (comm.triggers ?? [])
    .map((id) => allComms.find((c) => c.id === id)?.title)
    .filter(Boolean)
    .join("; ");
  const triggeredByTitles = allComms
    .filter((c) => c.triggers?.includes(comm.id))
    .map((c) => c.title)
    .join("; ");

  const submit = () => {
    if (!comment.trim()) return;
    onAdd({
      author: author.trim() || "Anonymous",
      comment: comment.trim(),
      metricLabel: metricLabel.trim() || undefined,
      metricValue: metricValue.trim() || undefined,
    });
    setComment("");
    setMetricLabel("");
    setMetricValue("");
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-grey-90/30" />
      <div
        className="relative flex h-full w-96 max-w-full flex-col bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-grey-30 p-5">
          <div className="flex gap-3">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${colors.chip} ${colors.text}`}
            >
              <Icon size={16} strokeWidth={1.75} aria-hidden />
            </span>
            <div>
              <p className="text-xs font-semibold tracking-widest text-grey-60 uppercase">
                {COMM_LABELS[comm.type]} · {dateLabel}
              </p>
              <h2 className="text-xl font-semibold text-grey-90">{comm.title}</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-1 text-grey-60 hover:bg-grey-10 hover:text-grey-90"
            aria-label="Close"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {/* ── Attributes ── */}
          <h3 className="text-xs font-semibold tracking-widest text-grey-60 uppercase">
            Details
          </h3>
          <dl className="mt-2 divide-y divide-grey-20">
            <AttributeRow label="Team" value={teamLabel} />
            <AttributeRow label="Type" value={COMM_LABELS[comm.type]} />
            <AttributeRow label="Date" value={dateLabel} />
            <AttributeRow label="Journey stage" value={stage} />
            <AttributeRow label="Moment" value={moment} />
            <AttributeRow label="Primary CTA" value={comm.cta} />
            <AttributeRow label="Secondary 1" value={comm.secondaryCta1} />
            <AttributeRow label="Secondary 2" value={comm.secondaryCta2} />
            <AttributeRow label="Triggers" value={triggersTitles} />
            <AttributeRow label="Triggered by" value={triggeredByTitles} />
          </dl>

          {/* ── Comments below the attributes ── */}
          <h3 className="mt-6 text-xs font-semibold tracking-widest text-grey-60 uppercase">
            Feedback & metrics
          </h3>
          {entries.length === 0 ? (
            <p className="mt-3 text-sm text-grey-60">
              No notes yet — be the first to leave feedback or log a metric.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {[...entries].reverse().map((entry) => (
                <li key={entry.id} className="rounded-md border border-grey-30 p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold text-grey-90">{entry.author}</span>
                    <span className="text-xs text-grey-60">{formatTimestamp(entry.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-sm text-grey-80">{entry.comment}</p>
                  {entry.metricLabel && (
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-tint-blue px-2 py-0.5 text-xs font-medium text-rmit-blue">
                      {entry.metricLabel}: {entry.metricValue}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="shrink-0 border-t border-grey-30 bg-grey-10 p-5">
          <div className="flex flex-col gap-2">
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Your name (optional)"
              className="rounded-md border border-grey-30 bg-white px-3 py-2 text-sm text-grey-90 placeholder:text-grey-60 focus:border-rmit-blue-interactive focus:outline-none"
            />
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Leave feedback on this comm…"
              rows={3}
              className="resize-none rounded-md border border-grey-30 bg-white px-3 py-2 text-sm text-grey-90 placeholder:text-grey-60 focus:border-rmit-blue-interactive focus:outline-none"
            />
            <div className="flex gap-2">
              <input
                type="text"
                value={metricLabel}
                onChange={(e) => setMetricLabel(e.target.value)}
                placeholder="Metric (e.g. Open rate)"
                className="min-w-0 flex-1 rounded-md border border-grey-30 bg-white px-3 py-2 text-sm text-grey-90 placeholder:text-grey-60 focus:border-rmit-blue-interactive focus:outline-none"
              />
              <input
                type="text"
                value={metricValue}
                onChange={(e) => setMetricValue(e.target.value)}
                placeholder="Value (e.g. 42%)"
                className="w-28 rounded-md border border-grey-30 bg-white px-3 py-2 text-sm text-grey-90 placeholder:text-grey-60 focus:border-rmit-blue-interactive focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={submit}
              disabled={!comment.trim()}
              className="mt-1 flex items-center justify-center gap-1.5 rounded-full bg-rmit-blue px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <MessageSquarePlus size={14} strokeWidth={1.75} aria-hidden />
              Add note
            </button>
            <p className="text-xs text-grey-60">
              Shared with anyone using this app — stored on the local server
              for now, or the SharePoint workbook once that&rsquo;s connected.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
