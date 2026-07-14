import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Legend } from "./components/Legend";
import { Timeline } from "./components/Timeline";
import { connectedIds } from "./components/TriggerLayer";
import { CommDetailPanel } from "./components/CommDetailPanel";
import { CampaignDetailPanel } from "./components/CampaignDetailPanel";
import { campaignGroup } from "./data/comms";
import type { CommType, FeedbackEntry, Comm } from "./data/types";
import { addFeedbackEntry, loadFeedback, type FeedbackStore } from "./lib/feedback";
import { loadComms } from "./lib/loadComms";
import { DESIGN } from "./lib/designConfig";
import { commDateLabel, layoutTimeline, scaleX, type ExpandedMonth } from "./lib/scale";
import { COMM_LABELS } from "./components/icons";

const ALL_TYPES: CommType[] = ["email", "sms", "webinar", "call", "event"];

export default function App() {
  const [rawComms, setRawComms] = useState<Comm[] | null>(null);
  const [importIssues, setImportIssues] = useState<{ row: number; message: string }[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTypes, setActiveTypes] = useState<Set<CommType>>(new Set(ALL_TYPES));
  const [hovered, setHovered] = useState<string | null>(null);
  const [showLines, setShowLines] = useState(false);
  const [hoveredMoment, setHoveredMoment] = useState<string | null>(null);
  const [pinnedMoment, setPinnedMoment] = useState<string | null>(null);
  // Month zoom cycles collapsed → week view → day-by-day → collapsed.
  const [expandedMonth, setExpandedMonth] = useState<ExpandedMonth | null>(null);
  // Student experience layer band (under the stage header). Its default open
  // state is a reversible design decision (see DESIGN.experienceOpenByDefault);
  // expanding it grows the header, so it feeds into layoutTimeline.
  const [experienceOpen, setExperienceOpen] = useState<boolean>(DESIGN.experienceOpenByDefault);
  // Media-schedule group bar — expanding shows per-channel bars, which grows
  // the Marketing lane, so it also feeds into layoutTimeline.
  const [campaignsOpen, setCampaignsOpen] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackStore>({});
  const [openCommId, setOpenCommId] = useState<string | null>(null);
  const [openCampaignId, setOpenCampaignId] = useState<string | null>(null);
  // Measured card heights (id → px), reported by each CommCard. Feeds back
  // into layoutTimeline so rows stack by real height instead of a fixed slot.
  const [cardHeights, setCardHeights] = useState<Record<string, number>>({});

  const scrollerRef = useRef<HTMLDivElement>(null);

  const handleMeasure = useCallback((id: string, height: number) => {
    setCardHeights((prev) => (prev[id] === height ? prev : { ...prev, [id]: height }));
  }, []);

  useEffect(() => {
    loadComms()
      .then(({ comms, issues }) => {
        setRawComms(comms);
        setImportIssues(issues);
      })
      .catch((err: Error) => {
        // Technical detail goes to the console for developers; users see the
        // friendly message below.
        console.error("Failed to load comms data:", err);
        setLoadError(err.message);
      });
    loadFeedback()
      .then(setFeedback)
      .catch(() => setFeedback({}));
  }, []);

  // Re-lays the timeline out whenever the data or the expanded month
  // changes (this also updates the module-level scale/lane state that the
  // timeline components read while rendering).
  const layout = useMemo(
    () =>
      rawComms
        ? layoutTimeline(rawComms, expandedMonth, cardHeights, experienceOpen, campaignsOpen)
        : null,
    [rawComms, expandedMonth, cardHeights, experienceOpen, campaignsOpen],
  );

  // NOTE: no scroll-anchoring on expand — expansion only adds width to the
  // RIGHT of the expanded month's left edge, so leaving scrollLeft alone
  // keeps that edge visually pinned and the month accordions open
  // rightwards (and collapses back the same way).

  // On first load, open on where the comms actually are (the Year 12
  // application season) rather than the near-empty Year 10 start.
  const didInitialScroll = useRef(false);
  useLayoutEffect(() => {
    if (didInitialScroll.current || !layout || !scrollerRef.current) return;
    didInitialScroll.current = true;
    scrollerRef.current.scrollLeft = Math.max(0, scaleX(24) - 40); // Jan, Year 12
  }, [layout]);

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
  const openCampaign = openCampaignId
    ? campaignGroup.channels.find((c) => c.id === openCampaignId)
    : undefined;

  // While a detail dialog is open, take the timeline behind it out of the
  // AT tree and tab order (belt-and-braces with the dialog's own focus trap).
  const bgInert = { inert: openComm || openCampaign ? true : undefined };

  return (
    <div ref={scrollerRef} className="h-screen overflow-auto bg-surface font-sans text-grey-90">
      {/* Bypass block for the 100+ tab stops on the canvas. Kept in the DOM
          (so screen readers announce it) but translated off the top edge
          until focused. */}
      <a
        href="#comms-list"
        className="absolute left-2 top-2 z-50 -translate-y-16 rounded-md bg-rmit-blue px-3 py-2 text-sm font-medium text-white transition-transform focus:translate-y-0"
      >
        Skip to communications list
      </a>
      {/* Sticky left so the title stays put during horizontal scroll, but
          scrolls away vertically like normal page content. */}
      <header className="sticky left-0 w-screen px-6 pt-6 pb-5" {...bgInert}>
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
        {importIssues.length > 0 && (
          <div
            role="status"
            className="mt-3 max-w-3xl rounded-md border border-amber bg-tint-amber px-3 py-2 text-sm text-grey-90"
          >
            <span className="font-semibold">
              {importIssues.length} row{importIssues.length === 1 ? "" : "s"} couldn&rsquo;t be
              imported
            </span>{" "}
            and {importIssues.length === 1 ? "was" : "were"} skipped —{" "}
            {importIssues
              .slice(0, 3)
              .map((i) => `row ${i.row} (${i.message})`)
              .join("; ")}
            {importIssues.length > 3 ? `; +${importIssues.length - 3} more` : ""}. Everything
            else loaded fine.
          </div>
        )}
      </header>

      <main className="border-t border-grey-30" {...bgInert}>
        {loadError ? (
          <div className="p-6 text-sm text-danger" role="alert">
            We couldn&rsquo;t load the comms timeline. Try refreshing the page —
            if it keeps happening, let the team know.
          </div>
        ) : !layout ? (
          <div
            className="p-6 text-sm text-grey-70"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            Loading comms…
          </div>
        ) : (
          <>
            <Timeline
              comms={layout.comms}
              hiddenIds={layout.hiddenIds}
              chips={layout.chips}
              expandedMonth={expandedMonth}
              onToggleMonth={(m) =>
                setExpandedMonth((p) =>
                  p?.month !== m
                    ? { month: m, level: 1 } // collapsed (or other month) → weeks
                    : p.level === 1
                      ? { month: m, level: 2 } // weeks → days
                      : null, // days → collapsed
                )
              }
              activeTypes={activeTypes}
              activeId={activeId}
              connected={connected}
              showLines={showLines}
              activeMomentId={activeMomentId}
              experienceOpen={experienceOpen}
              onToggleExperience={() => setExperienceOpen((s) => !s)}
              campaignsOpen={campaignsOpen}
              onToggleCampaigns={() => setCampaignsOpen((s) => !s)}
              onOpenCampaign={setOpenCampaignId}
              onHover={setHovered}
              onOpenDetail={setOpenCommId}
              onMeasure={handleMeasure}
              onClearFocus={() => setPinnedMoment(null)}
              onHoverMoment={setHoveredMoment}
              onPinMoment={(id) => setPinnedMoment((p) => (p === id ? null : id))}
              feedbackCount={(commId) => feedback[commId]?.length ?? 0}
            />
            {/* Text alternative to the visual timeline canvas, which conveys
                meaning through colour + position (WCAG 1.3.1). Hidden visually,
                read in DOM order by assistive tech. Reflects the active type
                filter so it matches what's shown on the canvas. */}
            <section id="comms-list" className="sr-only" aria-label="Communications list">
              <h2>Communications{activeTypes.size < ALL_TYPES.length ? " (filtered)" : ""}</h2>
              <ul>
                {layout.comms
                  .filter((c) => activeTypes.has(c.type))
                  .map((c) => (
                    <li key={c.id}>
                      {COMM_LABELS[c.type]} — {c.title}, {c.team} team,{" "}
                      {commDateLabel(c.month)}
                      {c.type !== "event" && c.cta ? `, CTA: ${c.cta}` : ""}
                    </li>
                  ))}
              </ul>
            </section>
          </>
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

      {openCampaign && (
        <CampaignDetailPanel
          campaign={openCampaign}
          entries={feedback[openCampaign.id] ?? []}
          onClose={() => setOpenCampaignId(null)}
          onAdd={(entry) => addFeedback(openCampaign.id, entry)}
        />
      )}
    </div>
  );
}
