import { Fragment } from "react";
import { Ban, ChevronDown, ChevronRight } from "lucide-react";
import { inbound } from "../data/comms";
import { EMBARGOES, MOMENTS } from "../data/journey";
import type { Comm, CommType, Team } from "../data/types";
import { matchesSegment, type SegmentSelection } from "../lib/segments";
import {
  CHIP_H,
  HEADER_H,
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
  commPos,
  dotY,
  markerPos,
  monthLabel,
  scaleX,
  type ExpandedMonths,
  type OverflowChip,
} from "../lib/scale";
import { markerAccent } from "../lib/designConfig";
import { EYEBROW, FOCUS_RING } from "../lib/styles";
import { COMM_COLORS, COMM_ICONS, COMM_LABELS } from "./icons";
import { CampaignGantt } from "./CampaignGantt";
import { CommCard } from "./CommCard";
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
  /** comms per journey stage, shown in the stage band */
  stageCounts: Record<string, number>;
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
  /** student journey lane (the spine) — in-lane question focus + ⓘ panel */
  activeQuestion: QuestionRef | null;
  onHoverQuestion: (q: QuestionRef | null) => void;
  onPinQuestion: (q: QuestionRef) => void;
  onOpenStage: (stageLabel: string) => void;
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
  onToggleLane: (laneId: string) => void;
}

