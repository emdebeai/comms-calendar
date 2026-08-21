// Shared packer for the student question-cards, copying the touchpoint
// cards' reading order: a column fills TOP-TO-BOTTOM, then the next column
// starts to its right — so a stage's #1 question sits top-left and priority
// reads down each column. Cards hug their full (untruncated) text at the
// comm cards' type size. Pure — both the live layout (studentBubbles,
// scaleX) and the band-height calc (scale, baseScaleX) use it.

export const CARD_W = 152;
const CHARS_PER_LINE = 19; // conservative for text-xs font-semibold across the card
const LINE_H = 15; // leading-tight at 12px
const PAD_V = 14; // py-1.5 both sides + slack
export const PAD_Y = 10;
const GAP_X = 8;
const ROW_GAP = 8;
/** Depth cap per column, in cards' worth of pixels (~3 typical cards). */
const COL_CAP_PX = 200;
const STAGE_PAD_X = 6;

/** Estimate a card's rendered height from its full text. Generous, so a card
 *  never overlaps the one below. */
export function estimateCardH(text: string): number {
  const lines = Math.max(1, Math.ceil(text.length / CHARS_PER_LINE));
  return lines * LINE_H + PAD_V;
}

export interface Placed {
  x: number;
  y: number;
  h: number;
}

export interface StageSpanIn {
  left: number;
  width: number;
  questions: string[];
}

/** Plan x-positions column-major per stage: enough columns that no column
 *  exceeds the depth cap, columns spread across the stage's span (a wide
 *  stage keeps its spread; a narrow one packs columns side by side). Returns
 *  items in input order, ready for packCards. */
export function planCards(stages: StageSpanIn[]): { x: number; h: number }[] {
  const out: { x: number; h: number }[] = [];
  for (const s of stages) {
    const hs = s.questions.map(estimateCardH);
    // Columns needed so each stays under the cap, filling in priority order.
    let cols = 1;
    for (;;) {
      const perCol = Math.ceil(hs.length / cols);
      let ok = true;
      for (let c = 0; c < cols; c++) {
        const colH = hs
          .slice(c * perCol, (c + 1) * perCol)
          .reduce((a, b) => a + b + ROW_GAP, -ROW_GAP);
        if (colH > COL_CAP_PX) ok = false;
      }
      if (ok || cols >= hs.length) break;
      cols++;
    }
    const perCol = Math.ceil(hs.length / cols);
    const inner = Math.max(s.width - 2 * STAGE_PAD_X, CARD_W);
    const pitch = cols > 1 ? Math.max(CARD_W + GAP_X, inner / cols) : 0;
    hs.forEach((h, i) => {
      const col = Math.floor(i / perCol);
      out.push({ x: s.left + STAGE_PAD_X + col * pitch, h });
    });
  }
  return out;
}

/** Skyline-pack cards at their planned x (highest free slot among horizontal
 *  overlaps — same collage packing as the comm lanes). Stable for equal x, so
 *  a column keeps its top-to-bottom priority order. */
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
