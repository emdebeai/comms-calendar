/** Instant hover tooltip — the same fast, on-brand bubble the comm markers
 *  use, replacing slow native `title=` tooltips. The parent must be
 *  `group relative`; the accessible name still comes from the parent's
 *  aria-label, so this bubble is aria-hidden (a sighted-user convenience).
 *  Sits ABOVE its trigger, which suits the bottom-pinned control dock. */
export function HoverTip({ label, align = "center" }: { label: string; align?: "center" | "right" }) {
  return (
    <span
      aria-hidden
      // normal-case + tracking-normal: never inherit an uppercase chip's
      // label styling. align="right" keeps tips on-screen for controls
      // hugging the right edge.
      className={`pointer-events-none absolute bottom-full z-50 mb-2 hidden rounded-md bg-tooltip px-2 py-1 text-xs font-normal normal-case tracking-normal whitespace-nowrap text-white shadow-md group-hover:block group-focus-within:block ${
        align === "right" ? "right-0" : "left-1/2 -translate-x-1/2"
      }`}
    >
      {label}
    </span>
  );
}
