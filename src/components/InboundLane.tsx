import { Fragment, useState } from "react";
import type { InboundLaneData } from "../data/types";
import { MONTHS, TOTAL_W, laneById, scaleX } from "../lib/scale";
import { PRINT_MODE } from "../lib/printMode";
import { FOCUS_RING } from "../lib/styles";

// Engagement volume at a given month: baseline plus gaussian bumps per peak.
// (Legacy synthetic mode — only used when a lane has no measured series.)
function volumeAt(data: InboundLaneData, m: number): number {
  return data.peaks.reduce(
    (v, p) => v + p.height * Math.exp(-(((m - p.month) / 0.9) ** 2)),
    data.baseline,
  );
}

const CAL = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "w/c 19 Jul" for a weekly point, "Jul" for a mid-month one. */
function pointLabel(month: number, weekly: boolean): string {
  const name = CAL[Math.floor(month) % 12];
  if (!weekly) return name;
  const day = Math.round((month - Math.floor(month)) * 30) + 1;
  return `w/c ${day} ${name}`;
}

const TIP_CLASS =
  "pointer-events-none absolute z-50 rounded-md bg-tooltip px-2 py-1 text-xs whitespace-nowrap text-white shadow-md";

/** Split points into contiguous runs — a gap of more than 1.5 months breaks
 *  the line (e.g. the Feb → Aug hole in the Study@RMIT extract). */
function splitRuns<T extends { month: number }>(pts: T[]): T[][] {
  const sorted = [...pts].sort((a, b) => a.month - b.month);
  const out: T[][] = [];
  let cur: T[] = [];
  for (const p of sorted) {
    if (cur.length && p.month - cur[cur.length - 1].month > 1.5) {
      out.push(cur);
      cur = [];
    }
    cur.push(p);
  }
  if (cur.length) out.push(cur);
  return out;
}

