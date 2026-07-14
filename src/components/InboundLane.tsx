import type { InboundLaneData } from "../data/types";
import { MONTHS, TOTAL_W, laneById, scaleX } from "../lib/scale";

// Engagement volume at a given month: baseline plus gaussian bumps per peak.
function volumeAt(data: InboundLaneData, m: number): number {
  return data.peaks.reduce(
    (v, p) => v + p.height * Math.exp(-(((m - p.month) / 0.9) ** 2)),
    data.baseline,
  );
}

export function InboundLane({ data }: { data: InboundLaneData }) {
  const lane = laneById(data.id);
  const h = lane.height;
  const yFor = (v: number) => h - 10 - (Math.min(v, 100) / 100) * (h - 34);

  const step = 0.25;
  const pts: string[] = [];
  for (let m = 0; m <= MONTHS; m += step) {
    pts.push(`${scaleX(m).toFixed(1)},${yFor(volumeAt(data, m)).toFixed(1)}`);
  }
  const path = `M0,${h} L${pts.join(" L")} L${TOTAL_W},${h} Z`;
  const line = `M${pts.join(" L")}`;

  return (
    <svg
      className="absolute left-0 z-10"
      style={{ top: lane.top }}
      width={TOTAL_W}
      height={h}
      aria-label={`${lane.label} inbound engagement over time`}
    >
      <path d={path} fill="var(--color-tint-blue)" opacity={0.85} />
      <path
        d={line}
        fill="none"
        stroke="var(--color-rmit-blue-interactive)"
        strokeWidth={1.5}
      />
      {data.peaks
        .filter((p) => p.label)
        .map((p) => {
          const x = Math.min(Math.max(scaleX(p.month), 50), TOTAL_W - 90);
          const y = yFor(volumeAt(data, p.month));
          return (
            <g key={`${p.month}`}>
              <circle
                cx={scaleX(p.month)}
                cy={y}
                r={3}
                fill="var(--color-rmit-blue)"
              />
              <text
                x={x}
                y={y - 8}
                textAnchor="middle"
                className="fill-grey-90 text-xs font-medium"
              >
                {p.label}
              </text>
            </g>
          );
        })}
    </svg>
  );
}