export function Timeline({
  comms,
  hiddenIds,
  chips,
  expandedMonths,
  onSetMonthLevel,
  canResetZoom,
  onResetZoom,
  stageCounts,
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
  activeQuestion,
  onHoverQuestion,
  onPinQuestion,
  onOpenStage,
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
  onToggleLane,
}: Props) {
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
    // A bare "Year 10/11/12" just repeats the school-year band the card sits
    // in — drop it; keep richer audiences (SNAP, DDINTON, campus splits, …).
    if (v && /^year\s*1[0-2]$/i.test(v.trim())) return undefined;
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
  const hiddenForLines =
    filteredForLines.length || hiddenIds.size
      ? new Set([...hiddenIds, ...filteredForLines.map((c) => c.id)])
      : hiddenIds;

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

  // Extra scrollable space below the last lane so it can clear the floating
  // docks (control/persona docks + filter pill sit ~110px off the viewport
  // bottom) — without it the bottom inbound curve is permanently covered.
  const DOCK_CLEARANCE = 112;

  return (
    <div
      className="relative"
      style={{ width: LABEL_W + TOTAL_W, height: TOTAL_H + DOCK_CLEARANCE }}
      onClick={onClearFocus}
    >
      {/* ── Journey Stage row — the CX lens. The ⓘ on each stage opens its
          full student-experience deep-dive. Scrolls away; month row sticks. ── */}
      <div className="relative z-30" style={{ height: STAGE_H }}>
        <div className="absolute top-0" style={{ left: LABEL_W, width: TOTAL_W }}>
          <StageBand
            onOpenStage={onOpenStage}
            onJumpStage={onJumpStage}
            stageCounts={stageCounts}
          />
        </div>
        <div
          className={`sticky left-0 z-20 flex h-full items-center border-r border-grey-30 bg-header px-4 text-white ${EYEBROW}`}
          style={{ width: LABEL_W }}
        >
          Journey Stage
        </div>
      </div>

      {/* ── Student Journey — the questions behind each stage, the same CX lens
          as the stage row, so it sits directly under it (above School year).
          Optional; toggled from the control dock. When hidden, HEADER_H shrinks
          by STUDENT_LANE_H (see layoutTimeline) so the canvas closes the gap. ── */}
      {showStudentLayer && (
        <StudentJourneyLane
          activeQuestion={activeQuestion}
          onHoverQuestion={onHoverQuestion}
          onPinQuestion={onPinQuestion}
        />
      )}

      {/* ── School year row — parallel audience bands ── */}
      <div className="relative z-30" style={{ height: YEAR_H }}>
        <div className="absolute top-0" style={{ left: LABEL_W, width: TOTAL_W }}>
          <YearBand />
        </div>
        <div
          className="sticky left-0 z-20 flex h-full items-center border-r border-b border-grey-30 bg-grey-20 px-4 text-xs text-grey-70"
          style={{ width: LABEL_W }}
        >
          School year
        </div>
      </div>

      <div className="sticky top-0 z-40" style={{ height: MONTH_H }}>
        <div className="absolute top-0" style={{ left: LABEL_W, width: TOTAL_W }}>
          <MonthBand expandedMonths={expandedMonths} onSetLevel={onSetMonthLevel} />
        </div>
        <div
          className="sticky left-0 z-20 flex h-full items-center justify-between gap-2 border-r border-b border-grey-30 bg-card px-4 text-xs text-grey-70"
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
              className={`animate-pop-in rounded-full bg-grey-20 px-2 py-0.5 font-medium text-grey-90 hover:bg-grey-30 ${FOCUS_RING}`}
            >
              Reset zoom
            </button>
          )}
        </div>
      </div>

      <div className="sticky z-40" style={{ top: MONTH_H, height: MOMENT_H }}>
        <div className="absolute top-0" style={{ left: LABEL_W, width: TOTAL_W }}>
          <MomentsBand
            activeMomentId={activeMomentId}
            onHoverMoment={onHoverMoment}
            onPinMoment={onPinMoment}
          />
        </div>
        <div
          className="sticky left-0 z-30 flex h-full items-center border-r border-b border-grey-30 bg-card px-4 text-xs text-grey-70"
          style={{ width: LABEL_W }}
        >
          Moments that matter
        </div>
      </div>

      {/* ── Scrolling canvas ── */}
      <div className="absolute top-0" style={{ left: LABEL_W, width: TOTAL_W, height: TOTAL_H }}>
        {/* Lane backgrounds — alternate shade per lane so rows are easy to
            track across the full width, skipping the divider lane. */}
        {LANES.map((lane) => (
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
            style={{ left: scaleX(m), top: HEADER_H, height: TOTAL_H - HEADER_H }}
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
                  top: HEADER_H,
                  height: TOTAL_H - HEADER_H,
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
                active ? "border-rmit-red bg-rmit-red/8" : "border-grey-30 bg-grey-90/[0.03]"
              }`}
              style={{ left, width, top: HEADER_H, height: TOTAL_H - HEADER_H }}
            />
          );
        })}

        {/* Send embargoes — a diagonal-hatched band (reads as "no-go", unlike
            the moment windows) marking periods when outbound comms hold. The
            label sticks under the header so it stays legible down a tall map. */}
        {EMBARGOES.map((e) => {
          const left = scaleX(e.from);
          const width = scaleX(e.to) - left;
          return (
            <Fragment key={e.label}>
              <div
                aria-hidden
                className="pointer-events-none absolute z-10 border-x border-dashed border-grey-40"
                style={{
                  left,
                  width,
                  top: HEADER_H,
                  height: TOTAL_H - HEADER_H,
                  backgroundImage:
                    "repeating-linear-gradient(45deg, var(--color-grey-50) 0 1.5px, transparent 1.5px 9px)",
                }}
              />
              <div
                className="pointer-events-none absolute z-20 flex justify-center items-start"
                style={{ left, width, top: HEADER_H, height: TOTAL_H - HEADER_H }}
              >
                <span
                  className="pointer-events-auto sticky flex items-center gap-1 rounded-md border border-grey-40 bg-card px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-grey-80 shadow-sm"
                  style={{ top: MONTH_H + MOMENT_H + 8 }}
                  title={`${e.label} — 27 Oct to 18 Nov 2026`}
                >
                  <Ban size={11} strokeWidth={2} aria-hidden />
                  Embargo
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
          .filter((d) => !collapsedLanes.has(d.id))
          .map((d) => (
            <InboundLane key={d.id} data={d} />
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
          const filteredOut =
            !activeTypes.has(c.type) ||
            !matchesSegment(c, segments) ||
            (equity !== null && c.equity !== equity);
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
                className={`group absolute z-10 flex h-[22px] w-[22px] -translate-x-1/2 items-center justify-center rounded-full text-on-accent ring-2 ring-card transition-opacity duration-300 ${accent} ${FOCUS_RING} ${
                  filteredOut
                    ? "opacity-[0.12]"
                    : dotDimmed
                      ? "opacity-[0.05] focus-visible:z-50 focus-visible:opacity-100"
                      : "cursor-pointer hover:z-50 focus-visible:z-50"
                }`}
                style={{ left: markerPos(c).x, top: markerPos(c).y }}
              >
                <Icon size={12} strokeWidth={2.25} aria-hidden />
                {/* title tooltip on hover — the card's instant-tooltip style.
                    z-50 (and the button's hover:z-50) so it clears the sticky
                    header / gutter. Shown/hidden INSTANTLY (no fade): a fade-out
                    lingers after the z drops back to 10 and flashes behind the
                    markers stacked above it. */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute -top-7 left-1/2 z-50 hidden -translate-x-1/2 rounded-md bg-tooltip px-2 py-1 text-xs font-normal whitespace-nowrap text-white shadow-md group-hover:block"
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
                className={`absolute z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-all duration-300 ${accent.replace(
                  "bg-",
                  "border-",
                )} ${FOCUS_RING} ${
                  dotDimmed
                    ? filteredOut
                      ? "cursor-default opacity-[0.12]"
                      : "cursor-default opacity-[0.05] focus-visible:opacity-100"
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
            <span
              key={`dot-${c.id}`}
              aria-hidden
              title={filteredOut ? `${c.title} — hidden by filters` : undefined}
              className={`absolute z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card transition-opacity duration-300 ${accent} ${
                filteredOut ? "opacity-[0.12]" : dotDimmed ? "opacity-[0.05]" : ""
              }`}
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
            (equity !== null && c.equity !== equity);
            if (filteredOut) return null; // ghost dot only — no card, no stem
            const inFocus = focusSet ? focusSet.has(c.id) : false;
            const stemDimmed = focusSet !== null && !inFocus;
            const { x: cx, y } = commPos(c);
            const top = dotY(c.team) + 5;
            return (
              /* 3px stem left-aligned to the card's left edge (cx) — the exact
                 x of the card's accent strip — so dot → stem → card edge is
                 one straight continuous line, no offset or kink */
              <span
                key={`stem-${c.id}`}
                aria-hidden
                className={`absolute w-[1.25px] transition-opacity duration-300 ${markerAccent(
                  c.team === "vtac" ? "bg-grey-40" : COMM_COLORS[c.type].accent,
                  "line",
                )} ${stemDimmed ? "opacity-[0.05]" : ""}`}
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
            (equity !== null && c.equity !== equity);
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
              />
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
            className={`absolute z-10 flex items-center rounded-full border border-grey-30 bg-card px-2 text-xs font-medium whitespace-nowrap text-rmit-blue-interactive transition-opacity duration-300 ${FOCUS_RING} ${
              dimChips ? "opacity-[0.05]" : "hover:border-rmit-blue-interactive"
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
        />
      </div>

      {/* ── Sticky team gutter — the whole left panel sits ABOVE the canvas
          (cards, chips, embargo/moment labels all ≤ z-30) so nothing bleeds
          over it while scrolling, but BELOW the sticky header bands (z-40) so
          they still cover its top-left corner, and below the fixed docks. ── */}
      <div
        className="sticky left-0 z-[35] border-r border-grey-30 bg-surface"
        style={{ width: LABEL_W, height: TOTAL_H - HEADER_H }}
      >
        {LANES.map((lane) => {
          const collapsible = lane.kind === "outbound" || lane.kind === "inbound";
          const collapsed = collapsedLanes.has(lane.id);
          const isEmpty = lane.kind === "outbound" && !teamsWithComms.has(lane.id as Team);
          const count = commCountByTeam[lane.id] ?? 0;

          const body = (
            <>
              <span className="flex items-center gap-1.5">
                {collapsible &&
                  (collapsed ? (
                    <ChevronRight size={13} strokeWidth={2} className="text-grey-60" aria-hidden />
                  ) : (
                    <ChevronDown size={13} strokeWidth={2} className="text-grey-60" aria-hidden />
                  ))}
                <span className={`${EYEBROW} ${lane.kind === "divider" ? "text-grey-70" : "text-grey-90"}`}>
                  {lane.label}
                </span>
                {/* comm count — the "how much does each team send" number,
                    visible while the lane is open (collapsed shows "N hidden") */}
                {!collapsed && lane.kind === "outbound" && count > 0 && (
                  <span className="text-xs font-normal text-grey-60">· {count}</span>
                )}
              </span>
              {!collapsed && lane.sub && (
                <span className="mt-0.5 pl-[19px] text-xs text-grey-70">{lane.sub}</span>
              )}
              {/* Inbound lanes carry their data-source note in the sticky
                  gutter (like VTAC's sub-label) rather than inside the chart,
                  so it stays put as you scroll the timeline horizontally. */}
              {!collapsed &&
                lane.kind === "inbound" &&
                (() => {
                  const note = inbound.find((d) => d.id === lane.id)?.seriesNote;
                  return note ? (
                    <span className="mt-1 pl-[19px] text-xs leading-snug text-grey-60">{note}</span>
                  ) : null;
                })()}
              {!collapsed && isEmpty && lane.id !== "campaigns" && (
                <span className="mt-1 pl-[19px] text-xs text-grey-70 italic">
                  No comms mapped yet
                </span>
              )}
              {!collapsed && lane.id === "campaigns" && (
                <span className="mt-1 pl-[19px] text-xs text-grey-70">
                  Always-on + 4 campaigns
                </span>
              )}
              {collapsed && lane.kind === "outbound" && count > 0 && (
                <span className="pl-[19px] text-xs text-grey-70">
                  {count} touchpoint{count === 1 ? "" : "s"}
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
              style={{ top: MONTH_H + MOMENT_H }}
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
                className={`absolute left-0 w-full border-b border-grey-30 px-4 ${laneBg[lane.id]}`}
                style={posStyle}
              >
                <div
                  className={pinnable ? "sticky flex w-full flex-col py-2.5" : "flex w-full flex-col py-2.5"}
                  style={pinnable ? { top: MONTH_H + MOMENT_H } : undefined}
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
                    <p className="mt-1.5 pr-1 pl-[19px] text-xs leading-snug text-grey-60">
                      Source:{" "}
                      <a
                        href="https://vtac.edu.au/files/pdf/publications/VTAC_2024-25_Newsletter_schedule.pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className={`text-rmit-blue-interactive underline decoration-dotted underline-offset-2 hover:decoration-solid ${FOCUS_RING}`}
                      >
                        VTAC 2024–25 newsletter
                      </a>{" "}
                      — indicative dates, not aligned to RMIT&rsquo;s 2026 comms.
                    </p>
                  )}
                </div>
              </div>
            );
          }

          if (!collapsible) {
            return (
              <div
                key={lane.id}
                className={`absolute left-0 flex w-full flex-col border-b border-grey-30 px-4 ${laneBg[lane.id]}`}
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
              aria-label={`${lane.label} lane — ${collapsed ? "expand" : "collapse"}`}
              className={`absolute left-0 flex w-full flex-col border-b border-grey-30 px-4 text-left hover:bg-grey-20 ${laneBg[lane.id]} ${FOCUS_RING}`}
              style={posStyle}
            >
              {content}
            </button>
          );
        })}
      </div>
    </div>
  );
}
