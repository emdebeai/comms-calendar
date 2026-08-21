// Shared packer for the student question-cards. Cards hug their own (wrapped,
// untruncated) text, so heights vary; they pack into at most MAX_ROWS rows,
// and anything that would need a 4th row is pushed to the right instead —
// keeping the lane short and every question fully visible (printable). Pure —
// both the layout (studentBubbles, live scaleX) and the band-height calc
// (scale, base scaleX) use it, so no circular import.

export const CARD_W = 152;
const CHARS_PER_LINE = 22; // conservative for text-[11px] across the card's inner width
const LINE_H = 15; // leading-snug at 11px
const PAD_V = 13; // py-1.5 both sides + a little slack
export const PAD_Y = 10;
const GAP_X = 8;
const ROW_GAP = 8;
export const MAX_ROWS = 3;

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

/** Pack cards left-to-right into ≤ MAX_ROWS variable-height rows; overflow is
 *  pushed right into the earliest-free row rather than adding a 4th row. */
export function packCards(items: { x: number; h: number }[]): { placed: Placed[]; height: number } {
  const rowRight = new Array(MAX_ROWS).fill(-Infinity);
  const rowH = new Array(MAX_ROWS).fill(0);
  const rowOf = new Array(items.length).fill(0);
  const xOf = new Array(items.length).fill(0);

  const order = items.map((_, i) => i).sort((a, b) => items[a].x - items[b].x);
  for (const i of order) {
    let r = 0;
    while (r < MAX_ROWS && rowRight[r] + GAP_X > items[i].x) r++;
    let x: number;
    if (r < MAX_ROWS) {
      x = items[i].x;
    } else {
      // All rows still occupied at this x — push right into whichever row
      // frees up first.
      r = rowRight.indexOf(Math.min(...rowRight));
      x = rowRight[r] + GAP_X;
    }
    rowRight[r] = x + CARD_W;
    rowH[r] = Math.max(rowH[r], items[i].h);
    rowOf[i] = r;
    xOf[i] = x;
  }

  const usedRows = items.length ? Math.max(...rowOf) + 1 : 0;
  const rowY: number[] = [];
  let acc = PAD_Y;
  for (let r = 0; r < MAX_ROWS; r++) {
    rowY[r] = acc;
    acc += rowH[r] + ROW_GAP;
  }
  const placed = items.map((it, i) => ({ x: xOf[i], y: rowY[rowOf[i]], h: it.h }));

  let height = PAD_Y;
  for (let r = 0; r < usedRows; r++) height += rowH[r] + (r < usedRows - 1 ? ROW_GAP : 0);
  height += PAD_Y;
  return { placed, height: Math.max(height, PAD_Y * 2 + LINE_H + PAD_V) };
}
