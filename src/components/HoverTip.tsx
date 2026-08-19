/** Instant hover tooltip — the same fast, on-brand bubble the comm markers
 *  use, replacing slow native `title=` tooltips. The parent must be
 *  `group relative`; the accessible name still comes from the parent's
 *  aria-label, so this bubble is aria-hidden (a sighted-user convenience).
 *  Sits ABOVE its trigger, which suits the bottom-pinned control dock. */
export function HoverTip({ label }: { label: string }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-tooltip px-2 py-1 text-xs font-normal text-white shadow-md group-hover:block"
    >
      {label}
    </span>
  );
}
