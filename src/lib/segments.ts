// The tailoring axes — the dimensions a marketing send can be segmented on.
// Opened from the DOM SL badge as a set of toggles; selecting a value focuses
// the map on comms tailored to that segment.
//
// Key rule: a BLANK field means the send isn't tailored on that axis — it goes
// to everyone — so it matches whatever value is selected. Only a comm that is
// explicitly tailored to a DIFFERENT value is filtered out. This is what makes
// "College = STEM" show the STEM variant of a split send *plus* every generic
// send, rather than only the handful of college-specific ones.

import type { Comm } from "../data/types";

export type SegmentKey = "preference" | "college" | "campus" | "eventState";

export interface SegmentAxis {
  key: SegmentKey;
  label: string;
  /** pretty labels for the raw stored values */
  labels: Record<string, string>;
}

export const SEGMENT_AXES: SegmentAxis[] = [
  {
    key: "preference",
    label: "Preference",
    labels: { "#1": "1st preference", "#2-8": "2nd–8th", none: "No preference" },
  },
  {
    key: "college",
    label: "College",
    labels: { COBL: "COBL", STEM: "STEM", DSC: "DSC", VE: "Vocational" },
  },
  {
    key: "campus",
    label: "Campus",
    labels: { bundoora: "Bundoora", city: "City", brunswick: "Brunswick", regional: "Regional" },
  },
  {
    key: "eventState",
    label: "Event stage",
    labels: {
      registered: "Registered",
      unregistered: "Not registered",
      attended: "Attended",
      "did-not-attend": "Did not attend",
    },
  },
];

/** Selected values per axis (absent or empty array = "All" for that axis).
 *  Multiple values on one axis are OR'd — e.g. Campus = [Bundoora, City]
 *  matches either. */
export type SegmentSelection = Partial<Record<SegmentKey, string[]>>;

/** Distinct values actually present in the data, per axis — so the toggles
 *  only ever offer segments that exist. Ordered by the axis's label map, then
 *  any extras. Axes with no values are dropped entirely. */
export function availableSegments(comms: Comm[]): { axis: SegmentAxis; values: string[] }[] {
  return SEGMENT_AXES.map((axis) => {
    const present = new Set<string>();
    for (const c of comms) {
      const v = c[axis.key];
      if (v) present.add(v);
    }
    const ordered = Object.keys(axis.labels).filter((v) => present.has(v));
    const extras = [...present].filter((v) => !(v in axis.labels));
    return { axis, values: [...ordered, ...extras] };
  }).filter((a) => a.values.length > 0);
}

/** True if a comm belongs to the selected segment. Within an axis the selected
 *  values are OR'd; across axes they're AND'd. A blank field on the comm counts
 *  as a match (untailored = goes to everyone). */
export function matchesSegment(comm: Comm, sel: SegmentSelection): boolean {
  for (const key of Object.keys(sel) as SegmentKey[]) {
    const want = sel[key];
    if (!want || want.length === 0) continue;
    const have = comm[key];
    if (have && !want.includes(have)) return false;
  }
  return true;
}

/** Total chips selected across all axes (drives the dock badge). */
export function segmentCount(sel: SegmentSelection): number {
  return Object.values(sel).reduce((n, arr) => n + (arr?.length ?? 0), 0);
}
