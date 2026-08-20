import { Fragment, useState } from "react";
import type { InboundLaneData } from "../data/types";
import { LABEL_W, MONTHS, TOTAL_W, laneById, scaleX } from "../lib/scale";

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
  // Channel lanes show total volume by default; a click splits them by channel.
  const [showChannels, setShowChannels] = useState(false);

  // ── Channel lane ─────────────────────────────────────────────────────
  if (data.channels && data.channels.length > 0) {
    const channels = data.channels;
    // Shared sample grid + nearest-to-pointer (used by both total and split).
    const grid = [...new Set(channels.flatMap((c) => c.points.map((p) => p.month)))].sort(
      (a, b) => a - b,
    );
    const hoverMonth =
      hoverX === null
        ? null
        : grid.reduce((best, m) =>
            Math.abs(scaleX(m) - hoverX) < Math.abs(scaleX(best) - hoverX) ? m : best,
          );
    const hoverLive =
      hoverMonth !== null && hoverX !== null && Math.abs(scaleX(hoverMonth) - hoverX) < 60;

    // Full by-channel figures as a text alternative (WCAG 1.1.1), rendered in
    // BOTH modes — so the visual total/split toggle is a sighted-mouse
    // convenience and no data is ever locked behind it.
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

    // ── Total mode (default): one curve summing every channel per month ──
    if (!showChannels) {
      const totals = grid.map((m) => ({
        month: m,
        value: channels.reduce((s, c) => s + (c.points.find((p) => p.month === m)?.value ?? 0), 0),
      }));
      const max = Math.max(...totals.map((t) => t.value), 1);
      const cy = (v: number) => h - 12 - (v / max) * (h - 46);
      const hoverTotal = hoverLive ? totals.find((t) => t.month === hoverMonth)?.value : undefined;
      return (
        <Fragment>
          {channelTable}
          <svg
            className="absolute left-0 z-10 cursor-pointer"
            style={{ top: lane.top }}
            width={TOTAL_W}
            height={h}
            role="img"
            aria-label={`${lane.label} total inbound enquiries over time — full figures in the table above`}
            onMouseMove={(e) => setHoverX(e.nativeEvent.offsetX)}
            onMouseLeave={() => setHoverX(null)}
            onClick={() => setShowChannels(true)}
          >
            <text x={LABEL_W + 12} y={30} className="fill-rmit-blue-interactive text-xs font-medium">
              Total enquiries · click to split by channel
            </text>
            {/* Hover teaser: the per-channel lines ghost in under the total,
                hinting at the split a click reveals. */}
            {hoverX !== null &&
              channels.map((c) =>
                splitRuns(c.points).map((run, ri) => (
                  <path
                    key={`teaser-${c.label}-${ri}`}
                    d={`M${run
                      .map((p) => `${scaleX(p.month).toFixed(1)},${cy(p.value).toFixed(1)}`)
                      .join(" L")}`}
                    fill="none"
                    stroke={`var(${c.color})`}
                    strokeWidth={1.25}
                    opacity={0.35}
                    strokeLinejoin="round"
                  />
                )),
              )}
            {splitRuns(totals).map((run, ri) => {
              const line = run
                .map((p) => `${scaleX(p.month).toFixed(1)},${cy(p.value).toFixed(1)}`)
                .join(" L");
              const base = `L${scaleX(run[run.length - 1].month).toFixed(1)},${h - 12} L${scaleX(run[0].month).toFixed(1)},${h - 12} Z`;
              return (
                <g key={ri}>
                  <path d={`M${line} ${base}`} fill="var(--color-tint-blue)" opacity={0.85} />
                  <path
                    d={`M${line}`}
                    fill="none"
                    stroke="var(--color-rmit-blue-interactive)"
                    strokeWidth={1.75}
                    strokeLinejoin="round"
                  />
                </g>
              );
            })}
            {totals.map((t) => (
              <circle
                key={t.month}
                cx={scaleX(t.month)}
                cy={cy(t.value)}
                r={hoverLive && t.month === hoverMonth ? 3.5 : 2.5}
                fill="var(--color-rmit-blue-interactive)"
              />
            ))}
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
          {hoverLive && hoverTotal !== undefined && (
            <div
              className={TIP_CLASS}
              style={{ left: Math.min(scaleX(hoverMonth!) + 10, TOTAL_W - 160), top: lane.top + 40 }}
            >
              <span className="font-semibold">{pointLabel(hoverMonth!, false)}</span>{" "}
              {hoverTotal.toLocaleString()} enquiries
            </div>
          )}
        </Fragment>
      );
    }

    // ── Split mode: one line per channel, sharing a single scale ─────────
    const max = Math.max(...channels.flatMap((c) => c.points.map((p) => p.value)), 1);
    const cy = (v: number) => h - 12 - (v / max) * (h - 46);
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
    return (
      <Fragment>
        {channelTable}
        <svg
          className="absolute left-0 z-10 cursor-pointer"
          style={{ top: lane.top }}
          width={TOTAL_W}
          height={h}
          role="img"
          aria-label={`${lane.label} inbound enquiries by channel over time — full figures in the table above`}
          onMouseMove={(e) => setHoverX(e.nativeEvent.offsetX)}
          onMouseLeave={() => setHoverX(null)}
          onClick={() => setShowChannels(false)}
        >
          {/* legend — one chip per channel, inline under the note */}
          {channels.map((c, i) => {
            const lx = LABEL_W + 12 + i * 104;
            return (
              <g key={c.label}>
                <circle cx={lx} cy={28} r={3.5} fill={`var(${c.color})`} />
                <text x={lx + 8} y={31.5} className="fill-grey-70 text-xs">
                  {c.label}
                </text>
              </g>
            );
          })}
          <text
            x={LABEL_W + 12 + channels.length * 104 + 8}
            y={31.5}
            className="fill-rmit-blue-interactive text-xs font-medium"
          >
            · click to combine
          </text>
          {/* shaded area + line per channel run */}
          {channels.map((c) =>
            splitRuns(c.points).map((run, ri) => {
              const line = run
                .map((p) => `${scaleX(p.month).toFixed(1)},${cy(p.value).toFixed(1)}`)
                .join(" L");
              const base = `L${scaleX(run[run.length - 1].month).toFixed(1)},${h - 12} L${scaleX(run[0].month).toFixed(1)},${h - 12} Z`;
              return (
                <g key={`${c.label}-${ri}`}>
                  <path d={`M${line} ${base}`} fill={`var(${c.color})`} opacity={0.1} />
                  <path
                    d={`M${line}`}
                    fill="none"
                    stroke={`var(${c.color})`}
                    strokeWidth={1.75}
                    strokeLinejoin="round"
                  />
                </g>
              );
            }),
          )}
          {/* dots on the real monthly readings */}
          {channels.map((c) =>
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
          {/* hover guide */}
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
            <span className="font-semibold">{pointLabel(hoverMonth!, false)}</span>
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
        className="absolute left-0 z-10"
        style={{ top: lane.top }}
        width={TOTAL_W}
        height={h}
        role={series ? "img" : undefined}
        aria-label={
          series
            ? `${lane.label} weekly visitors over time — full figures in the adjacent table`
            : `${lane.label} inbound engagement over time`
        }
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
