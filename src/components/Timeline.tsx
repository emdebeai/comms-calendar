import { Fragment, type ReactNode } from "react";
import { Ban, ChevronDown, ChevronRight, Eye, EyeOff, Info } from "lucide-react";
import { inbound as defaultInbound } from "../data/comms";
import { EMBARGOES, MOMENTS } from "../data/journey";
import type { Comm, CommType, InboundLaneData, Team } from "../data/types";
import { matchesSegment, type SegmentSelection } from "../lib/segments";
import {
  CHIP_H,
  HEADER_H,
  STUDENT_LANE_H,
  LABEL_W,
  LANES,
  MOMENT_H,
  MONTHS,
  MONTH_H,
  STAGE_H,
  TOTAL_H,
  TOTAL_W,
  YEAR_H,
  chipY,
  commHeight,
  commPos,
  dotY,
  markerPos,
  monthLabel,
  scaleX,
  type ExpandedMonths,
  type OverflowChip,
  laneById,
} from "../lib/scale";
import { markerAccent } from "../lib/designConfig";
import { EYEBROW, FOCUS_RING } from "../lib/styles";
import { COMM_COLORS, COMM_ICONS, COMM_LABELS } from "./icons";
import { CampaignGantt } from "./CampaignGantt";
import { CommCard } from "./CommCard";
import { DateDot, Stem } from "./DateMarks";
import { MomentsBand, MonthBand, StageBand, YearBand } from "./HeaderBands";
import { InboundLane } from "./InboundLane";
import { StudentJourneyLane, type QuestionRef } from "./StudentJourneyLane";
import { TriggerLayer } from "./TriggerLayer";

interface Props {
  comms: Comm[];
  hiddenIds: Set<string>;
  chips: OverflowChip[];
  expandedMonths: ExpandedMonths;
  onSetMonthLevel: (monthIndex: number, level: 0 | 1 | 2) => void;
  /** true when the user has months zoomed — shows the reset-zoom chip */
  canResetZoom: boolean;
  onResetZoom: () => void;
  activeTypes: Set<CommType>;
  /** segment lens — comms not matching a selected segment dim out */
  segments: SegmentSelection;
  /** equity cohort focus — when set, EVERYTHING except comms tailored to it
   *  dims (exclusive, unlike the segment lens which keeps generic sends lit) */
  equity: string | null;
  /** ids in focus (question/moment/trigger); null = no focus. Computed in App
   *  so the auto-expand pass and the dimming share one source of truth. */
  focusSet: Set<string> | null;
  /** true when any lens (filter or focus) is dimming the map — the always-on
   *  media campaigns and "+N more" chips recede with it. */
  dimBackground: boolean;
  dimChips: boolean;
  activeId: string | null;
  showLines: boolean;
  activeMomentId: string | null;
  /** whether the student-journey lane is shown (dock toggle, off by default) */
  showStudentLayer: boolean;
  /** student swimlane collapse state + its lane controls */
  studentCollapsed: boolean;
  onToggleStudentCollapse: () => void;
  /** student swimlane — question bubbles + connector arrows to touchpoints */
  activeQuestion: QuestionRef | null;
  onHoverQuestion: (q: QuestionRef | null) => void;
  onPinQuestion: (q: QuestionRef) => void;
  onOpenQuestion: (q: QuestionRef) => void;
  onOpenStage: (stageLabel: string) => void;
  /** stage hovered in the bar — lights up its student questions */
  hoveredStage: string | null;
  onHoverStage: (stageLabel: string | null) => void;
  /** click a stage name in the header band → scroll the map there */
  onJumpStage: (from: number) => void;
  /** ids of the media schedules currently expanded to their placements */
  onOpenSchedule: (groupId: string) => void;
  expandedCampaigns: Set<string>;
  onToggleCampaign: (id: string) => void;
  onOpenCampaign: (id: string) => void;
  /** click on a channel bar opens its detail panel */
  onHover: (id: string | null) => void;
  /** click on a comm opens the detail panel (attributes + comments) */
  onOpenDetail: (id: string) => void;
  onMeasure: (id: string, height: number) => void;
  onClearFocus: () => void;
  onHoverMoment: (id: string | null) => void;
  onPinMoment: (id: string) => void;
  feedbackCount: (commId: string) => number;
  /** collapsed swimlanes — their comms/campaigns/curves are hidden and the
   *  lane shrinks to its label strip */
  collapsedLanes: Set<string>;
  hiddenLanes: Set<string>;
  onToggleLane: (laneId: string) => void;
  /** hide a lane entirely (its own eye button; label click restores) */
  onHideLane: (laneId: string) => void;
  /** campaign mode — the campaign's own inbound series instead of the map's */
  inboundData?: InboundLaneData[];
  /** campaign mode — an extra line on each card */
  cardExtra?: (comm: Comm) => ReactNode;
  /** campaign mode — ids the New-for-2026 lens hides */
  extraFilteredIds?: Set<string>;
  /** campaign mode — the campaign's window (washed) and its stage gate */
  campaignWindow?: { from: number; to: number; gate: number };
  /** campaign mode — a real control under a card (a sibling of the card's
   *  button, not inside it), e.g. the variants toggle */
  cardFooter?: (comm: Comm) => ReactNode;
  /** campaign mode — a line under a lane's label that opens a panel, for
   *  the things in that lane that aren't events (pages, channels) */
  laneActions?: { laneId: string; label: string; detail?: string; /** px below the lane top (default 46) */ offset?: number; onClick: () => void }[];
}

