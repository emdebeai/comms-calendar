import { ChevronDown, ChevronRight, Users } from "lucide-react";
import type { Comm } from "../data/types";
import { campaignInfo, compare, delta, gapsFor, headline, num, variantsOf } from "../lib/campaign";
import { FOCUS_RING } from "../lib/styles";
import { fmt, verdictText } from "./CampaignUi";

// What a card carries in campaign mode. The LINE is inside the card's button
// (so it's text only); the variants toggle is a real button rendered beside
// the card by the Timeline (CampaignCardFooter) over a line the card reserves.

const short = (audience?: string) => (audience ?? "").replace(/^Year 12 · ?/, "") || "Year 12";

/** The success measure as its gap to benchmark; with variants, worst to best. */
export function CampaignCardLine({ comm, grouped, open }: { comm: Comm; grouped?: boolean; open?: boolean }) {
  const i = campaignInfo(comm.id);
  if (!i) return null;
  const variants = grouped ? variantsOf(comm) : [comm];
  const heads = variants.map((v) => ({ v, h: headline(v, campaignInfo(v.id)!) }));
  const h = heads[0].h;
  const gaps = gapsFor(comm).filter((g) => g.kind === "chain-broken" || g.kind === "no-chain" || g.kind === "no-utm" || g.kind === "not-measured");
  const cmps = heads.map(({ h }) => (h ? compare(h.value) : null));
  const cmp = variants.length === 1 ? cmps[0] : cmps.some((c) => c === "worse") ? "worse" : cmps.every((c) => c === "better") ? "better" : null;
  const gapsToBench = heads.filter(({ h }) => h?.value.benchmark).map(({ h }) => num(h!.value.value) - num(h!.value.benchmark!));
  let text = "", muted = false;
  if (h) {
    if (variants.length > 1 && gapsToBench.length > 1 && h.value.value.includes("%")) {
      const f = (n: number) => `${n < 0 ? "−" : "+"}${Math.round(Math.abs(n) * 10) / 10}`;
      text = `${f(Math.min(...gapsToBench))} to ${f(Math.max(...gapsToBench))} pts`;
    } else {
      const d = delta(h.value);
      if (d) text = d;
      else { text = fmt(h.value.value); muted = true; }
    }
  }
  return (
    <>
      <span className="mt-1 flex flex-wrap items-baseline gap-x-1 text-xs leading-tight">
        {h ? (
          <>
            <span className={`whitespace-nowrap text-sm font-semibold ${muted ? "text-grey-70" : verdictText(cmp)}`}>{text}</span>
            <span className="text-grey-70">{h.label}</span>
          </>
        ) : (
          <span className="text-grey-70 italic">not measured</span>
        )}
        {i.new2026 && <span className="ml-auto rounded-sm border border-current px-1 text-[10px] font-semibold tracking-wider text-grey-70 uppercase">New</span>}
      </span>
      {variants.length > 1 && (
        <>
          {open && (
            <span className="mt-1 block divide-y divide-grey-30/60 border-t border-grey-30/60">
              {heads.map(({ v, h }) => (
                <span key={v.id} className="flex items-baseline justify-between gap-2 py-0.5 text-xs">
                  <span className="truncate text-grey-80">{short(v.audience)}</span>
                  <span className={`shrink-0 font-semibold ${verdictText(h ? compare(h.value) : null)}`}>{h ? (delta(h.value) ?? fmt(h.value.value)) : "—"}</span>
                </span>
              ))}
            </span>
          )}
          {/* the card's last line: the footer's button sits over it */}
          <span className="mt-1 block h-4" aria-hidden />
        </>
      )}
      {gaps[0] && (
        <span title={gaps.map((g) => `${g.label} — ${g.detail}`).join("\n")} className="absolute -top-1 -right-1 size-2.5 rounded-full bg-amber ring-2 ring-card" aria-hidden />
      )}
    </>
  );
}

/** The variants toggle — a sibling of the card, never inside its button. */
export function CampaignCardFooter({ comm, open, onToggle }: { comm: Comm; open: boolean; onToggle: () => void }) {
  const n = variantsOf(comm).length;
  if (n < 2) return null;
  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      className={`inline-flex h-4 items-center gap-1 rounded text-xs text-grey-80 hover:text-grey-90 ${FOCUS_RING}`}
    >
      <Users size={10} strokeWidth={2} aria-hidden />
      {n} variants
      {open ? <ChevronDown size={11} strokeWidth={2} aria-hidden /> : <ChevronRight size={11} strokeWidth={2} aria-hidden />}
    </button>
  );
}
