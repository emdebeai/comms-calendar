// ─────────────────────────────────────────────────────────────────────────
// Reversible design decisions.
//
// Every flag here is a subjective call made during the "subtract" pass. Each
// one is applied through this module ONLY, so flipping a value below fully
// restores the previous look — no need to hunt through components.
// ─────────────────────────────────────────────────────────────────────────

export const DESIGN = {
  /**
   * Neutral markers. The date dot, its stem, and the card's left-edge accent
   * render in grey instead of the comm's type colour — so type is read from
   * the chip fill alone and the canvas is calmer (colour is freed up for the
   * moment bands and the focus-trace lines).
   *   true  → grey markers (the calmer, subtracted look)
   *   false → type-coloured dot / stem / edge (current — bolder token look)
   */
  neutralMarkers: false,

  /**
   * Student-experience band starts expanded — it's the tool's key comparison
   * ("do the comms answer what students are asking?"), so it leads rather
   * than hiding behind a toggle.
   *   true  → open on load
   *   false → collapsed on load (the previous default)
   */
  experienceOpenByDefault: true,
} as const;

// Neutral marker colours when DESIGN.neutralMarkers is on. Dot slightly
// darker than the line so it still reads as the "head" of the marker.
const NEUTRAL_DOT = "bg-grey-50";
const NEUTRAL_LINE = "bg-grey-40";

/** Colour class for a marker part, honouring the neutralMarkers flag.
 *  `typeAccent` is the comm type's solid colour (COMM_COLORS[type].accent). */
export function markerAccent(typeAccent: string, part: "dot" | "line"): string {
  if (!DESIGN.neutralMarkers) return typeAccent;
  return part === "dot" ? NEUTRAL_DOT : NEUTRAL_LINE;
}
