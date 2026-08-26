// Shared Tailwind utility strings so a single treatment is defined once and
// reused everywhere, instead of being re-typed (and drifting) per component.

// Keyboard focus indicator. Box-shadow based (a `ring`, not an `outline`) so
// it isn't clipped by the timeline's `overflow-auto` scroller when a focused
// card sits at the viewport edge.
export const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rmit-blue-interactive focus-visible:ring-offset-1 focus-visible:ring-offset-surface";

// Eyebrow / overline label treatment (small, bold, wide-tracked, uppercase).
export const EYEBROW = "text-xs font-semibold tracking-widest uppercase";

// Dimming levels (reference — components inline these values): a TRANSIENT
// spotlight dim at 0.15 quiets everything hard so the lit items own the view,
// while the PERSISTENT filtered-out ghost sits below it at 0.08 — hidden-by-
// lens must still "never read as doesn't exist".
export const DIM_FOCUS = "opacity-[0.15]";
export const DIM_FILTERED = "opacity-[0.08]";
