// Shared skyline packer for the student question-cards, so a stage's questions
// stack vertically (like the comm cards do in a busy month) instead of
// overflowing into their neighbours. Pure — takes x-positions in, gives a row
// per card out — so both the layout (studentBubbles, live scaleX) and the
// band-height calc (scale, base scaleX) can use it without a circular import.

export const CARD_W = 152;
export const CARD_MAX_H = 58; // up to ~3 wrapped lines
const ROW_GAP = 8;
export const ROW_H = CARD_MAX_H + ROW_GAP;
export const PAD_Y = 10;
export const GAP_X = 8;

/** First-fit-by-x row packing: each card drops into the lowest row whose last
 *  card ends (plus a gap) before this card starts. Returns a row index per
 *  card (input order) and the total number of rows used. */
export function packRows(xs: number[], w = CARD_W, gap = GAP_X): { rows: number[]; count: number } {
  const rowRight: number[] = [];
  const rows = new Array<number>(xs.length);
  const order = xs.map((_, i) => i).sort((a, b) => xs[a] - xs[b]);
  for (const i of order) {
    const x = xs[i];
    let r = 0;
    while (r < rowRight.length && rowRight[r] + gap > x) r++;
    rows[i] = r;
    rowRight[r] = x + w;
  }
  return { rows, count: Math.max(1, rowRight.length) };
}

export const laneHeight = (rowCount: number) => PAD_Y * 2 + Math.max(1, rowCount) * ROW_H;
