import type { SegmentAxis, SegmentSelection } from "../lib/segments";
import { FOCUS_RING } from "../lib/styles";

interface Props {
  /** axes that actually have values in the loaded data */
  axes: { axis: SegmentAxis; values: string[] }[];
  selection: SegmentSelection;
  /** comms explicitly tagged with each value (axis key → value → count) —
   *  shows where tailoring effort is actually going before you click */
  counts: Record<string, Record<string, number>>;
  onSelect: (key: SegmentAxis["key"], value: string | null) => void;
  onClearAll: () => void;
}

/** The tailoring-axis toggles, revealed under the DOM SL badge. One row per
 *  axis (Preference, College, Campus, Event stage); picking a chip focuses the
 *  map on that segment — a send tailored to a different value dims, while
 *  untailored ("goes to everyone") sends stay lit. This is also what untangles
 *  the look-alike stacks: pick College → only that college's variant of a
 *  split send stays up. */
export function SegmentToggles({ axes, selection, counts, onSelect, onClearAll }: Props) {
  const anyActive = Object.values(selection).some(Boolean);
  const chip =
    "rounded-full px-2.5 py-1 text-xs font-medium transition-colors " + FOCUS_RING;

  return (
    <div className="max-w-3xl rounded-xl border border-grey-30 bg-card p-3.5 shadow-xl">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-xs text-grey-70">
          Focus the map on a segment. Sends that go to everyone stay visible.
        </span>
        {anyActive && (
          <button
            type="button"
            onClick={onClearAll}
            className={`rounded-md px-2 py-0.5 text-xs font-medium text-rmit-blue-interactive hover:bg-tint-blue/50 ${FOCUS_RING}`}
          >
            Clear all
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        {axes.map(({ axis, values }) => {
          const active = selection[axis.key] ?? [];
          return (
            <div key={axis.key} className="flex flex-wrap items-center gap-1.5">
              <span className="w-24 shrink-0 text-xs font-semibold text-grey-90">
                {axis.label}
              </span>
              <button
                type="button"
                onClick={() => onSelect(axis.key, null)}
                aria-pressed={active.length === 0}
                className={`${chip} ${
                  active.length === 0 ? "bg-header text-white" : "text-grey-70 hover:bg-grey-20"
                }`}
              >
                All
              </button>
              {values.map((v) => {
                const on = active.includes(v);
                const count = counts[axis.key]?.[v];
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => onSelect(axis.key, v)}
                    aria-pressed={on}
                    className={`${chip} ${
                      on
                        ? "bg-tint-blue text-rmit-blue ring-1 ring-rmit-blue-interactive"
                        : "bg-grey-10 text-grey-80 hover:bg-grey-20"
                    }`}
                  >
                    {axis.labels[v] ?? v}
                    {count !== undefined && (
                      <span className={`ml-1 ${on ? "text-rmit-blue/60" : "text-grey-60"}`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
