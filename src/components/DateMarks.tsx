import type { CSSProperties } from "react";

// The map's date marks, shared with the campaign page: a dot on the lane
// baseline at the exact date, and the thin stem from it down to the card's
// left edge — so dot → stem → card accent is one continuous line.

export function DateDot({ accent, dim, style, title }: { accent: string; dim?: string; style: CSSProperties; title?: string }) {
  return (
    <span
      aria-hidden
      title={title}
      className={`absolute z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card transition-opacity duration-300 ${accent} ${dim ?? ""}`}
      style={style}
    />
  );
}

export function Stem({ accent, dim, style }: { accent: string; dim?: string; style: CSSProperties }) {
  return <span aria-hidden className={`absolute w-[1.25px] transition-opacity duration-300 ${accent} ${dim ?? ""}`} style={style} />;
}
