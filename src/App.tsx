import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Eye, Mail } from "lucide-react";
import { ControlDock } from "./components/ControlDock";
import { PersonaDock } from "./components/PersonaDock";
import { SegmentToggles } from "./components/SegmentToggles";
import { Timeline } from "./components/Timeline";
import {
  availableSegments,
  matchesSegment,
  segmentCount,
  type SegmentSelection,
} from "./lib/segments";
import { connectedIds } from "./components/TriggerLayer";
import { CommDetailPanel } from "./components/CommDetailPanel";
import { StudentQuestionPanel, questionFeedbackId } from "./components/StudentQuestionPanel";
import { OffscreenAnswers } from "./components/OffscreenAnswers";
import { CampaignDetailPanel } from "./components/CampaignDetailPanel";
import { ScheduleDetailPanel } from "./components/ScheduleDetailPanel";
import { StudentStagePanel } from "./components/StudentStagePanel";
import type { QuestionRef } from "./components/StudentJourneyLane";
import { allCampaignChannels, campaignGroups } from "./data/comms";
import { Minimap } from "./components/Minimap";
import { Landing } from "./components/Landing";
import { PersonaIntroModal } from "./components/PersonaIntroModal";
import { HoverTip } from "./components/HoverTip";
import { linkedCommIds } from "./data/studentExperience";
import type { CommType, FeedbackEntry, Comm } from "./data/types";
import {
  addFeedbackEntry,
  deleteFeedbackEntry,
  loadFeedback,
  verifyAdminKey,
  type FeedbackStore,
} from "./lib/feedback";
import { FOCUS_RING } from "./lib/styles";
import { loadComms } from "./lib/loadComms";
import { loadCommEdits, saveCommEdit, type CommEdits, type CommPatch } from "./lib/commEdits";
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
import { COMM_COLORS, COMM_ICONS, COMM_LABELS } from "./components/icons";

const THEME_KEY = "comms-calendar-theme";

const ALL_TYPES: CommType[] = ["email", "sms", "webinar", "call", "event"];

// Spoken names for the three month-zoom levels (index = level).
const ZOOM_LEVEL_NAME = ["month view", "week view", "day view"] as const;

// Print/export mode (?print) — used for static captures of the map: hides the
// intro header and the floating UI, and renders the segment filters as a
// static legend strip below the canvas so nothing overlaps the content.
const PRINT_MODE = new URLSearchParams(window.location.search).has("print");
// ?dots — start with every lane collapsed to its marker strip (the Overview
// toggle's state), for capturing the compact all-dots view.
const DOTS_MODE = new URLSearchParams(window.location.search).has("dots");
// The overview / "show all lanes at once" toggle collapses every lane to its
// compact touchpoint strip so the whole map fits vertically.
const COLLAPSIBLE_LANES = ["recruitment", "marketing-events", "marketing", "admissions", "conversion", "vtac", "campaigns", "digital", "study"];
// Segment filters straight from the URL (?preference=%232-8&college=COBL&
// campus=city&eventState=registered,attended) so a filtered view can be
// captured/shared by link. Comma-separates multiple values on one axis.
const SEG_FROM_URL: SegmentSelection = (() => {
  const p = new URLSearchParams(window.location.search);
  const out: SegmentSelection = {};
  for (const key of ["preference", "college", "campus", "eventState"] as const) {
    const v = p.get(key);
    if (v) out[key] = v.split(",");
  }
  // Default view (no URL filters): 2nd–8th preference, all colleges, City
  // campus, Registered + Attended event stages. Clearable in the UI as usual.
  if (Object.keys(out).length === 0) {
    return { preference: ["#2-8"], campus: ["city"], eventState: ["registered", "attended"] };
  }
  return out;
})();

// The landing/map split lives in the URL hash so the browser's Back button
// walks back through the flow (map -> landing) instead of leaving the site,
// and #/map is shareable. Print mode and deep-linked filter URLs skip the door.
const mapInHash = () => window.location.hash === "#/map";

