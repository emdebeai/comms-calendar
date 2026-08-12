import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { ControlDock } from "./components/ControlDock";
import { PersonaDock } from "./components/PersonaDock";
import { Timeline } from "./components/Timeline";
import {
  availableSegments,
  matchesSegment,
  segmentCount,
  type SegmentSelection,
} from "./lib/segments";
import { connectedIds } from "./components/TriggerLayer";
import { CommDetailPanel } from "./components/CommDetailPanel";
import { CampaignDetailPanel } from "./components/CampaignDetailPanel";
import { StudentStagePanel } from "./components/StudentStagePanel";
import type { QuestionRef } from "./components/StudentJourneyLane";
import { allCampaignChannels } from "./data/comms";
import { STAGES } from "./data/journey";
import { Minimap } from "./components/Minimap";
import { linkedCommIds } from "./data/studentExperience";
import type { CommType, FeedbackEntry, Comm } from "./data/types";
import { addFeedbackEntry, loadFeedback, type FeedbackStore } from "./lib/feedback";
import { FOCUS_RING } from "./lib/styles";
import { loadComms } from "./lib/loadComms";
import {
  LABEL_W,
  commDateLabel,
  commPos,
  dateAtX,
  layoutTimeline,
  monthLabel,
  scaleX,
  type ExpandedMonths,
} from "./lib/scale";
import { COMM_LABELS } from "./components/icons";

const THEME_KEY = "comms-calendar-theme";

const ALL_TYPES: CommType[] = ["email", "sms", "webinar", "call", "event"];

// Spoken names for the three month-zoom levels (index = level).
const ZOOM_LEVEL_NAME = ["month view", "week view", "day view"] as const;

