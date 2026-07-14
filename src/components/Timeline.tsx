import { campaignGroup, inbound } from "../data/comms";
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
import { COMM_COLORS } from "./icons";
import { CampaignBar } from "./CampaignBar";
import { CommCard } from "./CommCard";
import { MomentsBand, MonthBand, StageYearBands } from "./HeaderBands";
import { InboundLane } from "./InboundLane";
import { StudentExperienceBand } from "./StudentExperienceBand";
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
  /** student-experience band under the stage header */
  experienceOpen: boolean;
  onToggleExperience: () => void;
  /** media-schedule group bar in the Marketing lane */
  campaignsOpen: boolean;
  onToggleCampaigns: () => void;
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
  experienceOpen,
  onToggleExperience,
  campaignsOpen,
  onToggleCampaigns,
  onOpenCampaign,
  onHover,
  onOpenDetail,
  onMeasure,
  onClearFocus,
  onHoverMoment,
  onPinMoment,
  feedbackCount,
}: Props) {
  // Moment focus takes priority over trigger focus. Trigger focus only
  // kicks in when the hovered comm actually has connections — otherwise
  // hovering an unconnected comm would needlessly dim everything.
  const momentCommIds = activeMomentId
    ? new Set(comms.filter((c) => c.momentId === activeMomentId).map((c) => c.id))
    : null;
  const triggerFocusActive = activeId !== null && connected.size > 0;
  const focusSet =
    momentCommIds ?? (triggerFocusActive ? new Set([activeId as string, ...connected]) : null);

  // Which outbound lanes have no comms at all — so we can label them "none
  // mapped yet" instead of leaving a blank stripe that reads as a load error.
  const teamsWithComms = new Set(comms.map((c) => c.team));

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
            className={`flex items-center bg-rmit-blue px-4 text-white ${EYEBROW}`}
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

      {/* ── Student experience layer — collapsible, under the stage rows ── */}
      <StudentExperienceBand open={experienceOpen} onToggle={onToggleExperience} />

      <div className="sticky top-0 z-40" style={{ height: MONTH_H }}>
        <div className="absolute top-0" style={{ left: LABEL_W, width: TOTAL_W }}>
          <MonthBand expandedMonth={expandedMonth} onToggleMonth={onToggleMonth} />
        </div>
        <div
          className="sticky left-0 flex h-full items-center border-r border-b border-grey-30 bg-white px-4 text-xs text-grey-70"
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
          className="sticky left-0 flex h-full items-center border-r border-b border-grey-30 bg-white px-4 text-xs text-grey-70"
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

        {/* Week (level 1) or day (level 2) gridlines inside the expanded month */}
        {expandedMonth !== null &&
          (expandedMonth.level === 1 ? [8, 15, 22, 29] : [5, 10, 15, 20, 25, 30]).map((d) => (
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
                active ? "border-rmit-red bg-rmit-red/5" : "border-grey-30 bg-grey-90/[0.03]"
              }`}
              style={{ left, width, top: HEADER_H, height: TOTAL_H - HEADER_H }}
            />
          );
        })}

        {/* Media schedule — summary bar, expandable to per-channel bars */}
        <CampaignBar
          campaign={{
            id: campaignGroup.id,
            title: `${campaignGroup.title} — ${campaignGroup.channels.length} channels`,
            channel: "group",
            from: campaignGroup.from,
            to: campaignGroup.to,
          }}
          index={0}
          expanded={campaignsOpen}
          onToggle={onToggleCampaigns}
        />
        {campaignsOpen &&
          campaignGroup.channels.map((c, i) => (
            <CampaignBar key={c.id} campaign={c} index={i + 1} onOpen={onOpenCampaign} />
          ))}

        {/* Inbound engagement curves */}
        {inbound.map((d) => (
          <InboundLane key={d.id} data={d} />
        ))}

        {/* Date dots — every comm's exact send date on its lane's baseline
            strip, INCLUDING comms folded into a "+N more" chip, so the true
            density of a cluster is always visible. */}
        {comms.map((c) => {
          const filteredOut = !activeTypes.has(c.type);
          const inFocus = focusSet ? focusSet.has(c.id) : false;
          const dotDimmed = filteredOut || (focusSet !== null && !inFocus);
          // Centre the dot on the 3px spine (card left edge + accent strip),
          // so dot, stem and card edge share one axis.
          return (
            <span
              key={`dot-${c.id}`}
              aria-hidden
              className={`absolute z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white transition-opacity ${markerAccent(
                COMM_COLORS[c.type].accent,
                "dot",
              )} ${dotDimmed ? "opacity-15" : ""}`}
              style={{ left: commPos(c).x + 0.75, top: dotY(c.team) }}
            />
          );
        })}

        {/* Thin stems tying each visible chip back to its date dot */}
        {comms
          .filter((c) => !hiddenIds.has(c.id))
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
          .filter((c) => !hiddenIds.has(c.id))
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
        {chips.map((chip) => (
          <button
            key={`${chip.team}-${chip.monthIndex}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleMonth(chip.monthIndex);
            }}
            className={`absolute z-10 flex items-center rounded-full border border-grey-30 bg-white px-2 text-xs font-medium whitespace-nowrap text-rmit-blue-interactive hover:border-rmit-blue-interactive ${FOCUS_RING}`}
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

        <TriggerLayer comms={comms} hiddenIds={hiddenIds} activeId={activeId} showAll={showLines} />
      </div>

      {/* ── Sticky team gutter ── */}
      <div
        className="sticky left-0 z-30 border-r border-grey-30 bg-surface"
        style={{ width: LABEL_W, height: TOTAL_H - HEADER_H }}
      >
        {LANES.map((lane) => {
          // Outbound lanes grow with however many rows the data needs —
          // centering the label in a lane that's grown very tall would
          // strand it far from the visible cards, so those anchor to the
          // top instead. Inbound/divider lanes have a fixed height, so
          // centering still reads fine there.
          const alignment =
            lane.kind === "outbound" ? "justify-start pt-3.5" : "justify-center";
          const isEmpty = lane.kind === "outbound" && !teamsWithComms.has(lane.id as Team);
          return (
            <div
              key={lane.id}
              className={`absolute left-0 flex w-full flex-col ${alignment} border-b border-grey-30 px-4 ${laneBg[lane.id]}`}
              style={{ top: lane.top - HEADER_H, height: lane.height }}
            >
              <span
                className={`${EYEBROW} ${
                  lane.kind === "divider" ? "text-grey-70" : "text-rmit-blue"
                }`}
              >
                {lane.label}
              </span>
              {lane.sub && <span className="mt-0.5 text-xs text-grey-70">{lane.sub}</span>}
              {isEmpty && (
                <span className="mt-1 text-xs text-grey-70 italic">No comms mapped yet</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
