import { campaigns, inbound } from "../data/comms";
import { MOMENTS } from "../data/journey";
import type { Comm, CommType } from "../data/types";
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
  scaleX,
  type OverflowChip,
} from "../lib/scale";
import { CampaignBar } from "./CampaignBar";
import { CommCard } from "./CommCard";
import { MomentsBand, MonthBand, StageYearBands } from "./HeaderBands";
import { InboundLane } from "./InboundLane";
import { TriggerLayer } from "./TriggerLayer";

interface Props {
  comms: Comm[];
  hiddenIds: Set<string>;
  chips: OverflowChip[];
  expandedMonth: number | null;
  onToggleMonth: (monthIndex: number) => void;
  activeTypes: Set<CommType>;
  activeId: string | null;
  connected: Set<string>;
  showLines: boolean;
  activeMomentId: string | null;
  onHover: (id: string | null) => void;
  /** click on a comm opens the detail panel (attributes + comments) */
  onOpenDetail: (id: string) => void;
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
  onHover,
  onOpenDetail,
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
            className="flex items-center bg-rmit-blue px-4 text-xs font-semibold tracking-widest text-white uppercase"
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

      <div className="sticky top-0 z-40" style={{ height: MONTH_H }}>
        <div className="absolute top-0" style={{ left: LABEL_W, width: TOTAL_W }}>
          <MonthBand expandedMonth={expandedMonth} onToggleMonth={onToggleMonth} />
        </div>
        <div
          className="sticky left-0 flex h-full items-center border-r border-b border-grey-30 bg-white px-4 text-xs text-grey-60"
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
          className="sticky left-0 flex h-full items-center border-r border-b border-grey-30 bg-white px-4 text-xs text-grey-60"
          style={{ width: LABEL_W }}
        >
          Moments that matter
        </div>
      </div>

      {/* ── Scrolling canvas ── */}
      <div className="absolute top-0" style={{ left: LABEL_W, width: TOTAL_W, height: TOTAL_H }}>
        {/* Lane backgrounds — alternate shade per lane so rows are easy to
            track across the full width, skipping the divider lane. */}
        {(() => {
          let stripe = 0;
          return LANES.map((lane) => {
            const bg =
              lane.kind === "divider"
                ? "bg-grey-20"
                : stripe++ % 2 === 0
                  ? "bg-grey-10"
                  : "bg-surface";
            return (
              <div
                key={lane.id}
                className={`absolute left-0 w-full border-b border-grey-30 ${bg}`}
                style={{ top: lane.top, height: lane.height }}
              />
            );
          });
        })()}

        {/* Month gridlines (heavier at year boundaries) */}
        {Array.from({ length: MONTHS - 1 }, (_, i) => i + 1).map((m) => (
          <div
            key={m}
            className={`absolute w-px ${m % 12 === 0 ? "bg-grey-40" : "bg-grey-20"}`}
            style={{ left: scaleX(m), top: HEADER_H, height: TOTAL_H - HEADER_H }}
          />
        ))}

        {/* Day gridlines inside the expanded month */}
        {expandedMonth !== null &&
          [5, 10, 15, 20, 25, 30].map((d) => (
            <div
              key={`day-${d}`}
              className="absolute w-px bg-grey-20"
              style={{
                left: scaleX(expandedMonth + (d - 1) / 30),
                top: HEADER_H,
                height: TOTAL_H - HEADER_H,
              }}
            />
          ))}

        {/* Moments that matter. Major (flagship) moments get a solid heavy
            border so they read as landmark events, not just a guideline.
            Standard ones stay a light dashed guide. Either lights up red
            with a faint tint while focused via hover/click. */}
        {MOMENTS.map((mo) => {
          const left = scaleX(mo.from);
          const width = scaleX(mo.to) - scaleX(mo.from);
          const major = mo.tier === "major";
          const active = mo.id === activeMomentId;
          const border = active
            ? "border-x-2 border-rmit-red bg-rmit-red/5"
            : major
              ? "border-x-2 border-rmit-blue"
              : "border-x border-dashed border-grey-40";
          return (
            <div
              key={mo.id}
              className={`absolute z-10 transition-colors ${border}`}
              style={{ left, width, top: HEADER_H, height: TOTAL_H - HEADER_H }}
            />
          );
        })}

        {/* Marketing always-on campaigns */}
        {campaigns.map((c, i) => (
          <CampaignBar key={c.id} campaign={c} index={i} />
        ))}

        {/* Inbound engagement curves */}
        {inbound.map((d) => (
          <InboundLane key={d.id} data={d} />
        ))}

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
                onHover={onHover}
                onOpenDetail={onOpenDetail}
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
            className="absolute z-10 flex items-center rounded-full border border-grey-30 bg-white px-2 text-xs font-medium whitespace-nowrap text-rmit-blue-interactive hover:border-rmit-blue-interactive"
            style={{
              left: Math.min(scaleX(chip.monthIndex) + 4, TOTAL_W - 80),
              top: chipY(chip.team),
              height: CHIP_H,
            }}
            title="Expand this month to a day-by-day view"
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
        {(() => {
          let stripe = 0;
          return LANES.map((lane) => {
            const bg =
              lane.kind === "divider"
                ? "bg-grey-20"
                : stripe++ % 2 === 0
                  ? "bg-grey-10"
                  : "bg-surface";
            // Outbound lanes grow with however many rows the data needs —
            // centering the label in a lane that's grown very tall would
            // strand it far from the visible cards, so those anchor to the
            // top instead. Inbound/divider lanes have a fixed height, so
            // centering still reads fine there.
            const alignment =
              lane.kind === "outbound" ? "justify-start pt-3.5" : "justify-center";
            return (
              <div
                key={lane.id}
                className={`absolute left-0 flex w-full flex-col ${alignment} border-b border-grey-30 px-4 ${bg}`}
                style={{ top: lane.top - HEADER_H, height: lane.height }}
              >
                <span
                  className={`text-xs font-semibold tracking-widest uppercase ${
                    lane.kind === "divider" ? "text-grey-70" : "text-rmit-blue"
                  }`}
                >
                  {lane.label}
                </span>
                {lane.sub && <span className="mt-0.5 text-xs text-grey-60">{lane.sub}</span>}
              </div>
            );
          });
        })()}
      </div>
    </div>
  );
}