export default function App() {
  const [entered, setEntered] = useState(
    () => PRINT_MODE || window.location.search.length > 0 || mapInHash(),
  );
  const enterMap = useCallback(() => {
    window.location.hash = "/map"; // pushes a history entry
    setEntered(true);
  }, []);
  const goHome = useCallback(() => {
    window.location.hash = "/";
    setEntered(false);
  }, []);
  // Presentation mode: hide the floating chrome (docks, minimap, filter
  // pill), leaving one small restore button.
  const [uiHidden, setUiHidden] = useState(false);
  // Back/forward: follow the hash.
  useEffect(() => {
    const onHash = () =>
      setEntered(PRINT_MODE || window.location.search.length > 0 || mapInHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  // First visit to the map in this browser: introduce the persona. Print
  // and deep-linked exports skip it.
  const [introOpen, setIntroOpen] = useState(
    () => !PRINT_MODE && localStorage.getItem("cc-persona-intro-domsl") !== "1",
  );
  const closeIntro = useCallback(() => {
    localStorage.setItem("cc-persona-intro-domsl", "1");
    setIntroOpen(false);
  }, []);
  const [rawComms, setRawComms] = useState<Comm[] | null>(null);
  // Detail-panel edits, keyed by comm id — merged onto the loaded comms below.
  const [commEdits, setCommEdits] = useState<CommEdits>({});
  // The comms the whole app renders: base data with any overrides applied.
  const comms = useMemo<Comm[] | null>(() => {
    if (!rawComms) return null;
    if (Object.keys(commEdits).length === 0) return rawComms;
    return rawComms.map((c) => (commEdits[c.id] ? { ...c, ...commEdits[c.id] } : c));
  }, [rawComms, commEdits]);
  const editComm = useCallback((commId: string, patch: CommPatch) => {
    setCommEdits((prev) => {
      const merged = { ...prev[commId], ...patch };
      void saveCommEdit(commId, merged).catch(() => {});
      return { ...prev, [commId]: merged };
    });
  }, []);
  const [importIssues, setImportIssues] = useState<{ row: number; message: string }[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTypes, setActiveTypes] = useState<Set<CommType>>(new Set(ALL_TYPES));
  const [hovered, setHovered] = useState<string | null>(null);
  const [showLines, setShowLines] = useState(true);
  const [hoveredMoment, setHoveredMoment] = useState<string | null>(null);
  const [pinnedMoment, setPinnedMoment] = useState<string | null>(null);
  // Month zoom — each month independently cycles collapsed → week → day →
  // collapsed. Multiple can be open at once (month index → level).
  // Level 0 = the user explicitly collapsed the month — it pins shut a month
  // the filter auto-expand would otherwise force open (see effectiveExpanded).
  const [expandedMonths, setExpandedMonths] = useState<Map<number, 0 | 1 | 2>>(new Map());
  // Student journey — question focus comes straight from the lane (hover is
  // transient, pin sticks) and drives the cross-highlight: the linked comms
  // light up, everything else dims. openStage is the optional deep-dive
  // panel, opened from the ⓘ per stage.
  const [openStage, setOpenStage] = useState<string | null>(null);
  const [hoveredStage, setHoveredStage] = useState<string | null>(null);
  const [hoveredQuestion, setHoveredQuestion] = useState<QuestionRef | null>(null);
  const [pinnedQuestion, setPinnedQuestion] = useState<QuestionRef | null>(null);
  // Question whose detail panel is open (click a bubble).
  const [panelQuestion, setPanelQuestion] = useState<QuestionRef | null>(null);
  // Horizontal viewport of the scroller, so we can point to answering
  // touchpoints that are scrolled off-screen.
  const [viewport, setViewport] = useState({ left: 0, width: 0 });
  // Debounced clear on question hover-out, so the cursor can travel from a
  // bubble to its off-screen pointer without the pointer vanishing mid-move.
  const hoverClearTimer = useRef<number | undefined>(undefined);
  const hoverQuestion = useCallback((q: QuestionRef | null) => {
    if (q) {
      window.clearTimeout(hoverClearTimer.current);
      setHoveredQuestion(q);
    } else {
      hoverClearTimer.current = window.setTimeout(() => setHoveredQuestion(null), 250);
    }
  }, []);
  // The student-journey lane is off by default — the comms map stays clean
  // until you opt into the student view from the control dock.
  const [showStudentLayer, setShowStudentLayer] = useState(false);
  // Student swimlane collapse state — like the other lanes: expanded (full
  // cards) ⇄ collapsed (a strip of speech-bubble icons). Hidden = layer off.
  const [studentCollapsed, setStudentCollapsed] = useState(false);
  // Segment lens — opened from the persona dock. Focuses the map on comms
  // tailored to a chosen segment (college, campus, preference, event stage).
  const [segments, setSegments] = useState<SegmentSelection>(SEG_FROM_URL);
  // Equity cohort focus (e.g. SNAP) — exclusive: dims everything except comms
  // tailored to it, and jumps the map to the match.
  const [equity, setEquity] = useState<string | null>(null);
  // Media-schedule panel — the always-on bar lists its channels here.
  const [openScheduleId, setOpenScheduleId] = useState<string | null>(null);
  // Campaign-lane tree expansion — "open-day" reveals its two schedules,
  // a schedule id reveals its placements. Feeds layoutTimeline (lane height).
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  // Collapsed swimlanes (by lane id) — a collapsed lane shrinks to its label
  // strip and its content is hidden, so it feeds into layoutTimeline too.
  const [collapsedLanes, setCollapsedLanes] = useState<Set<string>>(
    // ?dots collapses the outbound lanes to marker strips but keeps the
    // inbound engagement lanes expanded — collapsed, their graphs vanish.
    () =>
      DOTS_MODE
        ? new Set(COLLAPSIBLE_LANES.filter((id) => id !== "digital" && id !== "study"))
        : // Sparse lanes (1 and 4 comms) start collapsed — their marker strips
          // carry the cadence; a click expands them. Saves ~240px of mostly
          // empty card area on first load.
          new Set(["admissions", "conversion", "marketing-events"]),
  );
  // Fully-hidden lanes (a subset of collapsed): just the label strip, no
  // marker stack. The lane toggle cycles expanded -> collapsed -> hidden.
  const [hiddenLanes, setHiddenLanes] = useState<Set<string>>(new Set());
  const allLanesCollapsed = COLLAPSIBLE_LANES.every((id) => collapsedLanes.has(id));
  const toggleAllLanes = () => {
    if (allLanesCollapsed) {
      setCollapsedLanes(new Set());
      setHiddenLanes(new Set());
    } else {
      setCollapsedLanes(new Set(COLLAPSIBLE_LANES));
    }
  };
  const cycleLane = (laneId: string) => {
    const isCollapsed = collapsedLanes.has(laneId);
    const isHidden = hiddenLanes.has(laneId);
    if (!isCollapsed) {
      setCollapsedLanes((prev) => new Set(prev).add(laneId)); // expanded -> collapsed
    } else if (!isHidden) {
      setHiddenLanes((prev) => new Set(prev).add(laneId)); // collapsed -> hidden
    } else {
      setCollapsedLanes((prev) => {
        const n = new Set(prev);
        n.delete(laneId);
        return n;
      });
      setHiddenLanes((prev) => {
        const n = new Set(prev);
        n.delete(laneId);
        return n;
      });
    }
  };
  const [feedback, setFeedback] = useState<FeedbackStore>({});
  // Admin unlock — a second gate (above the site password) for deleting
  // comments. The key is held for the browser session once verified.
  const [adminKey, setAdminKey] = useState<string | null>(
    () => sessionStorage.getItem("cc-admin-key"),
  );
  const isAdmin = adminKey !== null;
  const toggleAdmin = useCallback(async () => {
    if (adminKey !== null) {
      sessionStorage.removeItem("cc-admin-key");
      setAdminKey(null);
      return;
    }
    const key = window.prompt("Enter the admin key to manage comments:");
    if (!key) return;
    const ok = await verifyAdminKey(key.trim());
    if (ok) {
      sessionStorage.setItem("cc-admin-key", key.trim());
      setAdminKey(key.trim());
    } else {
      window.alert("That admin key was not accepted.");
    }
  }, [adminKey]);
  const removeFeedback = useCallback(
    async (commId: string, entryId: string) => {
      if (adminKey === null) return;
      await deleteFeedbackEntry(commId, entryId, adminKey);
      setFeedback((prev) => ({
        ...prev,
        [commId]: (prev[commId] ?? []).filter((e) => e.id !== entryId),
      }));
    },
    [adminKey],
  );
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
  // Track the scroller's horizontal viewport (rAF-throttled) so we can point
  // to answering touchpoints that are off-screen.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setViewport({ left: el.scrollLeft, width: el.clientWidth }));
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      cancelAnimationFrame(raf);
    };
  }, [entered]);
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
    loadCommEdits()
      .then(setCommEdits)
      .catch(() => setCommEdits({}));
  }, []);

  // The timeline lays out in two passes. Pass 1 (baseLayout) uses only the
  // months the user manually expanded; from it we can see which comms got
  // folded into "+N more" chips. Pass 2 (layout, below) additionally
  // auto-expands any month that hides a comm still LIT under the active filter,
  // so a match is never trapped inside a folded chip. The RENDERED layout is
  // Whether a comm is hidden by the persistent type/segment/equity lenses
  // (independent of the transient hover/moment focus).
  const isFilteredOut = useCallback(
    (c: Comm) =>
      !activeTypes.has(c.type) ||
      !matchesSegment(c, segments) ||
      (equity !== null && c.equity !== equity),
    [activeTypes, segments, equity],
  );
  // Comm ids hidden by the persistent lenses — excluded from card packing.
  const filteredIds = useMemo(
    () => new Set((comms ?? []).filter(isFilteredOut).map((c) => c.id)),
    [comms, isFilteredOut],
  );
  // pass 2 (and, being computed last, it owns the module-level scale state).
  const baseLayout = useMemo(
    () =>
      comms
        ? layoutTimeline(
            comms,
            new Map([...expandedMonths].filter(([, l]) => l > 0) as [number, 1 | 2][]),
            cardHeights,
            expandedCampaigns,
            collapsedLanes,
            showStudentLayer,
            filteredIds,
            hiddenLanes,
            showStudentLayer && studentCollapsed,
          )
        : null,
    [comms, expandedMonths, cardHeights, expandedCampaigns, collapsedLanes, showStudentLayer, filteredIds, hiddenLanes, studentCollapsed],
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

  // Of the active question's answering touchpoints, how many are scrolled off
  // each edge — so a pointer can show which way they are (else the spotlight
  // just dims to nothing when they're all out of view).
  const offAnswers = useMemo(() => {
    if (!activeQuestion || !questionCommIds?.size || !baseLayout || panelQuestion) return null;
    const viewLeft = viewport.left;
    const viewRight = viewport.left + viewport.width - LABEL_W;
    let left = 0,
      right = 0,
      leftT = Infinity,
      rightT = -Infinity;
    for (const c of baseLayout.comms) {
      if (!questionCommIds.has(c.id)) continue;
      const x = commPos(c).x;
      if (x < viewLeft) {
        left++;
        leftT = Math.min(leftT, x);
      } else if (x > viewRight) {
        right++;
        rightT = Math.max(rightT, x);
      }
    }
    return left > 0 || right > 0 ? { left, right, leftT, rightT } : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeQuestion, questionCommIds, baseLayout, panelQuestion, viewport]);
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

  const filterActive =
    activeTypes.size < ALL_TYPES.length || segmentCount(segments) > 0 || equity !== null;
  // Any lens that dims part of the map — the always-on media campaigns and the
  // "+N more" chips recede into the background whenever one is engaged, so they
  // don't stay bright while the comms around them fade.
  // Campaign bars aren't segmentable — they go to everyone — so the segment
  // lenses don't dim them (matching the "goes to everyone stays lit" rule).
  // Only a focus lens (question / moment / trigger highlight) pushes them back.
  const dimBackground = focusSet !== null;
  // "+N more" chips DO recede under the persistent filters — a chip may hold
  // only filtered-out comms, so it dims (and stops taking clicks) with them.
  const dimChips = filterActive || focusSet !== null;

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

  const effectiveExpanded = useMemo<ExpandedMonths>(() => {
    const m: ExpandedMonths = new Map();
    for (const [mo, lvl] of expandedMonths) if (lvl > 0) m.set(mo, lvl as 1 | 2);
    // auto-expand only months the user hasn't touched — an explicit 0 wins
    if (autoExpandMonths)
      for (const mo of autoExpandMonths) if (!expandedMonths.has(mo)) m.set(mo, 2);
    return m;
  }, [expandedMonths, autoExpandMonths]);

  // Set one month's zoom level directly (0 collapses; 0 on an auto-expanded
  // month is stored so the pin persists, otherwise the entry is dropped).
  const setMonthLevel = useCallback(
    (month: number, level: 0 | 1 | 2) => {
      setExpandedMonths((prev) => {
        // Collapse is ALWAYS stored as an explicit 0 (a pin). Deleting the
        // entry instead raced the filter auto-expand: collapsing folds comms
        // into "+N more" chips, which re-qualifies the month for auto-expand,
        // which reopened it — making day view take two clicks to close.
        const next = new Map(prev);
        next.set(month, level);
        return next;
      });
    },
    [autoExpandMonths],
  );

  const layout = useMemo(
    () =>
      comms
        ? layoutTimeline(
            comms,
            effectiveExpanded,
            cardHeights,
            expandedCampaigns,
            collapsedLanes,
            showStudentLayer,
            filteredIds,
            hiddenLanes,
            showStudentLayer && studentCollapsed,
          )
        : null,
    [comms, effectiveExpanded, cardHeights, expandedCampaigns, collapsedLanes, showStudentLayer, filteredIds, hiddenLanes, studentCollapsed],
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
    () => (comms ? availableSegments(comms) : []),
    [comms],
  );
  // Names the engaged lenses so "Showing 84 of 117" always says WHY — an
  // unexplained ghosted comm is indistinguishable from a missing one.
  const activeFilterLabel = useMemo(() => {
    const parts: string[] = [];
    for (const { axis } of segmentAxes) {
      const vals = segments[axis.key];
      if (vals?.length) parts.push(vals.map((v) => axis.labels[v] ?? v).join("+"));
    }
    if (equity) parts.push(equity);
    if (activeTypes.size < ALL_TYPES.length)
      parts.push([...activeTypes].map((t) => COMM_LABELS[t]).join("+"));
    return parts.join(" · ");
  }, [segments, equity, activeTypes, segmentAxes]);
  // Equity cohorts present in the data (e.g. SNAP).
  const equityCohorts = useMemo(
    () =>
      comms
        ? [...new Set(comms.map((c) => c.equity).filter(Boolean))].sort()
        : [],
    [comms],
  ) as string[];

  // Comms explicitly tagged with each segment value / equity cohort — shown as
  // counts on the toggle chips (a mini-report on where tailoring effort goes).
  const segmentCounts = useMemo(() => {
    const m: Record<string, Record<string, number>> = {};
    if (!comms) return m;
    for (const { axis } of segmentAxes) m[axis.key] = {};
    for (const c of comms) {
      for (const { axis } of segmentAxes) {
        const v = c[axis.key];
        if (v) m[axis.key][v] = (m[axis.key][v] ?? 0) + 1;
      }
    }
    return m;
  }, [comms, segmentAxes]);
  const equityCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of comms ?? []) if (c.equity) m[c.equity] = (m[c.equity] ?? 0) + 1;
    return m;
  }, [comms]);

  // Stage names in the header band double as jump links.
  const jumpToStage = (from: number) =>
    scrollerRef.current?.scrollTo({ left: Math.max(0, scaleX(from) - 40), behavior: "smooth" });

  // Comms per journey stage — the coverage number on each stage label (this is
  // where "most comms sit in Consider" becomes visible on the map itself).
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

  // Rejects on failure so the composer can keep the note on screen and say
  // why — a note that never reached the store must never look like it did.
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
  const bgInert = { inert: openComm || openCampaign || panelQuestion ? true : undefined };

  // ── Semantic zoom by gesture / keyboard ──────────────────────────────────
  // Both paths drive the SAME month-level model as clicking a month header
  // (collapsed → weeks → days), so a zoom expands the "+N more" chips in the
  // month it targets while the toolbars, minimap and text all stay put.
  const panelOpen = Boolean(openComm || openCampaign || openStage || panelQuestion);

  // Step one month's zoom by `dir` (+1 in / −1 out), keeping `date` fixed on
  // screen. flushSync commits the level change and re-runs layout SYNCHRONOUSLY
  // (so scaleX reflects the new widths immediately); we then shift scrollLeft by
  // exactly how far `date` moved — one atomic reflow, no follow-up-frame jump.
  const applyMonthZoom = (month: number, dir: 1 | -1, date: number) => {
    if (zoomFrameLock.current) return; // one step per frame
    const cur = effectiveExpanded.get(month) ?? 0;
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
        // Explicit 0 always (see setMonthLevel) — avoids the auto-expand race.
        const m = new Map(prev);
        m.set(month, next as 0 | 1 | 2);
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
      if (effectiveExpanded.size === 0) return;
      setExpandedMonths(
        new Map(autoExpandMonths ? [...autoExpandMonths].map((m) => [m, 0 as const]) : []),
      );
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

  if (!entered) return <Landing onEnter={enterMap} theme={theme} onToggleTheme={toggleTheme} />;

  return (
    <div
      ref={scrollerRef}
      // overscroll-x-contain: reaching the timeline's left edge must not hand
      // the trackpad swipe to the browser's back-navigation gesture.
      className="h-screen overflow-auto overscroll-x-contain bg-surface font-sans text-grey-90"
    >
      {/* Bypass block for the 100+ tab stops on the canvas. Kept in the DOM
          (so screen readers announce it) but translated off the top edge
          until focused. */}
      <a
        href="#comms-list"
        className="absolute left-2 top-2 z-50 -translate-y-16 rounded-md bg-header px-3 py-2 text-sm font-medium text-white transition-transform focus:translate-y-0"
      >
        Skip to touchpoints list
      </a>
      {/* Announces zoom-level changes (gesture or keyboard) to assistive tech,
          matching the visual reflow sighted users see. */}
      <div className="sr-only" role="status" aria-live="polite">
        {zoomAnnounce}
      </div>
      {/* Sticky left so the title stays put during horizontal scroll, but
          scrolls away vertically like normal page content. */}
      {/* Hero moved to the landing splash. Only the data-quality banner
          remains at the top, and only when a row failed to import. */}
      {!PRINT_MODE && importIssues.length > 0 && (
        <div className="px-6 pt-4" {...bgInert}>
          <div
            role="status"
            className="max-w-3xl rounded-md border border-amber bg-tint-amber px-3 py-2 text-sm text-grey-90"
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
        </div>
      )}

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
              onSetMonthLevel={setMonthLevel}
              canResetZoom={effectiveExpanded.size > 0}
              onResetZoom={() =>
                setExpandedMonths(
        new Map(autoExpandMonths ? [...autoExpandMonths].map((m) => [m, 0 as const]) : []),
      )
              }
              activeTypes={activeTypes}
              segments={segments}
              equity={equity}
              focusSet={focusSet}
              dimBackground={dimBackground}
              dimChips={dimChips}
              activeId={activeId}
              showLines={showLines}
              activeMomentId={activeMomentId}
              showStudentLayer={showStudentLayer}
              studentCollapsed={studentCollapsed}
              onToggleStudentCollapse={() => setStudentCollapsed((c) => !c)}
              onHideStudent={() => setShowStudentLayer(false)}
              activeQuestion={activeQuestion}
              onHoverQuestion={hoverQuestion}
              onPinQuestion={(q) =>
                setPinnedQuestion((p) =>
                  p?.stage === q.stage && p?.question === q.question ? null : q,
                )
              }
              onOpenQuestion={setPanelQuestion}
              onJumpStage={jumpToStage}
              onOpenStage={(stage) => {
                // One right-hand panel at a time; ⓘ on the open stage closes it.
                setOpenCommId(null);
                setOpenCampaignId(null);
                setOpenScheduleId(null);
                setOpenStage((p) => (p === stage ? null : stage));
              }}
              hoveredStage={hoveredStage}
              onHoverStage={setHoveredStage}
              expandedCampaigns={expandedCampaigns}
              onToggleCampaign={(id) =>
                setExpandedCampaigns((prev) => {
                  const next = new Set(prev);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                })
              }
              onOpenCampaign={(id) => {
                setOpenScheduleId(null);
                setOpenCampaignId(id);
              }}
              onOpenSchedule={(groupId) => {
                setOpenCommId(null);
                setOpenCampaignId(null);
                setOpenStage(null);
                setOpenScheduleId((p) => (p === groupId ? null : groupId));
              }}
              onHover={setHovered}
              onOpenDetail={(id) => {
                setOpenStage(null);
                setOpenScheduleId(null);
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
              hiddenLanes={hiddenLanes}
              onToggleLane={cycleLane}
            />
            {/* Text alternative to the visual timeline canvas, which conveys
                meaning through colour + position (WCAG 1.3.1). Hidden visually,
                read in DOM order by assistive tech. Reflects the active type
                filter so it matches what's shown on the canvas. */}
            <section id="comms-list" className="sr-only" aria-label="Touch points list">
              <h2>Touch points{activeTypes.size < ALL_TYPES.length ? " (filtered)" : ""}</h2>
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
            {/* Print mode — the filter axes as a static legend strip below the
                canvas (never overlapping it), so exports show what the map can
                be cut by: preference, college, campus, event stage. */}
            {PRINT_MODE && (
              <div className="sticky left-0 w-screen border-t border-grey-30 px-6 py-4">
                {/* Touchpoint key — the marker dots as they appear on the map,
                    one per channel type, plus the external-sender grey. */}
                <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                  <span className="text-xs font-semibold text-grey-90">Touchpoint key</span>
                  {ALL_TYPES.map((t) => {
                    const Icon = COMM_ICONS[t];
                    return (
                      <span key={t} className="flex items-center gap-1.5 text-xs text-grey-80">
                        <span
                          className={`flex h-[22px] w-[22px] items-center justify-center rounded-full text-on-accent ring-2 ring-card ${COMM_COLORS[t].accent}`}
                        >
                          <Icon size={12} strokeWidth={2.25} aria-hidden />
                        </span>
                        {COMM_LABELS[t]}
                      </span>
                    );
                  })}
                  <span className="flex items-center gap-1.5 text-xs text-grey-80">
                    <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-grey-70 text-on-accent ring-2 ring-card">
                      <Mail size={12} strokeWidth={2.25} aria-hidden />
                    </span>
                    External sender (VTAC) — any channel
                  </span>
                </div>
                <div className="mb-2 flex items-center gap-2 text-xs text-grey-70">
                  <span className="font-semibold text-grey-90">
                    Filters available on the interactive map
                  </span>
                  <span aria-hidden>·</span>
                  <span>
                    Persona: <span className="font-semibold">DOM SL</span> — domestic school
                    leaver
                  </span>
                </div>
                <SegmentToggles
                  axes={segmentAxes}
                  selection={segments}
                  counts={segmentCounts}
                  onSelect={() => {}}
                  onClearAll={() => setSegments({})}
                />
              </div>
            )}
          </>
        )}
      </main>

      {/* Overview scrubber — the whole 3-year map in 300px, bottom-left. */}
      {layout && !PRINT_MODE && !uiHidden && <Minimap comms={layout.comms} scrollerRef={scrollerRef} />}

      {/* Filter summary — floats just above the control dock whenever a lens
          is engaged, so filtering always says what it did (and offers the way
          back). Doubles as the empty state when nothing matches. */}
      {layout && filterActive && !PRINT_MODE && !uiHidden && (
        <div className="fixed bottom-[4.75rem] left-1/2 z-40 -translate-x-1/2" role="status">
          <div className="animate-pop-in flex items-center gap-2.5 rounded-full border border-grey-30 bg-card/90 py-1.5 pr-1.5 pl-3.5 text-xs shadow-xl backdrop-blur-md">
            {shownCount === 0 ? (
              <span className="font-medium text-danger">No comms match these filters</span>
            ) : (
              <span className="text-grey-80">
                Showing <span className="font-semibold text-grey-90">{shownCount}</span> of{" "}
                {layout.comms.length} touchpoints
                {activeFilterLabel && (
                  <span className="text-grey-70"> — {activeFilterLabel}</span>
                )}
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
      {introOpen && <PersonaIntroModal onClose={closeIntro} />}

      {/* Presentation mode's single way back. */}
      {!PRINT_MODE && uiHidden && (
        <button
          type="button"
          onClick={() => setUiHidden(false)}
          aria-label="Show controls"
          className={`group fixed bottom-5 right-5 z-40 flex h-9 w-9 items-center justify-center rounded-full border border-grey-30 bg-card/70 text-grey-70 shadow-xl backdrop-blur-md hover:bg-grey-20 ${FOCUS_RING}`}
        >
          <Eye size={15} strokeWidth={1.75} aria-hidden />
          <HoverTip label="Show controls" />
        </button>
      )}

      {!PRINT_MODE && !uiHidden && (
      <ControlDock
        onHideUi={() => setUiHidden(true)}
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
        isAdmin={isAdmin}
        onToggleAdmin={toggleAdmin}
        onGoHome={goHome}
      />
      )}

      {/* Persona dock — bottom-left, names the persona and opens the segment
          toggles as a popover. */}
      {!PRINT_MODE && !uiHidden && (
      <PersonaDock
        onAboutPersona={() => setIntroOpen(true)}
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
      )}

      {openComm && layout && (
        <CommDetailPanel
          comm={openComm}
          allComms={layout.comms}
          entries={feedback[openComm.id] ?? []}
          onClose={() => setOpenCommId(null)}
          onAdd={(entry) => addFeedback(openComm.id, entry)}
          onDelete={isAdmin ? (entryId) => removeFeedback(openComm.id, entryId) : undefined}
          onEdit={(patch) => editComm(openComm.id, patch)}
        />
      )}

      {panelQuestion && layout && (
        <StudentQuestionPanel
          question={panelQuestion}
          allComms={layout.comms}
          entries={feedback[questionFeedbackId(panelQuestion)] ?? []}
          onClose={() => setPanelQuestion(null)}
          onAdd={(entry) => addFeedback(questionFeedbackId(panelQuestion), entry)}
          onDelete={
            isAdmin
              ? (entryId) => removeFeedback(questionFeedbackId(panelQuestion), entryId)
              : undefined
          }
          onOpenComm={(id) => {
            setPanelQuestion(null);
            setOpenCommId(id);
          }}
        />
      )}

      {offAnswers && !uiHidden && !PRINT_MODE && (
        <OffscreenAnswers
          left={offAnswers.left}
          right={offAnswers.right}
          onKeep={() => activeQuestion && hoverQuestion(activeQuestion)}
          onRelease={() => hoverQuestion(null)}
          onGoLeft={() =>
            scrollerRef.current?.scrollTo({
              left: Math.max(0, offAnswers.leftT - viewport.width / 2 + LABEL_W),
              behavior: "smooth",
            })
          }
          onGoRight={() =>
            scrollerRef.current?.scrollTo({
              left: Math.max(0, offAnswers.rightT - viewport.width / 2 + LABEL_W),
              behavior: "smooth",
            })
          }
        />
      )}

      {openScheduleId && !openCampaign && (
        <ScheduleDetailPanel
          group={campaignGroups.find((g) => g.id === openScheduleId)!}
          onOpenChannel={(id) => {
            setOpenScheduleId(null);
            setOpenCampaignId(id);
          }}
          onClose={() => setOpenScheduleId(null)}
        />
      )}

      {openCampaign && (
        <CampaignDetailPanel
          campaign={openCampaign}
          entries={feedback[openCampaign.id] ?? []}
          onClose={() => setOpenCampaignId(null)}
          onAdd={(entry) => addFeedback(openCampaign.id, entry)}
          onDelete={isAdmin ? (entryId) => removeFeedback(openCampaign.id, entryId) : undefined}
        />
      )}

      {/* Deep-dive reference panel — non-modal so the canvas stays visible. */}
      {openStage && (
        <StudentStagePanel stageLabel={openStage} onClose={() => setOpenStage(null)} />
      )}
    </div>
  );
}