export default function App() {
  const [rawComms, setRawComms] = useState<Comm[] | null>(null);
  const [importIssues, setImportIssues] = useState<{ row: number; message: string }[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTypes, setActiveTypes] = useState<Set<CommType>>(new Set(ALL_TYPES));
  const [hovered, setHovered] = useState<string | null>(null);
  const [showLines, setShowLines] = useState(false);
  const [hoveredMoment, setHoveredMoment] = useState<string | null>(null);
  const [pinnedMoment, setPinnedMoment] = useState<string | null>(null);
  // Month zoom — each month independently cycles collapsed → week → day →
  // collapsed. Multiple can be open at once (month index → level).
  const [expandedMonths, setExpandedMonths] = useState<ExpandedMonths>(new Map());
  // Student journey — question focus comes straight from the lane (hover is
  // transient, pin sticks) and drives the cross-highlight: the linked comms
  // light up, everything else dims. openStage is the optional deep-dive
  // panel, opened from the ⓘ per stage.
  const [openStage, setOpenStage] = useState<string | null>(null);
  const [hoveredQuestion, setHoveredQuestion] = useState<QuestionRef | null>(null);
  const [pinnedQuestion, setPinnedQuestion] = useState<QuestionRef | null>(null);
  // The student-journey lane is off by default — the comms map stays clean
  // until you opt into the student view from the control dock.
  const [showStudentLayer, setShowStudentLayer] = useState(false);
  // Segment lens — opened from the persona dock. Focuses the map on comms
  // tailored to a chosen segment (college, campus, preference, event stage).
  const [segments, setSegments] = useState<SegmentSelection>({});
  // Equity cohort focus (e.g. SNAP) — exclusive: dims everything except comms
  // tailored to it, and jumps the map to the match.
  const [equity, setEquity] = useState<string | null>(null);
  // Media-schedule summary bars — expanding one shows its per-placement bars,
  // which grows the Marketing lane, so it also feeds into layoutTimeline.
  const [openCampaigns, setOpenCampaigns] = useState<Set<string>>(new Set());
  // Collapsed swimlanes (by lane id) — a collapsed lane shrinks to its label
  // strip and its content is hidden, so it feeds into layoutTimeline too.
  const [collapsedLanes, setCollapsedLanes] = useState<Set<string>>(new Set());
  // The overview / "show all lanes at once" toggle collapses every lane to its
  // compact touchpoint strip so the whole map fits vertically.
  const COLLAPSIBLE_LANES = ["recruitment", "marketing", "admissions", "conversion", "vtac", "digital", "study"];
  const allLanesCollapsed = COLLAPSIBLE_LANES.every((id) => collapsedLanes.has(id));
  const toggleAllLanes = () =>
    setCollapsedLanes(allLanesCollapsed ? new Set() : new Set(COLLAPSIBLE_LANES));
  const [feedback, setFeedback] = useState<FeedbackStore>({});
  const [openCommId, setOpenCommId] = useState<string | null>(null);
  const [openCampaignId, setOpenCampaignId] = useState<string | null>(null);
  // Measured card heights (id → px), reported by each CommCard. Feeds back
  // into layoutTimeline so rows stack by real height instead of a fixed slot.
  const [cardHeights, setCardHeights] = useState<Record<string, number>>({});
  // Dark mode. The initial value was already resolved (OS pref or saved
  // choice) by the inline script in index.html before first paint; this just
  // mirrors it into React so the toggle icon stays in sync.
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    typeof document !== "undefined" && document.documentElement.dataset.theme === "dark"
      ? "dark"
      : "light",
  );
  const toggleTheme = () =>
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      // Cross-fade the palette swap: a temporary class turns on colour
      // transitions for one beat, then comes off so repaints stay cheap.
      const root = document.documentElement;
      root.classList.add("theme-switching");
      window.setTimeout(() => root.classList.remove("theme-switching"), 350);
      root.dataset.theme = next;
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {
        /* private mode / storage disabled — the choice just won't persist */
      }
      return next;
    });

  const scrollerRef = useRef<HTMLDivElement>(null);
  // One zoom step per animation frame — a trackpad fires many wheel events per
  // gesture, and without this a flick would rocket month→day or overshoot.
  const zoomFrameLock = useRef(false);
  // zoomAnnounce feeds an aria-live region so screen-reader users get the same
  // "August — day view" feedback the sighted user gets from the reflow.
  const [zoomAnnounce, setZoomAnnounce] = useState("");

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

  // The timeline lays out in two passes. Pass 1 (baseLayout) uses only the
  // months the user manually expanded; from it we can see which comms got
  // folded into "+N more" chips. Pass 2 (layout, below) additionally
  // auto-expands any month that hides a comm still LIT under the active filter,
  // so a match is never trapped inside a folded chip. The RENDERED layout is
  // pass 2 (and, being computed last, it owns the module-level scale state).
  const baseLayout = useMemo(
    () =>
      rawComms
        ? layoutTimeline(
            rawComms,
            expandedMonths,
            cardHeights,
            openCampaigns,
            collapsedLanes,
            showStudentLayer,
          )
        : null,
    [rawComms, expandedMonths, cardHeights, openCampaigns, collapsedLanes, showStudentLayer],
  );

  // ── Focus + filter state (drives what dims) ──────────────────────────────
  // Tracing is hover-only now; clicking a comm opens its detail panel.
  const activeId = hovered;
  const connected = baseLayout ? connectedIds(baseLayout.comms, activeId) : new Set<string>();
  const activeMomentId = pinnedMoment ?? hoveredMoment;
  const activeQuestion = hoveredQuestion ?? pinnedQuestion;
  const questionCommIds = activeQuestion
    ? new Set(linkedCommIds(activeQuestion.stage, activeQuestion.question))
    : null;
  const momentCommIds =
    activeMomentId && baseLayout
      ? new Set(baseLayout.comms.filter((c) => c.momentId === activeMomentId).map((c) => c.id))
      : null;
  const triggerFocusActive = activeId !== null && connected.size > 0;
  // Focus precedence: an explicit student-question focus wins, then a moment,
  // then a hovered comm's trigger web. (An empty question set is meaningful —
  // it dims everything, the coverage gap made visible.)
  const focusSet =
    questionCommIds ??
    momentCommIds ??
    (triggerFocusActive ? new Set<string>([activeId as string, ...connected]) : null);

  // Whether a comm is hidden by the persistent type/segment/equity lenses
  // (independent of the transient hover/moment focus).
  const isFilteredOut = useCallback(
    (c: Comm) =>
      !activeTypes.has(c.type) ||
      !matchesSegment(c, segments) ||
      (equity !== null && c.equity !== equity),
    [activeTypes, segments, equity],
  );
  const filterActive =
    activeTypes.size < ALL_TYPES.length || segmentCount(segments) > 0 || equity !== null;
  // Any lens that dims part of the map — the always-on media campaigns and the
  // "+N more" chips recede into the background whenever one is engaged, so they
  // don't stay bright while the comms around them fade.
  const dimBackground = filterActive || focusSet !== null;

  // Auto-expand pass: expand any month holding a folded comm that's still lit
  // under the persistent filter, so the match surfaces instead of hiding inside
  // a "+N more" chip. Keyed off the filter lenses only (not transient hover),
  // so the map doesn't reflow as the mouse moves.
  const autoExpandMonths = useMemo(() => {
    if (!baseLayout || !filterActive) return null;
    const months = new Set<number>();
    for (const c of baseLayout.comms) {
      if (!baseLayout.hiddenIds.has(c.id) || collapsedLanes.has(c.team)) continue;
      if (!isFilteredOut(c)) months.add(Math.floor(c.month));
    }
    return months.size ? months : null;
  }, [baseLayout, filterActive, collapsedLanes, isFilteredOut]);

  const effectiveExpanded = useMemo(() => {
    if (!autoExpandMonths) return expandedMonths;
    const m = new Map(expandedMonths);
    for (const mo of autoExpandMonths) if (!m.has(mo)) m.set(mo, 2); // day view reveals all
    return m;
  }, [expandedMonths, autoExpandMonths]);

  const layout = useMemo(
    () =>
      rawComms
        ? layoutTimeline(
            rawComms,
            effectiveExpanded,
            cardHeights,
            openCampaigns,
            collapsedLanes,
            showStudentLayer,
          )
        : null,
    [rawComms, effectiveExpanded, cardHeights, openCampaigns, collapsedLanes, showStudentLayer],
  );

  // How many comms the active lenses leave lit — feeds the "N of M shown"
  // summary pill so filtering always says what it did.
  const shownCount = useMemo(
    () => (layout ? layout.comms.filter((c) => !isFilteredOut(c)).length : 0),
    [layout, isFilteredOut],
  );
  const clearAllFilters = () => {
    setActiveTypes(new Set(ALL_TYPES));
    setSegments({});
    setEquity(null);
  };

  // Which tailoring axes actually have values in the loaded data.
  const segmentAxes = useMemo(
    () => (rawComms ? availableSegments(rawComms) : []),
    [rawComms],
  );
  // Equity cohorts present in the data (e.g. SNAP).
  const equityCohorts = useMemo(
    () =>
      rawComms
        ? [...new Set(rawComms.map((c) => c.equity).filter(Boolean))].sort()
        : [],
    [rawComms],
  ) as string[];

  // Comms explicitly tagged with each segment value / equity cohort — shown as
  // counts on the toggle chips (a mini-report on where tailoring effort goes).
  const segmentCounts = useMemo(() => {
    const m: Record<string, Record<string, number>> = {};
    if (!rawComms) return m;
    for (const { axis } of segmentAxes) m[axis.key] = {};
    for (const c of rawComms) {
      for (const { axis } of segmentAxes) {
        const v = c[axis.key];
        if (v) m[axis.key][v] = (m[axis.key][v] ?? 0) + 1;
      }
    }
    return m;
  }, [rawComms, segmentAxes]);
  const equityCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of rawComms ?? []) if (c.equity) m[c.equity] = (m[c.equity] ?? 0) + 1;
    return m;
  }, [rawComms]);

  // Stage names in the header band double as jump links.
  const jumpToStage = (from: number) =>
    scrollerRef.current?.scrollTo({ left: Math.max(0, scaleX(from) - 40), behavior: "smooth" });

  // Comms per journey stage — the coverage number on each stage label (this is
  // where "most comms sit in Consider" becomes visible on the map itself).
  const stageCounts = useMemo(() => {
    const m: Record<string, number> = {};
    if (!layout) return m;
    for (const s of STAGES) {
      m[s.label] = layout.comms.filter((c) => c.month >= s.from && c.month < s.to).length;
    }
    return m;
  }, [layout]);

  // When an equity cohort is focused, jump the map to its (often only) comm.
  useLayoutEffect(() => {
    if (!equity || !layout || !scrollerRef.current) return;
    const target = layout.comms.find((c) => c.equity === equity);
    if (!target) return;
    const { x, y } = commPos(target);
    scrollerRef.current.scrollTo({
      left: Math.max(0, x - 80),
      top: Math.max(0, y - 140),
      behavior: "smooth",
    });
  }, [equity, layout]);

  const toggleStudentLayer = () => {
    setShowStudentLayer((s) => !s);
    setHoveredQuestion(null);
    setPinnedQuestion(null);
  };

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
    ? allCampaignChannels.find((c) => c.id === openCampaignId)
    : undefined;

  // While a detail dialog is open, take the timeline behind it out of the
  // AT tree and tab order (belt-and-braces with the dialog's own focus trap).
  const bgInert = { inert: openComm || openCampaign ? true : undefined };

  // ── Semantic zoom by gesture / keyboard ──────────────────────────────────
  // Both paths drive the SAME month-level model as clicking a month header
  // (collapsed → weeks → days), so a zoom expands the "+N more" chips in the
  // month it targets while the toolbars, minimap and text all stay put.
  const panelOpen = Boolean(openComm || openCampaign || openStage);

  // Step one month's zoom by `dir` (+1 in / −1 out), keeping `date` fixed on
  // screen. flushSync commits the level change and re-runs layout SYNCHRONOUSLY
  // (so scaleX reflects the new widths immediately); we then shift scrollLeft by
  // exactly how far `date` moved — one atomic reflow, no follow-up-frame jump.
  const applyMonthZoom = (month: number, dir: 1 | -1, date: number) => {
    if (zoomFrameLock.current) return; // one step per frame
    const cur = expandedMonths.get(month) ?? 0;
    const next = Math.max(0, Math.min(2, cur + dir));
    if (next === cur) return; // already at the rail — nothing to do, no jump
    zoomFrameLock.current = true;
    requestAnimationFrame(() => {
      zoomFrameLock.current = false;
    });
    const el = scrollerRef.current;
    const beforeX = scaleX(date);
    flushSync(() =>
      setExpandedMonths((prev) => {
        const m = new Map(prev);
        if (next === 0) m.delete(month);
        else m.set(month, next as 1 | 2);
        return m;
      }),
    );
    if (el) el.scrollLeft += scaleX(date) - beforeX; // keep `date` under the pointer
    setZoomAnnounce(`${monthLabel(month)} — ${ZOOM_LEVEL_NAME[next]}`);
  };

  // Latest-closure refs so the once-attached native listeners always see
  // current state without re-binding on every render.
  const wheelZoomRef = useRef<(e: WheelEvent) => void>(() => {});
  wheelZoomRef.current = (e: WheelEvent) => {
    // Ctrl+wheel (Win/Linux zoom idiom) and trackpad pinch (emits ctrlKey) and
    // ⌘+wheel (Mac) — all mean "zoom this map". Scoped to the canvas, so the
    // browser's own page zoom still works everywhere else.
    if (!(e.ctrlKey || e.metaKey)) return;
    const el = scrollerRef.current;
    if (!el || !layout || panelOpen) return;
    const rect = el.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    // The team-label gutter is a sticky overlay pinned over the left LABEL_W
    // of the viewport at every scroll position — bail there so the browser
    // keeps normal behaviour, and measure the date from screen, not content.
    if (screenX < LABEL_W) return;
    e.preventDefault();
    const date = dateAtX(screenX + el.scrollLeft - LABEL_W);
    applyMonthZoom(Math.floor(date), e.deltaY < 0 ? 1 : -1, date);
  };

  const keyZoomRef = useRef<(e: KeyboardEvent) => void>(() => {});
  keyZoomRef.current = (e: KeyboardEvent) => {
    // Plain +/−/0 only — never the modified combos, so Ctrl/⌘ +/− stays the
    // browser's text-resize (WCAG 1.4.4).
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target as HTMLElement | null;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    const el = scrollerRef.current;
    if (!el || !layout || panelOpen) return;
    if (e.key === "0") {
      if (expandedMonths.size === 0) return;
      setExpandedMonths(new Map());
      setZoomAnnounce("Zoom reset — all months in month view");
      return;
    }
    const dir = e.key === "+" || e.key === "=" ? 1 : e.key === "-" || e.key === "_" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    // Zoom the month at the centre of the visible canvas.
    const date = dateAtX(el.scrollLeft + (el.clientWidth - LABEL_W) / 2);
    applyMonthZoom(Math.floor(date), dir, date);
  };

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => wheelZoomRef.current(e);
    const onKey = (e: KeyboardEvent) => keyZoomRef.current(e);
    // passive:false so preventDefault can suppress the browser's ctrl+wheel
    // page zoom while over the canvas.
    el.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    return () => {
      el.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div ref={scrollerRef} className="h-screen overflow-auto bg-surface font-sans text-grey-90">
      {/* Bypass block for the 100+ tab stops on the canvas. Kept in the DOM
          (so screen readers announce it) but translated off the top edge
          until focused. */}
      <a
        href="#comms-list"
        className="absolute left-2 top-2 z-50 -translate-y-16 rounded-md bg-header px-3 py-2 text-sm font-medium text-white transition-transform focus:translate-y-0"
      >
        Skip to communications list
      </a>
      {/* Announces zoom-level changes (gesture or keyboard) to assistive tech,
          matching the visual reflow sighted users see. */}
      <div className="sr-only" role="status" aria-live="polite">
        {zoomAnnounce}
      </div>
      {/* Sticky left so the title stays put during horizontal scroll, but
          scrolls away vertically like normal page content. */}
      <header className="sticky left-0 w-screen px-6 pt-6 pb-5" {...bgInert}>
        <h1 className="text-3xl font-bold text-rmit-blue">
          Current State Touch Points
        </h1>
        <div className="mt-2 flex items-center gap-2 text-xs text-grey-70">
          <span>Prospective student type</span>
          <span className="rounded-md bg-tint-blue px-2 py-0.5 font-semibold uppercase tracking-wide text-rmit-blue">
            DOM SL
          </span>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-grey-70">
          By creating and working from a holistic view of the future student
          experience, we aim to enable the business to consider the needs and goals
          of students at each step of the journey, as well as considering the journey
          as an end-to-end experience.
        </p>
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
              expandedMonths={effectiveExpanded}
              onToggleMonth={(m) =>
                setExpandedMonths((prev) => {
                  const next = new Map(prev);
                  const level = next.get(m);
                  if (!level)
                    next.set(m, 1); // collapsed → weeks
                  else if (level === 1)
                    next.set(m, 2); // weeks → days
                  else next.delete(m); // days → collapsed
                  return next;
                })
              }
              canResetZoom={expandedMonths.size > 0}
              onResetZoom={() => setExpandedMonths(new Map())}
              stageCounts={stageCounts}
              activeTypes={activeTypes}
              segments={segments}
              equity={equity}
              focusSet={focusSet}
              dimBackground={dimBackground}
              activeId={activeId}
              showLines={showLines}
              activeMomentId={activeMomentId}
              showStudentLayer={showStudentLayer}
              activeQuestion={activeQuestion}
              onHoverQuestion={setHoveredQuestion}
              onPinQuestion={(q) =>
                setPinnedQuestion((p) =>
                  p?.stage === q.stage && p?.question === q.question ? null : q,
                )
              }
              onJumpStage={jumpToStage}
              onOpenStage={(stage) => {
                // One right-hand panel at a time; ⓘ on the open stage closes it.
                setOpenCommId(null);
                setOpenCampaignId(null);
                setOpenStage((p) => (p === stage ? null : stage));
              }}
              openCampaigns={openCampaigns}
              onToggleCampaigns={(groupId) =>
                setOpenCampaigns((prev) => {
                  const next = new Set(prev);
                  if (next.has(groupId)) next.delete(groupId);
                  else next.add(groupId);
                  return next;
                })
              }
              onOpenCampaign={setOpenCampaignId}
              onHover={setHovered}
              onOpenDetail={(id) => {
                setOpenStage(null);
                setOpenCommId(id);
              }}
              onMeasure={handleMeasure}
              onClearFocus={() => {
                setPinnedMoment(null);
                setPinnedQuestion(null);
              }}
              onHoverMoment={setHoveredMoment}
              onPinMoment={(id) => setPinnedMoment((p) => (p === id ? null : id))}
              feedbackCount={(commId) => feedback[commId]?.length ?? 0}
              collapsedLanes={collapsedLanes}
              onToggleLane={(laneId) =>
                setCollapsedLanes((prev) => {
                  const next = new Set(prev);
                  if (next.has(laneId)) next.delete(laneId);
                  else next.add(laneId);
                  return next;
                })
              }
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

      {/* Overview scrubber — the whole 3-year map in 300px, bottom-left. */}
      {layout && <Minimap comms={layout.comms} scrollerRef={scrollerRef} />}

      {/* Filter summary — floats just above the control dock whenever a lens
          is engaged, so filtering always says what it did (and offers the way
          back). Doubles as the empty state when nothing matches. */}
      {layout && filterActive && (
        <div className="fixed bottom-[4.75rem] left-1/2 z-40 -translate-x-1/2" role="status">
          <div className="animate-pop-in flex items-center gap-2.5 rounded-full border border-grey-30 bg-card/90 py-1.5 pr-1.5 pl-3.5 text-xs shadow-xl backdrop-blur-md">
            {shownCount === 0 ? (
              <span className="font-medium text-danger">No comms match these filters</span>
            ) : (
              <span className="text-grey-80">
                Showing <span className="font-semibold text-grey-90">{shownCount}</span> of{" "}
                {layout.comms.length} comms
              </span>
            )}
            <button
              type="button"
              onClick={clearAllFilters}
              className={`rounded-full bg-grey-20 px-2.5 py-1 font-medium text-grey-90 hover:bg-grey-30 ${FOCUS_RING}`}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Sleek floating control dock — filters, trigger lines, legend, theme.
          Fixed bottom-centre so it stays reachable while scrolling and never
          clashes with the sticky header bands or the right-hand panels. */}
      <ControlDock
        activeTypes={activeTypes}
        onToggleType={toggleType}
        onResetTypes={() => setActiveTypes(new Set(ALL_TYPES))}
        showLines={showLines}
        onToggleLines={() => setShowLines((s) => !s)}
        showStudentLayer={showStudentLayer}
        onToggleStudentLayer={toggleStudentLayer}
        allLanesCollapsed={allLanesCollapsed}
        onToggleAllLanes={toggleAllLanes}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Persona dock — bottom-left, names the persona and opens the segment
          toggles as a popover. */}
      <PersonaDock
        axes={segmentAxes}
        selection={segments}
        counts={segmentCounts}
        equityCohorts={equityCohorts}
        equityCounts={equityCounts}
        equity={equity}
        onSelectEquity={(c) => setEquity((prev) => (prev === c ? null : c))}
        onSelect={(key, value) =>
          setSegments((prev) => {
            const next = { ...prev };
            if (value === null) {
              delete next[key]; // "All" — clear the axis
            } else {
              const cur = next[key] ?? [];
              const arr = cur.includes(value)
                ? cur.filter((v) => v !== value)
                : [...cur, value];
              if (arr.length) next[key] = arr;
              else delete next[key];
            }
            return next;
          })
        }
        onClearAll={() => setSegments({})}
      />

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

      {/* Deep-dive reference panel — non-modal so the canvas stays visible. */}
      {openStage && (
        <StudentStagePanel stageLabel={openStage} onClose={() => setOpenStage(null)} />
      )}
    </div>
  );
}
