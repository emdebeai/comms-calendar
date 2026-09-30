import type { ReactNode } from "react";
import { MousePointerClick, Users, type LucideIcon } from "lucide-react";
import { markerAccent } from "../lib/designConfig";

// The chip's look, shared by the map's CommCard and the campaign page's
// cards: tinted fill, full-colour left accent, icon column, title, optional
// audience and CTA lines, then whatever the caller adds (lead-gen badge, a
// judged number). Positioning, hover state and the button itself stay with
// the caller — this is only what's inside.

export interface ChipColors {
  chip: string;
  text: string;
  accent: string;
}

/** Container classes for a chip: tinted RMIT fill, or the dashed "not us"
 *  outline for an external sender. */
export function chipClasses(colors: ChipColors, external = false): { chip: string; text: string } {
  return external
    ? { chip: "rounded-md border border-dashed border-grey-60 bg-grey-10", text: "text-grey-80" }
    : { chip: `rounded-l-none rounded-r-md ${colors.chip}`, text: colors.text };
}

interface Props {
  Icon: LucideIcon;
  colors: ChipColors;
  external?: boolean;
  title: ReactNode;
  /** audience split label (Users icon) */
  variant?: string;
  cta?: string;
  /** rows under the CTA line — badges, numbers */
  children?: ReactNode;
  /** right-hand column — trigger/feedback icons, a bar's number */
  trailing?: ReactNode;
  /** one-line form for full-width bars: title truncates, no CTA line */
  bar?: boolean;
}

export function ChipBody({ Icon, colors, external = false, title, variant, cta, children, trailing, bar = false }: Props) {
  const { text } = chipClasses(colors, external);
  return (
    <>
      {/* left-edge accent — full-colour strip flush on the flat left edge
          that a date stem continues into seamlessly. External cards drop it:
          the dashed outline is their marker. */}
      {!external && (
        <span aria-hidden className={`absolute inset-y-0 left-0 w-[1.25px] ${markerAccent(colors.accent, "line")}`} />
      )}
      <span className={`mt-px shrink-0 ${text}`}>
        <Icon size={13} strokeWidth={2} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-xs font-semibold leading-tight ${bar ? "truncate" : "line-clamp-2"} ${text}`}>{title}</span>
        {variant && (
          <span className="mt-0.5 flex items-center gap-1 text-xs leading-tight text-grey-80">
            <Users size={10} strokeWidth={2} className="shrink-0" aria-hidden />
            <span className="truncate">{variant}</span>
          </span>
        )}
        {!bar && cta && (
          <span className="mt-0.5 flex items-center gap-1 text-xs leading-tight text-grey-80">
            <MousePointerClick size={10} strokeWidth={2} className="shrink-0" aria-hidden />
            <span className="truncate">{cta}</span>
          </span>
        )}
        {children}
      </span>
      {trailing}
    </>
  );
}
