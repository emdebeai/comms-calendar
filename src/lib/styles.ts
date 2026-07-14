// Shared Tailwind utility strings so a single treatment is defined once and
// reused everywhere, instead of being re-typed (and drifting) per component.

// Keyboard focus indicator. Box-shadow based (a `ring`, not an `outline`) so
// it isn't clipped by the timeline's `overflow-auto` scroller when a focused
// card sits at the viewport edge.
export const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rmit-blue-interactive focus-visible:ring-offset-1 focus-visible:ring-offset-white";

// Eyebrow / overline label treatment (small, bold, wide-tracked, uppercase).
export const EYEBROW = "text-xs font-semibold tracking-widest uppercase";
