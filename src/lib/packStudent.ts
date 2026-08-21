// Shared packer for the student question-cards — the same collage/skyline
// packing the comm lanes use: each card keeps its x (its place in time) and
// drops into the highest free slot among the cards it actually overlaps
// horizontally, so heights hug the text and the stack reads as masonry rather
// than rigid rows. Pure — both the layout (studentBubbles, live scaleX) and
// the band-height calc (scale, base scaleX) use it, so no circular import.

export const CARD_W = 152;
const CHARS_PER_LINE = 22; // conservative for text-[11px] font-semibold across the card
const LINE_H = 15; // leading-snug at 11px
const PAD_V = 13; // py-1.5 both sides + a little slack
export const PAD_Y = 10;
const GAP_X = 8;
const ROW_GAP = 8;

/** Estimate a card's rendered height from its full (untruncated) text, so the
 *  packer can reserve the right slot. Generous, so a card never overlaps the
 *  one below. */
export function estimateCardH(text: string): number {
  const lines = Math.max(1, Math.ceil(text.length / CHARS_PER_LINE));
  return lines * LINE_H + PAD_V;
}

export interface Placed {
  x: number;
  y: number;
  h: number;
}

/** Skyline-pack cards at their given x: highest free slot among horizontal
 *  overlaps, exactly like the comm-card collage packing. */
export function packCards(items: { x: number; h: number }[]): { placed: Placed[]; height: number } {
  const done: { x1: number; x2: number; y: number; bottom: number }[] = [];
  const placed: Placed[] = new Array(items.length);
  const order = items.map((_, i) => i).sort((a, b) => items[a].x - items[b].x);
  let deepest = 0;
  for (const i of order) {
    const x1 = items[i].x;
    const x2 = x1 + CARD_W + GAP_X;
    const h = items[i].h;
    const overlapping = done.filter((p) => x1 < p.x2 && p.x1 < x2);
    const candidates = [0, ...overlapping.map((p) => p.bottom + ROW_GAP)].sort((a, b) => a - b);
    const y =
      candidates.find((cy) =>
        overlapping.every((p) => cy + h + ROW_GAP <= p.y || cy >= p.bottom + ROW_GAP),
      ) ?? 0;
    done.push({ x1, x2, y, bottom: y + h });
    placed[i] = { x: x1, y: PAD_Y + y, h };
    deepest = Math.max(deepest, y + h);
  }
  return { placed, height: PAD_Y * 2 + Math.max(deepest, LINE_H + PAD_V) };
}
