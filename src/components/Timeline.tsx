import { Fragment } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { campaignGroups, inbound } from "../data/comms";
import { MOMENTS } from "../data/journey";
import type { Comm, CommType, Team } from "../data/types";
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
  monthLabel,
  scaleX,
  type ExpandedMonth,
  type OverflowChip,
} from "../lib/scale";
import { markerAccent } from "../lib/designConfig";
import { EYEBROW, FOCUS_RING } from "../lib/styles";
import { COMM_COLORS, COMM_LABELS } from "./icons";
import { CampaignBar } from "./CampaignBar";
import { CommCard } from "./CommCard";
import { MomentsBand, MonthBand, StageYearBands } from "./HeaderBands";
import { InboundLane } from "./InboundLane";
import { StudentJourneyLane, type QuestionRef } from "./StudentJourneyLane";
import { TriggerLayer } from "./TriggerLayer";

interface Props {
  comms: Comm[];
  hiddenIds: Set<string>;
  chips: OverflowChip[];
  expandedMonth: ExpandedMonth | null;
  onToggleMonth: (monthIndex: number) => void;
  activeTypes: Set<CommType>;
  activeId: string | null;
  connected: Set<string>;
  showLines: boolean;
  activeMomentId: string | null;
  /** whether the student-journey lane is shown (dock toggle, off by default) */
  showStudentLayer: boolean;
  /** student journey lane (the spine) — in-lane question focus + ⓘ panel */
  activeQuestion: QuestionRef | null;
  onHoverQuestion: (q: QuestionRef | null) => void;
  onPinQuestion: (q: QuestionRef) => void;
  onOpenStage: (stageLabel: string) => void;
  /** comm ids linked to the focused student question; null = no focus */
  questionCommIds: Set<string> | null;
  /** ids of the media schedules currently expanded to their placements */
  openCampaigns: Set<string>;
  onToggleCampaigns: (groupId: string) => void;
  /** click on a channel bar opens its detail panel */
  onOpenCampaign: (id: string) => void;
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
  expandedMonth,
  onToggleMonth,
  activeTypes,
  activeId,
  connected,
  showLines,
  activeMomentId,
  showStudentLayer,
  activeQuestion,
  onHoverQuestion,
  onPinQuestion,
  onOpenStage,
  questionCommIds,
  openCampaigns,
  onToggleCampaigns,
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
  // Focus priority: student-question > moment > trigger. A focused question
  // wins because it's driven from the open stage panel — the user is
  // explicitly asking "which comms answer this?". (An EMPTY question set is
  // meaningful: it dims everything — the coverage gap made visible.) Trigger
  // focus only kicks in when the hovered comm actually has connections —
  // otherwise hovering an unconnected comm would needlessly dim everything.
  const momentCommIds = activeMomentId
    ? new Set(comms.filter((c) => c.momentId === activeMomentId).map((c) => c.id))
    : null;
  const triggerFocusActive = activeId !== null && connected.size > 0;
  const focusSet =
    questionCommIds ??
    momentCommIds ??
    (triggerFocusActive ? new Set([activeId as string, ...connected]) : null);

  // Which outbound lanes have no comms at all — so we can label them "none
  // mapped yet" instead of leaving a blank stripe that reads as a load error.
  const teamsWithComms = new Set(comms.map((c) => c.team));
  // Comm count per team, for the "N hidden" hint on a collapsed lane.
  const commCountByTeam = comms.reduce<Record<string, number>>((acc, c) => {
    acc[c.team] = (acc[c.team] ?? 0) + 1;
    return acc;
  }, {});
  // Endpoints a trigger line must not draw to: folded "+N more" comms plus
  // anything in a collapsed lane.
  const hiddenOrCollapsed = collapsedLanes.size
    ? new Set([
        ...hiddenIds,
        ...comms.filter((c) => collapsedLanes.has(c.team)).map((c) => c.id),
      ])
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