export function Timeline({
  comms,
  hiddenIds,
  chips,
  expandedMonths,
  onSetMonthLevel,
  canResetZoom,
  onResetZoom,
  activeTypes,
  segments,
  equity,
  focusSet,
  dimBackground,
  dimChips,
  activeId,
  showLines,
  activeMomentId,
  showStudentLayer,
  studentCollapsed,
  onToggleStudentCollapse,
  activeQuestion,
  onHoverQuestion,
  onPinQuestion,
  onOpenQuestion,
  onOpenStage,
  hoveredStage,
  onHoverStage,
  onJumpStage,
  onOpenSchedule,
  expandedCampaigns,
  onToggleCampaign,
  onOpenCampaign,
  onHover,
  onOpenDetail,
  onMeasure,
  onClearFocus,
  onHoverMoment,
  onPinMoment,
  feedbackCount,
  collapsedLanes,
  hiddenLanes,
  onToggleLane,
  onHideLane,
  inboundData,
  cardExtra,
  extraFilteredIds,
  laneActions,
  campaignWindow,
  cardFooter,
}: Props) {
  const inbound = inboundData ?? defaultInbound;
  // focusSet (question > moment > trigger precedence) is computed in App and
  // passed in, so the auto-expand pass and the per-comm dimming agree on which
  // comms are lit.

  // Look-alike stacks: an audience-split send appears as several cards with
  // the SAME subject line ("COP Explained" ×3 = Year 12 / SNAP / DDINTON
  // variants), which reads as inexplicable duplication. When a title repeats
  // within a team, each copy carries its audience so the split is legible;
  // unique titles stay clean.
  const titleCounts = new Map<string, number>();
  for (const c of comms) {
    const k = `${c.team}|${c.title}`;
    titleCounts.set(k, (titleCounts.get(k) ?? 0) + 1);
  }
  const variantFor = (c: Comm): string | undefined => {
    if ((titleCounts.get(`${c.team}|${c.title}`) ?? 0) < 2) return undefined;
    const fromAxes = [c.campus, c.eventState, c.preference, c.college]
      .filter(Boolean)
      .join(" · ");
    const v = c.audience?.replace(/\s+/g, " ") || fromAxes || undefined;
    // A bare year label ("Year 10", "Yr 10", "Y10") just repeats the
    // school-year band the card sits in — drop it; keep richer audiences
    // (SNAP, DDINTON, COBL #2-8, campus splits, …).
    if (v && /^y(?:ea)?r?\s*1[0-2]$/i.test(v.trim())) return undefined;
    return v;
  };

  // Which outbound lanes have no comms at all — so we can label them "none
  // mapped yet" instead of leaving a blank stripe that reads as a load error.
  const teamsWithComms = new Set(comms.map((c) => c.team));
  // Comm count per team, for the "N hidden" hint on a collapsed lane.
  const commCountByTeam = comms.reduce<Record<string, number>>((acc, c) => {
    acc[c.team] = (acc[c.team] ?? 0) + 1;
    return acc;
  }, {});
  // Endpoints a trigger line must not draw to: folded "+N more" comms and
  // comms hidden by the current filters (ghosts). Comms in a COLLAPSED lane
  // still render as icon markers, so they DO get lines — anchored to the
  // marker instead of the (absent) card.
  const filteredForLines = comms.filter(
    (c) =>
      !activeTypes.has(c.type) ||
      !matchesSegment(c, segments) ||
      (equity !== null && c.equity !== equity),
  );
  const hiddenForLines = new Set([
    ...hiddenIds,
    ...filteredForLines.map((c) => c.id),
    ...comms.filter((c) => hiddenLanes.has(c.team)).map((c) => c.id),
  ]);

  // Alternating lane-stripe background, computed once so the canvas and the
  // sticky gutter stay in sync (divider lanes are skipped in the count).
  const laneBg: Record<string, string> = (() => {
    let stripe = 0;
    const map: Record<string, string> = {};
    for (const lane of LANES) {
      map[lane.id] =
        lane.kind === "divider"
          ? "bg-grey-20"
          : stripe++ % 2 === 0
            ? "bg-grey-10"
            : "bg-surface";
    }
    return map;
  })();
  // Gutter variant of the stripes — translucent, so the panel's frosted
  // backdrop-blur (matching the dock) shows scrolled content through it.
  const gutterBg: Record<string, string> = Object.fromEntries(
    Object.entries(laneBg).map(([id, bg]) => [
      id,
      bg === "bg-grey-20" ? "bg-grey-20/60" : bg === "bg-grey-10" ? "bg-grey-10/55" : "bg-surface/40",
    ]),
  );

  // Extra scrollable space below the last lane so it can clear the floating
  // docks (control/persona docks + filter pill sit ~110px off the viewport
  // bottom) — without it the bottom inbound curve is permanently covered.
  const DOCK_CLEARANCE = 112;

  // The moment/embargo/grid context extends UP through the (transparent)
  // student swimlane, so a question card sits in the same shaded period /
  // send-freeze as the touchpoints below it.
  const contextTop = HEADER_H - (showStudentLayer ? STUDENT_LANE_H : 0);

  return (
    <div
      className="relative"
      style={{ width: LABEL_W + TOTAL_W, height: TOTAL_H + DOCK_CLEARANCE }}
      onClick={onClearFocus}
    >
      {/* ── School year row — parallel audience bands. Sticky at the very top
          so it stays with the month/moment bands as the map scrolls. ── */}
      <div className="sticky top-0 z-40" style={{ height: YEAR_H }}>
        <div className="absolute top-0" style={{ left: LABEL_W, width: TOTAL_W }}>
          <YearBand />
        </div>
        <div
          className="sticky left-0 z-20 flex h-full items-center border-r border-b border-grey-30 bg-card pl-[35px] pr-4 text-[11px] text-grey-60"
          style={{ width: LABEL_W }}
        >
          School year
        </div>
      </div>

      <div className="sticky z-40" style={{ top: YEAR_H, height: MONTH_H }}>
        <div className="absolute top-0" style={{ left: LABEL_W, width: TOTAL_W }}>
          <MonthBand expandedMonths={expandedMonths} onSetLevel={onSetMonthLevel} />
        </div>
        <div
          className="sticky left-0 z-20 flex h-full items-center justify-between gap-2 border-r border-b border-grey-30 bg-card/70 backdrop-blur-md pl-[35px] pr-4 text-[11px] text-grey-60"
          style={{ width: LABEL_W }}
        >
          Month
          {/* One-click escape from any number of zoomed months — lives in the
              sticky gutter so it's reachable however wide the map has grown. */}
          {canResetZoom && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onResetZoom();
              }}
              title="Collapse all zoomed months"
              className={`animate-pop-in relative rounded-full bg-grey-20 px-2 py-0.5 font-medium text-grey-90 after:absolute after:-inset-1 after:content-[''] hover:bg-grey-30 ${FOCUS_RING}`}
            >
              Reset zoom
            </button>
          )}
        </div>
      </div>

      <div className="sticky z-40" style={{ top: YEAR_H + MONTH_H, height: MOMENT_H }}>
        <div className="absolute top-0" style={{ left: LABEL_W, width: TOTAL_W }}>
          <MomentsBand
            activeMomentId={activeMomentId}
            onHoverMoment={onHoverMoment}
            onPinMoment={onPinMoment}
          />
        </div>
        <div
          className="sticky left-0 z-30 flex h-full items-start border-r border-b-2 border-grey-40 bg-card/70 backdrop-blur-md pt-2 pl-[35px] pr-4 text-[11px] text-grey-60"
          style={{ width: LABEL_W }}
        >
          Moments that matter
        </div>
      </div>

      {/* ── Journey Stage row — the CX lens, sitting directly above the
          student questions so it frames them. Same quiet card surface as the
          swimlane (not the navy header). Scrolls away; month row sticks. ── */}
      <div className="relative z-30" style={{ height: STAGE_H }}>
        <div className="absolute top-0" style={{ left: LABEL_W, width: TOTAL_W }}>
          <StageBand
            onOpenStage={onOpenStage}
            onHoverStage={onHoverStage}
            onJumpStage={onJumpStage}
          />
        </div>
        <div
          className={`sticky left-0 z-20 flex h-full items-center border-r border-b border-grey-30 bg-card/75 backdrop-blur-md pl-[35px] pr-4 text-grey-90 ${EYEBROW}`}
          style={{ width: LABEL_W }}
        >
          Journey Stage
        </div>
      </div>

      {/* ── Student swimlane — the students' questions as speech-box cards,
          packed and stacked like the touchpoint lanes, sitting directly above
          Recruitment. Optional; when hidden HEADER_H shrinks by STUDENT_LANE_H. ── */}
      {showStudentLayer && (
        <StudentJourneyLane
          collapsed={studentCollapsed}
          onToggleCollapse={onToggleStudentCollapse}
          activeQuestion={activeQuestion}
          onHoverQuestion={onHoverQuestion}
          onPinQuestion={onPinQuestion}
          onOpenQuestion={onOpenQuestion}
          hoveredStage={hoveredStage}
        />
      )}

      {/* ── Scrolling canvas ── */}
      <div className="absolute top-0" style={{ left: LABEL_W, width: TOTAL_W, height: TOTAL_H }}>
        {/* Lane backgrounds — alternate shade per lane so rows are easy to
            track across the full width, skipping the divider lane. */}
        {LANES.filter((lane) => lane.height > 0).map((lane) => (
          <div
            key={lane.id}
            className={`absolute left-0 w-full border-b border-grey-30 ${laneBg[lane.id]}`}
            style={{ top: lane.top, height: lane.height }}
          />
        ))}

        {/* Month gridlines (heavier at year boundaries) */}
        {Array.from({ length: MONTHS - 1 }, (_, i) => i + 1).map((m) => (
          <div
            key={m}
            className={`absolute w-px ${m % 12 === 0 ? "bg-grey-40" : "bg-grey-20"}`}
            style={{ left: scaleX(m), top: contextTop, height: TOTAL_H - contextTop }}
          />
        ))}

        {/* Week (level 1) or day (level 2) gridlines inside each expanded month.
            Day view draws a line for EVERY day (2..30 — day 1 already sits on
            the month boundary line) so each comm reads against its own day. */}
        {[...expandedMonths].flatMap(([month, level]) =>
          (level === 1 ? [8, 15, 22] : Array.from({ length: 29 }, (_, i) => i + 2)).map(
            (d) => (
              <div
                key={`tick-${month}-${d}`}
                className="absolute w-px bg-grey-30"
                style={{
                  left: scaleX(month + (d - 1) / 30),
                  top: contextTop,
                  height: TOTAL_H - contextTop,
                }}
              />
            ),
          ),
        )}

        {/* Moments that matter — a quiet shaded window (no heavy rules), with
            a faint dashed left edge marking its start. Lights up red while
            focused via hover/click on its label. */}
        {MOMENTS.map((mo) => {
          const left = scaleX(mo.from);
          const width = scaleX(mo.to) - scaleX(mo.from);
          const active = mo.id === activeMomentId;
          return (
            <div
              key={mo.id}
              className={`absolute z-10 border-l border-dashed transition-colors ${
                active ? "border-rmit-blue-interactive bg-rmit-blue-interactive/8" : "border-grey-40 bg-rmit-blue-interactive/5"
              }`}
              style={{ left, width, top: contextTop, height: TOTAL_H - contextTop }}
            />
          );
        })}

        {/* Campaign mode: the window, and the stage gate at its end. */}
        {campaignWindow && (
          <Fragment>
            <div
              aria-hidden
              className="pointer-events-none absolute z-0 bg-rmit-blue-interactive/5"
              style={{ left: scaleX(campaignWindow.from), width: scaleX(campaignWindow.to) - scaleX(campaignWindow.from), top: contextTop, height: TOTAL_H - contextTop }}
            />
            <div aria-hidden className="pointer-events-none absolute z-0 border-l-2 border-rmit-blue" style={{ left: scaleX(campaignWindow.gate), top: contextTop, height: TOTAL_H - contextTop }} />
          </Fragment>
        )}

        {/* Send embargoes — a diagonal-hatched band (reads as "no-go", unlike
            the moment windows) marking periods when outbound comms hold. The
            label sticks under the header so it stays legible down a tall map. */}
        {EMBARGOES.filter(() => !campaignWindow).map((e) => {
          const left = scaleX(e.from);
          const width = scaleX(e.to) - left;
          return (
            <Fragment key={e.label}>
              <div
                aria-hidden
                // grey-60 edges/hatch: the band boundary is meaningful (a
                // send-freeze window), so it needs the 3:1 non-text minimum
                // on the light lane stripes. Under a spotlight/lens the whole
                // band recedes with everything else — the crosshatch is loud.
                className={`pointer-events-none absolute z-10 border-x border-dashed border-grey-60 transition-opacity duration-300 ${
                  dimBackground ? "opacity-[0.1]" : ""
                }`}
                style={{
                  left,
                  width,
                  // Starts at the comm lanes (HEADER_H), NOT up through the
                  // student swimlane — the send-freeze is about comms, not the
                  // students' questions.
                  top: HEADER_H,
                  // Stop at the campaigns lane: the embargo is a send-freeze for
                  // the comm lanes above it, and the crosshatch made campaign
                  // bars hard to read. laneById is safe — campaigns always exist.
                  height: laneById("campaigns").top - HEADER_H,
                  backgroundImage:
                    "repeating-linear-gradient(45deg, var(--color-grey-60) 0 1.5px, transparent 1.5px 9px)",
                }}
              />
              <div
                className={`pointer-events-none absolute z-20 flex justify-center items-start transition-opacity duration-300 ${
                  dimBackground ? "opacity-[0.1]" : ""
                }`}
                style={{ left, width, top: HEADER_H, height: laneById("campaigns").top - HEADER_H }}
              >
                <span
                  className="pointer-events-auto sticky flex items-center gap-1 rounded-md border border-grey-40 bg-card px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-grey-80 shadow-sm"
                  style={{ top: YEAR_H + MONTH_H + MOMENT_H + 8 }}
                  title={`${e.label} — 27 Oct to 18 Nov 2026`}
                >
                  <Ban size={11} strokeWidth={2} aria-hidden />
                  VTAC comms embargo
                </span>
              </div>
            </Fragment>
          );
        })}

        {/* Media schedules — one summary bar each, expandable to per-placement
            bars, in their own campaigns lane (so both hide when it's
            collapsed). Row indices run FLAT across both schedules, matching the
            row-height list campaignY walks. */}
        {!collapsedLanes.has("campaigns") && (
          <CampaignGantt
            expanded={expandedCampaigns}
            dimmed={dimBackground}
            onToggle={onToggleCampaign}
            onOpenChannel={onOpenCampaign}
            onOpenAlwaysOn={() => onOpenSchedule("cmp-always-on")}
          />
        )}

        {/* Inbound engagement curves */}
        {inbound
          .filter((d) => !hiddenLanes.has(d.id))
          .map((d) => (
            <InboundLane key={d.id} data={d} onOpen={laneActions?.find((a) => a.laneId === d.id)?.onClick} />
          ))}

        {/* Date dots — every comm's exact send date on its lane's baseline
            strip, INCLUDING comms folded into a "+N more" chip, so the true
            density of a cluster is always visible. Folded comms get a HOLLOW
            dot (outline only, dimmer) so a lineless dot reads as "more here,
            collapsed" rather than a card that lost its stem. A COLLAPSED lane
            keeps its touchpoints too — as icon markers centred in the strip
            (the type icon carries what the card would say), so you can still
            read the cadence in the compact "all lanes" overview. */}
        {comms.map((c) => {
          // Hidden lanes render nothing but their gutter label.
          if (hiddenLanes.has(c.team)) return null;
          const filteredOut =
            !activeTypes.has(c.type) ||
            !matchesSegment(c, segments) ||
            (equity !== null && c.equity !== equity) ||
            (extraFilteredIds?.has(c.id) ?? false);
          const inFocus = focusSet ? focusSet.has(c.id) : false;
          const dotDimmed = filteredOut || (focusSet !== null && !inFocus);
          const folded = hiddenIds.has(c.id);
          // VTAC (external) markers are muted grey, matching their dashed cards.
          const external = c.team === "vtac";
          const accentBase = external ? "bg-grey-70" : COMM_COLORS[c.type].accent;
          const accent = markerAccent(accentBase, "dot"); // bg-*

          // Collapsed lane → the marker IS the whole representation, so it
          // carries the type icon (email/SMS/event/…) and opens the detail
          // panel on click, like a card would.
          if (collapsedLanes.has(c.team)) {
            // Ghosts are dropped from the collapsed stack (and its height) —
            // the lane shows only what's lit, saving vertical space.
            if (filteredOut) return null;
            const Icon = COMM_ICONS[c.type];
            const day = Math.round((c.month % 1) * 30) + 1;
            return (
              <button
                key={`mark-${c.id}`}
                type="button"
                disabled={filteredOut}
                aria-hidden={filteredOut || undefined}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDetail(c.id);
                }}
                onMouseEnter={() => onHover(c.id)}
                onMouseLeave={() => onHover(null)}
                onFocus={() => onHover(c.id)}
                onBlur={() => onHover(null)}
                aria-label={`${COMM_LABELS[c.type]} — ${c.title} — details`}
                // Solid fill in the type colour (grey for VTAC) with a white
                // icon — the same solid marker language as the baseline dots,
                // just big enough to carry the icon.
                className={`group absolute z-10 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full text-on-accent ring-2 ring-card transition-opacity duration-300 ${accent} ${FOCUS_RING} ${
                  filteredOut
                    ? "opacity-[0.06]"
                    : dotDimmed
                      ? "opacity-[0.1] focus-visible:z-50 focus-visible:opacity-100"
                      : "cursor-pointer hover:z-50 focus-visible:z-50"
                }`}
                style={{ left: markerPos(c).x, top: markerPos(c).y }}
              >
                <Icon size={14} strokeWidth={2.25} aria-hidden />
                {/* title tooltip on hover — the card's instant-tooltip style.
                    z-50 (and the button's hover:z-50) so it clears the sticky
                    header / gutter. Shown/hidden INSTANTLY (no fade): a fade-out
                    lingers after the z drops back to 10 and flashes behind the
                    markers stacked above it. */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute -top-7 left-1/2 z-50 hidden -translate-x-1/2 rounded-md bg-tooltip px-2 py-1 text-xs font-normal whitespace-nowrap text-white shadow-md group-hover:block group-focus-within:block"
                >
                  {c.title} · {day} {monthLabel(Math.floor(c.month))}
                </span>
              </button>
            );
          }

          // Centre the dot on the 3px spine (card left edge + accent strip),
          // so dot, stem and card edge share one axis.
          const pos = { left: commPos(c).x + 0.75, top: dotY(c.team) };
          // Folded → transparent centre + coloured ring (the lane shows
          // through, so it's unmistakably not a filled card marker) AND it's
          // a button that expands the month, exactly like the "+N more" chip.
          if (folded) {
            return (
              <button
                key={`dot-${c.id}`}
                type="button"
                disabled={filteredOut}
                aria-hidden={filteredOut || undefined}
                onClick={(e) => {
                  e.stopPropagation();
                  onSetMonthLevel(Math.floor(c.month), 2);
                }}
                title="Expand this month to see it"
                aria-label={`This ${COMM_LABELS[c.type].toLowerCase()} is folded here — expand this month to see it`}
                // after:-inset-2 = an invisible 28px hit area around the 12px
                // dot (2.5.8) without growing the visual.
                className={`absolute z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-all duration-300 after:absolute after:-inset-2 after:content-[''] ${accent.replace(
                  "bg-",
                  "border-",
                )} ${FOCUS_RING} ${
                  dotDimmed
                    ? filteredOut
                      ? "cursor-default opacity-[0.06]"
                      : "cursor-default opacity-[0.1] focus-visible:opacity-100"
                    : "cursor-pointer opacity-70 hover:scale-125 hover:opacity-100"
                }`}
                style={pos}
              />
            );
          }
          // Visible → solid dot with a card-coloured halo separating it from
          // the lane. Decorative (its card carries the real affordance) —
          // except for filtered-out comms, where the ghost dot IS the whole
          // footprint (no card, no stem), so it carries a hover title.
          return (
            <DateDot
              key={`dot-${c.id}`}
              title={filteredOut ? `${c.title} — hidden by filters` : undefined}
              accent={accent}
              dim={filteredOut ? "opacity-[0.06]" : dotDimmed ? "opacity-[0.1]" : ""}
              style={pos}
            />
          );
        })}

        {/* Thin stems tying each visible chip back to its date dot */}
        {comms
          .filter((c) => !hiddenIds.has(c.id) && !collapsedLanes.has(c.team))
          .map((c) => {
            const filteredOut =
            !activeTypes.has(c.type) ||
            !matchesSegment(c, segments) ||
            (equity !== null && c.equity !== equity) ||
            (extraFilteredIds?.has(c.id) ?? false);
            if (filteredOut) return null; // ghost dot only — no card, no stem
            const inFocus = focusSet ? focusSet.has(c.id) : false;
            const stemDimmed = focusSet !== null && !inFocus;
            const { x: cx, y } = commPos(c);
            const top = dotY(c.team) + 5;
            return (
              /* 3px stem left-aligned to the card's left edge (cx) — the exact
                 x of the card's accent strip — so dot → stem → card edge is
                 one straight continuous line, no offset or kink */
              <Stem
                key={`stem-${c.id}`}
                accent={markerAccent(c.team === "vtac" ? "bg-grey-40" : COMM_COLORS[c.type].accent, "line")}
                dim={stemDimmed ? "opacity-[0.1]" : ""}
                style={{ left: cx, top, height: Math.max(y - top + 2, 0) }}
              />
            );
          })}

        {/* Comms (collapsed-month overflow is folded into the chips below) */}
        {comms
          .filter((c) => !hiddenIds.has(c.id) && !collapsedLanes.has(c.team))
          .map((c) => {
            const filteredOut =
            !activeTypes.has(c.type) ||
            !matchesSegment(c, segments) ||
            (equity !== null && c.equity !== equity) ||
            (extraFilteredIds?.has(c.id) ?? false);
            if (filteredOut) return null; // ghost dot only — see the dot strip
            const inFocus = focusSet ? focusSet.has(c.id) : false;
            const dimmed = focusSet !== null && !inFocus;
            return (
              <CommCard
                key={c.id}
                comm={c}
                variant={variantFor(c)}
                dimmed={dimmed}
                active={inFocus}
                filteredOut={filteredOut}
                onHover={onHover}
                onOpenDetail={onOpenDetail}
                onMeasure={onMeasure}
                feedbackCount={feedbackCount(c.id)}
                extra={cardExtra?.(c)}
              />
            );
          })}

        {/* Card footers — controls that belong to a card but can't live inside
            its button: positioned over the card's reserved bottom line. */}
        {cardFooter &&
          comms
            .filter((c) => !hiddenIds.has(c.id) && !collapsedLanes.has(c.team) && !hiddenLanes.has(c.team))
            .map((c) => {
              const node = cardFooter(c);
              if (!node) return null;
              const { x, y } = commPos(c);
              return (
                <div key={`footer-${c.id}`} className="absolute z-30" style={{ left: x + 27, top: y + commHeight(c.id) - 22 }}>
                  {node}
                </div>
              );
            })}

        {/* "+N more" overflow chips — clicking one expands that month to
            day view, which shows everything it holds. While a lens is dimming
            the map, any lit comm folded inside a chip has already forced its
            month open (the auto-expand pass in App), so every remaining chip
            holds only dimmed comms — it recedes with them and stops taking
            clicks. */}
        {chips
          .filter((chip) => !collapsedLanes.has(chip.team))
          .map((chip) => (
          <button
            key={`${chip.team}-${chip.monthIndex}`}
            type="button"
            disabled={dimChips}
            aria-hidden={dimChips || undefined}
            onClick={(e) => {
              e.stopPropagation();
              onSetMonthLevel(chip.monthIndex, (expandedMonths.get(chip.monthIndex) ?? 0) === 0 ? 1 : 2);
            }}
            className={`absolute z-10 flex items-center rounded-full border border-grey-30 bg-card px-2 text-xs font-medium whitespace-nowrap text-rmit-blue-interactive transition-opacity duration-300 after:absolute after:-inset-1 after:content-[''] ${FOCUS_RING} ${
              dimChips ? "opacity-[0.1]" : "hover:border-rmit-blue-interactive"
            }`}
            style={{
              left: Math.min(scaleX(chip.monthIndex) + 4, TOTAL_W - 80),
              top: chipY(chip.team, chip.monthIndex),
              height: CHIP_H,
            }}
            title="Expand this month to see them"
            aria-label={`Show ${chip.count} more ${chip.team} comms in ${monthLabel(chip.monthIndex)} — expand this month`}
          >
            +{chip.count} more
          </button>
        ))}

        {/* Trigger lines skip folded "+N more" and filtered-out comms, but
            DO draw to collapsed-lane markers (positioned via collapsedLanes). */}
        <TriggerLayer
          comms={comms}
          hiddenIds={hiddenForLines}
          collapsedLanes={collapsedLanes}
          activeId={activeId}
          showAll={showLines}
          recede={focusSet !== null && activeId === null}
        />
      </div>

      {/* ── Sticky team gutter — the whole left panel sits ABOVE the canvas
          (cards, chips, embargo/moment labels all ≤ z-30) so nothing bleeds
          over it while scrolling, but BELOW the sticky header bands (z-40) so
          they still cover its top-left corner, and below the fixed docks. ── */}
      <div
        // after: a 12px fade just right of the gutter, so cards sliding under
        // it dissolve softly instead of being chopped by a hard edge.
        className="sticky left-0 z-[35] border-r border-grey-30 bg-surface after:pointer-events-none after:absolute after:top-0 after:bottom-0 after:left-full after:w-3 after:bg-gradient-to-r after:from-surface/70 after:to-transparent after:content-['']"
        style={{ width: LABEL_W, height: TOTAL_H - HEADER_H }}
      >
        {LANES.map((lane) => {
          if (lane.height === 0) return null;
          const collapsible = lane.kind === "outbound" || lane.kind === "inbound";
          const collapsed = collapsedLanes.has(lane.id);
          const hidden = hiddenLanes.has(lane.id);
          const isEmpty = lane.kind === "outbound" && !teamsWithComms.has(lane.id as Team);
          const count = commCountByTeam[lane.id] ?? 0;

          const body = (
            <>
              <span className="flex items-center gap-1.5">
                {collapsible &&
                  (collapsed ? (
                    <ChevronRight size={13} strokeWidth={2} className="shrink-0 text-grey-60" aria-hidden />
                  ) : (
                    <ChevronDown size={13} strokeWidth={2} className="shrink-0 text-grey-60" aria-hidden />
                  ))}
                <span
                  className={`line-clamp-2 ${EYEBROW} ${lane.kind === "divider" ? "text-grey-70" : "text-grey-90"}`}
                >
                  {lane.label}
                </span>
                {/* comm count — the "how much does each team send" number,
                    visible while the lane is open (collapsed shows "N hidden") */}
                {!collapsed && lane.kind === "outbound" && count > 0 && (
                  <span className="text-xs font-normal text-grey-70">· {count}</span>
                )}
              </span>
              {!collapsed && lane.sub && (
                <span className="mt-0.5 pl-[19px] text-xs text-grey-70">{lane.sub}</span>
              )}
              {/* Data-source note, folded behind a compact "Source" affordance —
                  the full note appears on hover, keeping the gutter to a name,
                  a count and one short line. */}
              {!collapsed &&
                lane.kind === "inbound" &&
                (() => {
                  const note = inbound.find((d) => d.id === lane.id)?.seriesNote;
                  return note ? (
                    <span
                      data-print-hide
                      // Keyboard route to the hover note: focusable, popover
                      // shows on focus-within, Esc blurs (1.4.13 dismissal).
                      // The full note is also the accessible name, so AT gets
                      // it without needing the visual popover.
                      tabIndex={0}
                      role="note"
                      aria-label={`Source: ${note}`}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") (e.currentTarget as HTMLElement).blur();
                      }}
                      className={`group relative mt-1 ml-[19px] inline-flex w-fit items-center gap-1 rounded-sm text-[11px] text-grey-70 ${FOCUS_RING}`}
                    >
                      <Info size={11} strokeWidth={2} aria-hidden />
                      Source
                      <span className="absolute top-full left-0 z-50 mt-1 hidden w-64 rounded-md bg-tooltip px-2.5 py-1.5 text-[11px] leading-snug whitespace-normal text-white shadow-md group-hover:block group-focus-within:block">
                        {note}
                      </span>
                    </span>
                  ) : null;
                })()}
              {!collapsed && isEmpty && lane.id !== "campaigns" && (
                <span className="mt-1 pl-[19px] text-xs text-grey-70 italic">
                  No comms mapped yet
                </span>
              )}
              {collapsed && lane.kind === "outbound" && count > 0 && (
                <span className="pl-[19px] text-xs text-grey-70">
                  {count} {hidden ? "hidden" : `touchpoint${count === 1 ? "" : "s"}`}
                </span>
              )}
            </>
          );

          // Every label is top-aligned with the SAME top/bottom padding, so
          // labels line up regardless of lane height. Expanded outbound lanes
          // pin their label just under the sticky month/moment header (the
          // Marketing lane is ~80 comms deep) — and the pinned version keeps the
          // same padding so it reads as a self-contained block when it floats.
          const pinnable = !collapsed && lane.kind === "outbound";
          const content = pinnable ? (
            <div
              className="sticky flex w-full flex-col py-2.5"
              style={{ top: YEAR_H + MONTH_H + MOMENT_H }}
            >
              {body}
            </div>
          ) : lane.kind === "divider" ? (
            // Divider strips are shorter than the standard padding allows —
            // centre the single-line label instead so it can't clip.
            <div className="flex h-full w-full items-center whitespace-nowrap">{body}</div>
          ) : (
            <div className="flex w-full flex-col py-2.5">{body}</div>
          );

          const posStyle = { top: lane.top - HEADER_H, height: lane.height };

          // VTAC carries a provenance note + link under its label. A link can't
          // live inside the collapse <button>, so this lane is a <div> with the
          // toggle and the <a> as siblings in one (pinnable) column.
          if (lane.id === "vtac") {
            return (
              <div
                key={lane.id}
                // The wrapper itself toggles too, so the WHOLE box is
                // clickable like every other lane — the inner button stays
                // as the accessible toggle; the link stops propagation.
                onClick={() => onToggleLane(lane.id)}
                className={`absolute left-0 w-full cursor-pointer border-b border-grey-30 px-4 hover:bg-grey-20 ${laneBg[lane.id]}`}
                style={posStyle}
              >
                <div
                  className={pinnable ? "sticky flex w-full flex-col py-2.5" : "flex w-full flex-col py-2.5"}
                  style={pinnable ? { top: YEAR_H + MONTH_H + MOMENT_H } : undefined}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleLane(lane.id);
                    }}
                    aria-expanded={!collapsed}
                    aria-label={`VTAC lane — ${collapsed ? "expand" : "collapse"}`}
                    className={`flex w-full flex-col text-left ${FOCUS_RING}`}
                  >
                    {body}
                  </button>
                  {!collapsed && (
                    <a
                      data-print-hide
                      href="https://vtac.edu.au/files/pdf/publications/VTAC_2024-25_Newsletter_schedule.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      aria-label="Source: VTAC 2024–25 newsletter schedule (PDF) — indicative dates, not aligned to RMIT's 2026 comms"
                      className={`group relative mt-1 ml-[19px] inline-flex w-fit items-center gap-1 rounded-md text-[11px] text-grey-60 hover:text-rmit-blue-interactive ${FOCUS_RING}`}
                    >
                      <Info size={11} strokeWidth={2} aria-hidden />
                      Source
                      <span className="absolute top-full left-0 z-50 mt-1 hidden w-64 rounded-md bg-tooltip px-2.5 py-1.5 text-[11px] leading-snug whitespace-normal text-white shadow-md group-hover:block group-focus-within:block">
                        VTAC 2024–25 newsletter (opens the PDF) — indicative dates, not aligned to
                        RMIT&rsquo;s 2026 comms.
                      </span>
                    </a>
                  )}
                </div>
              </div>
            );
          }

          if (!collapsible) {
            return (
              <div
                key={lane.id}
                className={`absolute left-0 flex w-full flex-col border-b border-grey-30 px-4 ${gutterBg[lane.id]}`}
                style={posStyle}
              >
                {content}
              </div>
            );
          }
          return (
            <button
              key={lane.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleLane(lane.id);
              }}
              aria-expanded={!collapsed}
              aria-label={`${lane.label} lane — ${hidden ? "show" : collapsed ? "expand" : "collapse"}`}
              className={`absolute left-0 flex w-full flex-col border-b border-grey-30 px-4 text-left hover:bg-grey-20 ${gutterBg[lane.id]} ${FOCUS_RING}`}
              style={posStyle}
            >
              {content}
            </button>
          );
        })}

        {/* Campaign mode: what lives in a lane without a date — its pages, its
            channels — as a line under the lane label. A sibling of the lane
            button, like the eye control. */}
        {laneActions?.map((a) => {
          const lane = LANES.find((l) => l.id === a.laneId);
          if (!lane || hiddenLanes.has(a.laneId) || collapsedLanes.has(a.laneId)) return null;
          return (
            <button
              key={`action-${a.laneId}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                a.onClick();
              }}
              className={`absolute z-10 rounded-md px-2 py-1 text-left hover:bg-grey-20 ${FOCUS_RING}`}
              style={{ top: lane.top - HEADER_H + (a.offset ?? 46), left: 10, right: 10 }}
            >
              <span className="block text-xs font-medium text-rmit-blue-interactive">{a.label}</span>
              {a.detail && <span className="block text-xs text-grey-70">{a.detail}</span>}
            </button>
          );
        })}

        {/* Per-lane hide / show — a dedicated eye control instead of a stop
            on a blind click-cycle: chevron/label = expand-collapse, eye =
            hide. Sits as a sibling ABOVE the lane buttons (a button can't
            nest a button). */}
        {LANES.filter((l) => (l.kind === "outbound" || l.kind === "inbound") && l.height > 0).map((lane) => {
          const hidden = hiddenLanes.has(lane.id);
          return (
            <button
              key={`eye-${lane.id}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (hidden) onToggleLane(lane.id);
                else onHideLane(lane.id);
              }}
              aria-pressed={hidden}
              aria-label={hidden ? `Show the ${lane.label} lane` : `Hide the ${lane.label} lane`}
              title={hidden ? "Show lane" : "Hide lane"}
              className={`group absolute z-10 flex h-6 w-6 items-center justify-center rounded-md ${
                hidden ? "text-grey-70" : "text-grey-50"
              } hover:bg-grey-20 hover:text-grey-90 ${FOCUS_RING}`}
              style={{ top: lane.top - HEADER_H + 6, right: 6 }}
            >
              {hidden ? (
                <Eye size={13} strokeWidth={2} aria-hidden />
              ) : (
                <EyeOff size={13} strokeWidth={2} aria-hidden />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
