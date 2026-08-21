// Per-stage packer for the student question-cards. Each stage lays its
// questions out in its OWN column grid, contained within the stage's span —
// a card never crosses a stage separator, so stage membership stays legible.
// Cards hug their full (untruncated, printable) text; a narrow stage narrows
// its cards and stacks deeper (max ~3 rows via the column count). Pure — both
// the live layout (studentBubbles, scaleX) and the band-height calc (scale,
// baseScaleX) use it, so no circular import.

export const CARD_MAX_W = 168;
export const CARD_MIN_W = 104;
const LINE_H = 15; // leading-snug at 11px
const PAD_V = 14; // py-1.5 both sides + slack
export const PAD_Y = 10;
const GAP_X = 8;
const ROW_GAP = 10;
const STAGE_PAD_X = 8; // inset from the stage separators
export const MAX_ROWS = 3;

/** Estimate a card's rendered height from its text at a given card width. */
export function estimateCardH(text: string, w: number): number {
  // ~0.19 chars per px is conservative for text-[11px]; minus px-2 padding.
  const charsPerLine = Math.max(10, Math.floor((w - 16) * 0.19));
  const lines = Math.max(1, Math.ceil(text.length / charsPerLine));
  return lines * LINE_H + PAD_V;
}

export interface StageBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Lay one stage's questions out in a grid inside [left, left+width]:
 *  as many preferred-width columns as fit (min = enough to keep ≤ MAX_ROWS
 *  rows), cards centred in their column, row heights hugging the tallest
 *  card in the row. Returns the boxes (same order as questions) and the
 *  stage's total stack height. */
export function packStage(left: number, width: number, questions: string[]): { boxes: StageBox[]; height: number } {
  const n = questions.length;
  if (n === 0) return { boxes: [], height: 0 };
  const inner = Math.max(width - 2 * STAGE_PAD_X, CARD_MIN_W);
  const colsByWidth = Math.max(1, Math.floor((inner + GAP_X) / (CARD_MAX_W + GAP_X)));
  const colsMin = Math.ceil(n / MAX_ROWS);
  const cols = Math.min(n, Math.max(colsMin, colsByWidth));
  const pitch = (inner + GAP_X) / cols;
  const w = Math.min(CARD_MAX_W, Math.max(CARD_MIN_W, pitch - GAP_X));

  // Row-major fill; each row's height hugs its tallest card.
  const rows = Math.ceil(n / cols);
  const rowH = new Array(rows).fill(0);
  const hs = questions.map((q) => estimateCardH(q, w));
  hs.forEach((h, i) => {
    const r = Math.floor(i / cols);
    rowH[r] = Math.max(rowH[r], h);
  });
  const rowY: number[] = [];
  let acc = PAD_Y;
  for (let r = 0; r < rows; r++) {
    rowY[r] = acc;
    acc += rowH[r] + ROW_GAP;
  }

  const boxes = questions.map((_, i) => {
    const col = i % cols;
    const r = Math.floor(i / cols);
    return {
      x: left + STAGE_PAD_X + col * pitch + (pitch - GAP_X - w) / 2,
      y: rowY[r],
      w,
      h: hs[i],
    };
  });
  return { boxes, height: acc - ROW_GAP + PAD_Y };
}