  return (
    <div
      className="relative"
      style={{ width: LABEL_W + TOTAL_W, height: TOTAL_H }}
      onClick={onClearFocus}
    >
      {/* ── Header rows: stages + years scroll away, month row sticks ── */}
      <div className="relative z-30" style={{ height: STAGE_H + YEAR_H }}>
        <div className="absolute top-0" style={{ left: LABEL_W, width: TOTAL_W }}>
          <StageYearBands />
        </div>
        <div className="sticky left-0 h-full border-r border-grey-30" style={{ width: LABEL_W }}>
          <div
            className={`flex items-center bg-header px-4 text-white ${EYEBROW}`}
            style={{ height: STAGE_H }}
          >
            Journey Stage
          </div>
          <div
            className="flex items-center border-b border-grey-30 bg-grey-20 px-4 text-xs text-grey-70"
            style={{ height: YEAR_H }}
          >
            School year
          </div>
        </div>
      </div>

      {/* ── Student journey lane — optional, toggled from the control dock.
          When hidden, HEADER_H shrinks by STUDENT_LANE_H (see layoutTimeline)
          so the canvas below closes the gap rather than leaving an empty band. ── */}
      {showStudentLayer && (
        <StudentJourneyLane
          activeQuestion={activeQuestion}
          onHoverQuestion={onHoverQuestion}
          onPinQuestion={onPinQuestion}
          onOpenStage={onOpenStage}
        />
      )}

      <div className="sticky top-0 z-40" style={{ height: MONTH_H }}>
        <div className="absolute top-0" style={{ left: LABEL_W, width: TOTAL_W }}>
          <MonthBand expandedMonth={expandedMonth} onToggleMonth={onToggleMonth} />
        </div>
        <div
          className="sticky left-0 flex h-full items-center border-r border-b border-grey-30 bg-card px-4 text-xs text-grey-70"
          style={{ width: LABEL_W }}
        >
          Month
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
          className="sticky left-0 flex h-full items-center border-r border-b border-grey-30 bg-card px-4 text-xs text-grey-70"
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

        {/* Week (level 1) or day (level 2) gridlines inside the expanded month.
            Day view draws a line for EVERY day (2..30 — day 1 already sits on
            the month boundary line) so each comm reads against its own day. */}
        {expandedMonth !== null &&
          (expandedMonth.level === 1
            ? [8, 15, 22, 29]
            : Array.from({ length: 29 }, (_, i) => i + 2)
          ).map((d) => (
            <div
              key={`tick-${d}`}
              className="absolute w-px bg-grey-20"
              style={{
                left: scaleX(expandedMonth.month + (d - 1) / 30),
                top: HEADER_H,
                height: TOTAL_H - HEADER_H,
              }}
            />
          ))}

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

        {/* Media schedules — one summary bar each, expandable to per-placement
            bars, stacked in the Marketing lane (so both hide when it's
            collapsed). Row indices run FLAT across both schedules, matching the
            row-height list campaignY walks. */}
        {!collapsedLanes.has("marketing") &&
          (() => {
            let row = 0;
            return campaignGroups.map((group) => {
              const expanded = openCampaigns.has(group.id);
              const summaryRow = row++;
              const channelRows = expanded ? group.channels.map(() => row++) : [];
              return (
                <Fragment key={group.id}>
                  <CampaignBar
                    campaign={{
                      id: group.id,
                      title: `${group.title} — ${group.channels.length} placements`,
                      channel: "group",
                      from: group.from,
                      to: group.to,
                    }}
                    index={summaryRow}
                    expanded={expanded}
                    onToggle={() => onToggleCampaigns(group.id)}
                  />
                  {expanded &&
                    group.channels.map((c, i) => (
                      <CampaignBar
                        key={c.id}
                        campaign={c}
                        index={channelRows[i]}
                        onOpen={onOpenCampaign}
                      />
                    ))}
                </Fragment>
              );
            });
          })()}

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
            collapsed" rather than a card that lost its stem. (Collapsed lanes
            render nothing.) */}
        {comms
          .filter((c) => !collapsedLanes.has(c.team))
          .map((c) => {
          const filteredOut = !activeTypes.has(c.type);
          const inFocus = focusSet ? focusSet.has(c.id) : false;
          const dotDimmed = filteredOut || (focusSet !== null && !inFocus);
          const folded = hiddenIds.has(c.id);
          const accent = markerAccent(COMM_COLORS[c.type].accent, "dot"); // bg-*
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
                  onToggleMonth(Math.floor(c.month));
                }}
                title="Expand this month to see it"
                aria-label={`This ${COMM_LABELS[c.type].toLowerCase()} is folded here — expand this month to see it`}
                className={`absolute z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-all ${accent.replace(
                  "bg-",
                  "border-",
                )} ${FOCUS_RING} ${
                  dotDimmed
                    ? "cursor-default opacity-15"
                    : "cursor-pointer opacity-70 hover:scale-125 hover:opacity-100"
                }`}
                style={pos}
              />
            );
          }
          // Visible → solid dot with a card-coloured halo separating it from
          // the lane. Decorative (its card carries the real affordance).
          return (
            <span
              key={`dot-${c.id}`}
              aria-hidden
              className={`absolute z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card transition-opacity ${accent} ${
                dotDimmed ? "opacity-15" : ""
              }`}
              style={pos}
            />
          );
        })}

        {/* Thin stems tying each visible chip back to its date dot */}
        {comms
          .filter((c) => !hiddenIds.has(c.id) && !collapsedLanes.has(c.team))
          .map((c) => {
            const filteredOut = !activeTypes.has(c.type);
            const inFocus = focusSet ? focusSet.has(c.id) : false;
            const stemDimmed = filteredOut || (focusSet !== null && !inFocus);
            const { x: cx, y } = commPos(c);
            const top = dotY(c.team) + 5;
            return (
              /* 3px stem left-aligned to the card's left edge (cx) — the exact
                 x of the card's accent strip — so dot → stem → card edge is
                 one straight continuous line, no offset or kink */
              <span
                key={`stem-${c.id}`}
                aria-hidden
                className={`absolute w-[1.5px] transition-opacity ${markerAccent(
                  COMM_COLORS[c.type].accent,
                  "line",
                )} ${stemDimmed ? "opacity-15" : ""}`}
                style={{ left: cx, top, height: Math.max(y - top + 2, 0) }}
              />
            );
          })}

        {/* Comms (collapsed-month overflow is folded into the chips below) */}
        {comms
          .filter((c) => !hiddenIds.has(c.id) && !collapsedLanes.has(c.team))
          .map((c) => {
            const filteredOut = !activeTypes.has(c.type);
            const inFocus = focusSet ? focusSet.has(c.id) : false;
            const dimmed = filteredOut || (focusSet !== null && !inFocus);
            return (
              <CommCard
                key={c.id}
                comm={c}
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
            day view, which shows everything it holds */}
        {chips
          .filter((chip) => !collapsedLanes.has(chip.team))
          .map((chip) => (
          <button
            key={`${chip.team}-${chip.monthIndex}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleMonth(chip.monthIndex);
            }}
            className={`absolute z-10 flex items-center rounded-full border border-grey-30 bg-card px-2 text-xs font-medium whitespace-nowrap text-rmit-blue-interactive hover:border-rmit-blue-interactive ${FOCUS_RING}`}
            style={{
              left: Math.min(scaleX(chip.monthIndex) + 4, TOTAL_W - 80),
              top: chipY(chip.team),
              height: CHIP_H,
            }}
            title="Expand this month to see them"
            aria-label={`Show ${chip.count} more ${chip.team} comms in ${monthLabel(chip.monthIndex)} — expand this month`}
          >
            +{chip.count} more
          </button>
        ))}

        {/* Trigger lines skip endpoints in collapsed lanes (nothing to point
            at there) as well as folded "+N more" comms. */}
        <TriggerLayer
          comms={comms}
          hiddenIds={hiddenOrCollapsed}
          activeId={activeId}
          showAll={showLines}
        />
      </div>

      {/* ── Sticky team gutter ── */}
      <div
        className="sticky left-0 z-30 border-r border-grey-30 bg-surface"
        style={{ width: LABEL_W, height: TOTAL_H - HEADER_H }}
      >
        {LANES.map((lane) => {
          const collapsible = lane.kind === "outbound" || lane.kind === "inbound";
          const collapsed = collapsedLanes.has(lane.id);
          // Expanded outbound lanes can grow very tall, so their label anchors
          // to the top (near the visible cards); collapsed strips and the
          // fixed-height inbound/divider lanes centre instead.
          const alignment =
            !collapsed && lane.kind === "outbound" ? "justify-start pt-3.5" : "justify-center";
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
              </span>
              {!collapsed && lane.sub && (
                <span className="mt-0.5 pl-[19px] text-xs text-grey-70">{lane.sub}</span>
              )}
              {!collapsed && isEmpty && (
                <span className="mt-1 pl-[19px] text-xs text-grey-70 italic">
                  No comms mapped yet
                </span>
              )}
              {collapsed && lane.kind === "outbound" && count > 0 && (
                <span className="pl-[19px] text-xs text-grey-70">{count} hidden</span>
              )}
            </>
          );

          const posStyle = { top: lane.top - HEADER_H, height: lane.height };

          if (!collapsible) {
            return (
              <div
                key={lane.id}
                className={`absolute left-0 flex w-full flex-col ${alignment} border-b border-grey-30 px-4 ${laneBg[lane.id]}`}
                style={posStyle}
              >
                {body}
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
              className={`absolute left-0 flex w-full flex-col ${alignment} border-b border-grey-30 px-4 text-left hover:bg-grey-20 ${laneBg[lane.id]} ${FOCUS_RING}`}
              style={posStyle}
            >
              {body}
            </button>
          );
        })}
      </div>
    </div>
  );
}