export function InboundLane({ data }: { data: InboundLaneData }) {
  const lane = laneById(data.id);
  const h = lane.height;
  const yFor = (v: number) => h - 10 - (Math.min(v, 100) / 100) * (h - 34);
  // Hovered sample x (canvas px) — null when the pointer is off the lane.
  const [hoverX, setHoverX] = useState<number | null>(null);

  // ── Channel lane: the total curve at rest, the full per-channel
  // breakdown while hovering (one shared scale, so the channel lines sit
  // honestly inside the total they sum to). ──────────────────────────────
  if (data.channels && data.channels.length > 0) {
    const channels = data.channels;
    const grid = [...new Set(channels.flatMap((c) => c.points.map((p) => p.month)))].sort(
      (a, b) => a - b,
    );
    const totals = grid.map((m) => ({
      month: m,
      value: channels.reduce((s, c) => s + (c.points.find((p) => p.month === m)?.value ?? 0), 0),
    }));
    const max = Math.max(...totals.map((t) => t.value), 1);
    const cy = (v: number) => h - 12 - (v / max) * (h - 46);
    const hovering = hoverX !== null;
    const hoverMonth = hovering
      ? grid.reduce((best, m) =>
          Math.abs(scaleX(m) - hoverX!) < Math.abs(scaleX(best) - hoverX!) ? m : best,
        )
      : null;
    const hoverLive = hoverMonth !== null && Math.abs(scaleX(hoverMonth) - hoverX!) < 60;
    const hoverTotal = hoverLive ? totals.find((t) => t.month === hoverMonth)?.value : undefined;
    const tipRows = hoverLive
      ? channels
          .map((c) => ({
            label: c.label,
            color: c.color,
            value: c.points.find((p) => p.month === hoverMonth)?.value,
          }))
          .filter((r) => r.value !== undefined)
          .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
      : [];

    // Full by-channel figures as a text alternative (WCAG 1.1.1) — the hover
    // breakdown is a sighted-mouse convenience, never the only route in.
    const channelTable = (
      <table className="sr-only">
        <caption>{lane.label} inbound enquiries per month, by channel</caption>
        <thead>
          <tr>
            <th scope="col">Channel</th>
            {grid.map((m) => (
              <th key={m} scope="col">
                {pointLabel(m, false)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {channels.map((c) => (
            <tr key={c.label}>
              <th scope="row">{c.label}</th>
              {grid.map((m) => (
                <td key={m}>{c.points.find((p) => p.month === m)?.value ?? "no data"}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );

    return (
      <Fragment>
        {channelTable}
        <svg
          className={`absolute left-0 z-10 ${FOCUS_RING}`}
          style={{ top: lane.top }}
          width={TOTAL_W}
          height={h}
          role="img"
          aria-label={`${lane.label} inbound enquiries over time — arrow keys step through the monthly breakdown; full per-channel figures in the table above`}
          // Keyboard route to the hover breakdown (2.1.1): focus the graph,
          // arrows step the crosshair month-by-month, Esc clears it.
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setHoverX(null);
              return;
            }
            if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
            e.preventDefault();
            const cur =
              hoverX === null
                ? null
                : grid.reduce((best, m) =>
                    Math.abs(scaleX(m) - hoverX) < Math.abs(scaleX(best) - hoverX) ? m : best,
                  );
            const idx = cur === null ? 0 : grid.indexOf(cur) + (e.key === "ArrowRight" ? 1 : -1);
            const next = grid[Math.min(grid.length - 1, Math.max(0, idx))];
            setHoverX(scaleX(next));
          }}
          onBlur={() => setHoverX(null)}
          // offsetX is relative to whatever child (a dot, a line, the tooltip)
          // is under the cursor, so it jumps as you move — measure against the
          // svg itself for a stable x.
          onMouseMove={(e) =>
            setHoverX(e.clientX - e.currentTarget.getBoundingClientRect().left)
          }
          onMouseLeave={() => setHoverX(null)}
        >
          {/* Title + legend anchor at the START OF THE DATA (the Study@RMIT
              series only covers the application season), not the canvas
              origin — at LABEL_W they'd float over months of empty lane,
              nowhere near the curves they describe. */}
          <text
            x={scaleX(grid[0]) + 4}
            y={16}
            className="fill-rmit-blue-interactive text-xs font-medium"
          >
            {hovering
              ? "Enquiries by channel"
              : PRINT_MODE
                ? "Total enquiries"
                : "Total enquiries · hover for the channel breakdown"}
          </text>
          {/* legend while the breakdown is showing */}
          {hovering &&
            channels.map((c, i) => {
              const lx = scaleX(grid[0]) + 4 + i * 104;
              return (
                <g key={c.label}>
                  <circle cx={lx} cy={30} r={3.5} fill={`var(${c.color})`} />
                  <text x={lx + 8} y={33.5} className="fill-grey-70 text-xs">
                    {c.label}
                  </text>
                </g>
              );
            })}
          {/* total: filled curve at rest, thin context line during hover */}
          {splitRuns(totals).map((run, ri) => {
            const line = run
              .map((p) => `${scaleX(p.month).toFixed(1)},${cy(p.value).toFixed(1)}`)
              .join(" L");
            const base = `L${scaleX(run[run.length - 1].month).toFixed(1)},${h - 12} L${scaleX(run[0].month).toFixed(1)},${h - 12} Z`;
            return (
              <g key={ri}>
                {!hovering && <path d={`M${line} ${base}`} fill="var(--color-tint-blue)" opacity={0.85} />}
                <path
                  d={`M${line}`}
                  fill="none"
                  stroke="var(--color-rmit-blue-interactive)"
                  strokeWidth={hovering ? 1 : 1.75}
                  opacity={hovering ? 0.45 : 1}
                  strokeLinejoin="round"
                />
              </g>
            );
          })}
          {!hovering &&
            totals.map((t) => (
              <circle
                key={t.month}
                cx={scaleX(t.month)}
                cy={cy(t.value)}
                r={2.5}
                fill="var(--color-rmit-blue-interactive)"
              />
            ))}
          {/* what's driving the peaks — labelled dots on the total curve, like
              the Digital lane (at rest only, so they don't fight the breakdown) */}
          {!hovering &&
            data.peaks
              .filter((p) => p.label)
              .map((p) => {
                const t = totals.find((tt) => tt.month === p.month);
                if (!t) return null;
                const py = cy(t.value);
                const lx = Math.min(Math.max(scaleX(p.month), 60), TOTAL_W - 90);
                return (
                  <g key={`peak-${p.month}`}>
                    <circle cx={scaleX(p.month)} cy={py} r={3.5} fill="var(--color-rmit-blue)" />
                    <text
                      x={lx}
                      y={py - 8}
                      textAnchor="middle"
                      className="fill-grey-90 text-xs font-medium"
                    >
                      {p.label}
                    </text>
                  </g>
                );
              })}
          {/* the breakdown */}
          {hovering &&
            channels.map((c) =>
              splitRuns(c.points).map((run, ri) => (
                <path
                  key={`${c.label}-${ri}`}
                  d={`M${run
                    .map((p) => `${scaleX(p.month).toFixed(1)},${cy(p.value).toFixed(1)}`)
                    .join(" L")}`}
                  fill="none"
                  stroke={`var(${c.color})`}
                  strokeWidth={1.75}
                  strokeLinejoin="round"
                />
              )),
            )}
          {hovering &&
            channels.map((c) =>
              c.points.map((p) => (
                <circle
                  key={`${c.label}-${p.month}`}
                  cx={scaleX(p.month)}
                  cy={cy(p.value)}
                  r={hoverLive && p.month === hoverMonth ? 3 : 2}
                  fill={`var(${c.color})`}
                />
              )),
            )}
          {hoverLive && (
            <line
              x1={scaleX(hoverMonth!)}
              x2={scaleX(hoverMonth!)}
              y1={38}
              y2={h - 12}
              stroke="var(--color-grey-40)"
              strokeDasharray="3 3"
            />
          )}
        </svg>
        {hoverLive && tipRows.length > 0 && (
          <div
            className={TIP_CLASS}
            style={{
              left: Math.min(scaleX(hoverMonth!) + 10, TOTAL_W - 150),
              top: lane.top + 34,
            }}
          >
            <span className="font-semibold">
              {pointLabel(hoverMonth!, false)}
              {hoverTotal !== undefined ? ` — ${hoverTotal.toLocaleString()} total` : ""}
            </span>
            {tipRows.map((r) => (
              <span key={r.label} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: `var(${r.color})` }}
                />
                {r.label} — {r.value}
              </span>
            ))}
          </div>
        )}
      </Fragment>
    );
  }

  // ── Single-curve mode (measured series, or legacy synthetic) ─────────
  const series = data.series && data.series.length > 1 ? data.series : null;
  const seriesMax = series ? Math.max(...series.map((p) => p.value)) : 1;
  const seriesVolumeAt = (m: number): number => {
    if (!series) return 0;
    if (m <= series[0].month) return (series[0].value / seriesMax) * 100;
    for (let i = 1; i < series.length; i++) {
      const a = series[i - 1];
      const b = series[i];
      if (m <= b.month) {
        const t = (m - a.month) / (b.month - a.month);
        return ((a.value + (b.value - a.value) * t) / seriesMax) * 100;
      }
    }
    return (series[series.length - 1].value / seriesMax) * 100;
  };
  const volAt = (m: number) => (series ? seriesVolumeAt(m) : volumeAt(data, m));

  const step = 0.25;
  const from = series ? series[0].month : 0;
  const to = series ? series[series.length - 1].month : MONTHS;
  const pts: string[] = [];
  for (let m = from; m <= to; m += step) {
    pts.push(`${scaleX(m).toFixed(1)},${yFor(volAt(m)).toFixed(1)}`);
  }
  const x0 = scaleX(from);
  const x1 = series ? scaleX(to) : TOTAL_W;
  const path = `M${x0.toFixed(1)},${h} L${pts.join(" L")} L${x1.toFixed(1)},${h} Z`;
  const line = `M${pts.join(" L")}`;

  // Nearest measured point to the pointer (series mode only).
  const hoverPt =
    series && hoverX !== null
      ? series.reduce((best, p) =>
          Math.abs(scaleX(p.month) - hoverX) < Math.abs(scaleX(best.month) - hoverX) ? p : best,
        )
      : null;
  const hoverLive =
    hoverPt !== null && hoverX !== null && Math.abs(scaleX(hoverPt.month) - hoverX) < 40;

  const peak = series ? series.reduce((a, b) => (b.value > a.value ? b : a)) : null;
  return (
    <Fragment>
      {series && peak && (
        <table className="sr-only">
          <caption>
            {lane.label} weekly visitors — peak {peak.value.toLocaleString()} in the week of{" "}
            {pointLabel(peak.month, true).replace("w/c ", "")}
          </caption>
          <thead>
            <tr>
              <th scope="col">Week commencing</th>
              <th scope="col">Visitors</th>
            </tr>
          </thead>
          <tbody>
            {series.map((p) => (
              <tr key={p.month}>
                <th scope="row">{pointLabel(p.month, true)}</th>
                <td>{p.value.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <svg
        className={`absolute left-0 z-10 ${series ? FOCUS_RING : ""}`}
        style={{ top: lane.top }}
        width={TOTAL_W}
        height={h}
        role={series ? "img" : undefined}
        aria-label={
          series
            ? `${lane.label} weekly visitors over time — arrow keys step through the readings; full figures in the adjacent table`
            : `${lane.label} inbound engagement over time`
        }
        // Keyboard route to the hover crosshair (2.1.1), series mode only.
        tabIndex={series ? 0 : undefined}
        onKeyDown={
          series
            ? (e) => {
                if (e.key === "Escape") {
                  setHoverX(null);
                  return;
                }
                if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
                e.preventDefault();
                const idx =
                  hoverPt === null
                    ? 0
                    : series.indexOf(hoverPt) + (e.key === "ArrowRight" ? 1 : -1);
                const next = series[Math.min(series.length - 1, Math.max(0, idx))];
                setHoverX(scaleX(next.month));
              }
            : undefined
        }
        onBlur={series ? () => setHoverX(null) : undefined}
        onMouseMove={series ? (e) => setHoverX(e.nativeEvent.offsetX) : undefined}
        onMouseLeave={series ? () => setHoverX(null) : undefined}
      >
        <path d={path} fill="var(--color-tint-blue)" opacity={0.85} />
        <path d={line} fill="none" stroke="var(--color-rmit-blue-interactive)" strokeWidth={1.5} />
        {hoverLive && (
          <g>
            <line
              x1={scaleX(hoverPt!.month)}
              x2={scaleX(hoverPt!.month)}
              y1={22}
              y2={h - 10}
              stroke="var(--color-grey-40)"
              strokeDasharray="3 3"
            />
            <circle
              cx={scaleX(hoverPt!.month)}
              cy={yFor((hoverPt!.value / seriesMax) * 100)}
              r={3.5}
              fill="var(--color-rmit-blue)"
            />
          </g>
        )}
        {data.peaks
          .filter((p) => p.label)
          .map((p) => {
            const x = Math.min(Math.max(scaleX(p.month), 50), TOTAL_W - 90);
            const y = yFor(volAt(p.month));
            return (
              <g key={`${p.month}`}>
                <circle cx={scaleX(p.month)} cy={y} r={3} fill="var(--color-rmit-blue)" />
                <text x={x} y={y - 8} textAnchor="middle" className="fill-grey-90 text-xs font-medium">
                  {p.label}
                </text>
              </g>
            );
          })}
      </svg>
      {hoverLive && (
        <div
          className={TIP_CLASS}
          style={{
            left: Math.min(scaleX(hoverPt!.month) + 10, TOTAL_W - 160),
            top: lane.top + 20,
          }}
        >
          <span className="font-semibold">{pointLabel(hoverPt!.month, true)}</span>{" "}
          {hoverPt!.value.toLocaleString()} visitors
        </div>
      )}
    </Fragment>
  );
}
