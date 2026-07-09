import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Legend } from "./components/Legend";
import { Timeline } from "./components/Timeline";
import { connectedIds } from "./components/TriggerLayer";
import { CommDetailPanel } from "./components/CommDetailPanel";
import type { CommType, FeedbackEntry, Comm } from "./data/types";
import { addFeedbackEntry, loadFeedback, type FeedbackStore } from "./lib/feedback";
import { loadComms } from "./lib/loadComms";
import { layoutTimeline, scaleX } from "./lib/scale";

const ALL_TYPES: CommType[] = ["email", "sms", "webinar", "call", "event"];

export default function App() {
  const [rawComms, setRawComms] = useState<Comm[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTypes, setActiveTypes] = useState<Set<CommType>>(new Set(ALL_TYPES));
  const [hovered, setHovered] = useState<string | null>(null);
  const [showLines, setShowLines] = useState(false);
  const [hoveredMoment, setHoveredMoment] = useState<string | null>(null);
  const [pinnedMoment, setPinnedMoment] = useState<string | null>(null);
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<FeedbackStore>({});
  const [openCommId, setOpenCommId] = useState<string | null>(null);

  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadComms()
      .then(setRawComms)
      .catch((err: Error) => setLoadError(err.message));
    loadFeedback()
      .then(setFeedback)
      .catch(() => setFeedback({}));
  }, []);

  // Re-lays the timeline out whenever the data or the expanded month
  // changes (this also updates the module-level scale/lane state that the
  // timeline components read while rendering).
  const layout = useMemo(
    () => (rawComms ? layoutTimeline(rawComms, expandedMonth) : null),
    [rawComms, expandedMonth],
  );

  // Keep the just-expanded month in view — expansion shifts everything to
  // its right by several hundred px, so anchor its left edge near the
  // gutter instead of letting the viewport land somewhere arbitrary.
  useLayoutEffect(() => {
    if (expandedMonth === null || !scrollerRef.current) return;
    scrollerRef.current.scrollLeft = Math.max(0, scaleX(expandedMonth) - 40);
  }, [expandedMonth]);

  // Tracing is hover-only now; clicking a comm opens its detail panel.
  const activeId = hovered;
  const connected = layout ? connectedIds(layout.comms, activeId) : new Set<string>();
  const activeMomentId = pinnedMoment ?? hoveredMoment;

  const toggleType = (t: CommType) => {
    setActiveTypes((prev) => {
      if (prev.size === ALL_TYPES.length) return new Set([t]);
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next.size === 0 ? new Set(ALL_TYPES) : next;
    });
  };

  const addFeedback = async (commId: string, entry: Omit<FeedbackEntry, "id" | "createdAt">) => {
    const saved = await addFeedbackEntry(commId, entry);
    setFeedback((prev) => ({ ...prev, [commId]: [...(prev[commId] ?? []), saved] }));
  };

  const openComm =
    layout && openCommId ? layout.comms.find((c) => c.id === openCommId) : undefined;

  return (
    <div ref={scrollerRef} className="h-screen overflow-auto bg-surface font-sans text-grey-90">
      {/* Sticky left so the title stays put during horizontal scroll, but
          scrolls away vertically like normal page content. */}
      <header className="sticky left-0 w-screen px-6 pt-6 pb-5">
        <h1 className="text-3xl font-bold text-rmit-blue">
          Prospective Student Comms Journey
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-grey-70">
          Outbound and inbound communications across the three-year journey, from
          Year 10 to enrolment. The timeline gives Year 12&rsquo;s application season
          more room — that&rsquo;s where the volume is.
        </p>
        <Legend
          activeTypes={activeTypes}
          onToggle={toggleType}
          onReset={() => setActiveTypes(new Set(ALL_TYPES))}
          showLines={showLines}
          onToggleLines={() => setShowLines((s) => !s)}
        />
      </header>

      <main className="border-t border-grey-30">
        {loadError ? (
          <div className="p-6 text-sm text-rmit-red">
            Couldn&rsquo;t load comms data: {loadError}. Make sure the API
            server is running (<code>npm run dev</code> starts both) and
            server/data/comms.csv exists and matches the expected columns.
          </div>
        ) : !layout ? (
          <div className="p-6 text-sm text-grey-60">Loading comms…</div>
        ) : (
          <Timeline
            comms={layout.comms}
            hiddenIds={layout.hiddenIds}
            chips={layout.chips}
            expandedMonth={expandedMonth}
            onToggleMonth={(m) => setExpandedMonth((p) => (p === m ? null : m))}
            activeTypes={activeTypes}
            activeId={activeId}
            connected={connected}
            showLines={showLines}
            activeMomentId={activeMomentId}
            onHover={setHovered}
            onOpenDetail={setOpenCommId}
            onClearFocus={() => setPinnedMoment(null)}
            onHoverMoment={setHoveredMoment}
            onPinMoment={(id) => setPinnedMoment((p) => (p === id ? null : id))}
            feedbackCount={(commId) => feedback[commId]?.length ?? 0}
          />
        )}
      </main>

      {openComm && layout && (
        <CommDetailPanel
          comm={openComm}
          allComms={layout.comms}
          entries={feedback[openComm.id] ?? []}
          onClose={() => setOpenCommId(null)}
          onAdd={(entry) => addFeedback(openComm.id, entry)}
        />
      )}
    </div>
  );
}
