// Shared packer for the student question-cards, copying the touchpoint
// cards' reading order: a column fills TOP-TO-BOTTOM, then the next column
// starts to its right — so a stage's #1 question sits top-left and priority
// reads down each column. Cards hug their full (untruncated) text at the
// comm cards' type size. Pure — both the live layout (studentBubbles,
// scaleX) and the band-height calc (scale, baseScaleX) use it.

export const CARD_W = 152;
const INNER_W = CARD_W - 16 - 2; // px-2 both sides + 1px border each side
const CHARS_PER_LINE = 19; // fallback when canvas measuring is unavailable
const LINE_H = 15; // leading-tight at 12px
const PAD_V = 14; // py-1.5 both sides + borders
export const PAD_Y = 10;
const GAP_X = 8;
const ROW_GAP = 8;
const STAGE_PAD_X = 6;
/** Minimum right-step between successive cards in a tight stage — gives the
 *  comm clusters' staircase (1 ↘ 2 ↘ 3) instead of a flat aligned column. */
const MIN_STAGGER = 28;

// Real text measurement (canvas), so the reserved slot matches the rendered
// card and the gaps between stacked cards stay a consistent ROW_GAP — a
// character-count guess is off by a line often enough to make gaps ragged.
const measureCtx =
  typeof document !== "undefined" ? document.createElement("canvas").getContext("2d") : null;

function wrappedLines(text: string, bold: boolean): number {
  if (!measureCtx) return Math.max(1, Math.ceil(text.length / CHARS_PER_LINE));
  // The card's actual type: text-xs on the app's font-sans stack — semibold
  // for answered questions, regular for open ones (they wrap differently).
  // Inter is the app's actual rendered face (see index.css) — measuring with
  // a fallback face miscounts lines and makes the stack gaps ragged.
  measureCtx.font = `${bold ? 600 : 400} 12px Inter, system-ui, -apple-system, sans-serif`;
  // Break at spaces AND after hyphens (the browser wraps "class-selection"
  // as "class-" / "selection"); hyphen fragments join with no space.
  const tokens = text
    .split(/\s+/)
    .flatMap((w) => w.split(/(?<=-)/).map((part, i) => ({ part, spaced: i === 0 })));
  let lines = 1;
  let line = "";
  for (const { part, spaced } of tokens) {
    const probe = line ? `${line}${spaced ? " " : ""}${part}` : part;
    if (measureCtx.measureText(probe).width <= INNER_W) {
      line = probe;
    } else {
      lines++;
      line = part;
    }
  }
  return lines;
}

/** A card's rendered height from its full (untruncated) text at its weight. */
export function estimateCardH(text: string, bold = true): number {
  return wrappedLines(text, bold) * LINE_H + PAD_V;
}

export interface Placed {
  x: number;
  y: number;
  h: number;
}

export interface StageSpanIn {
  left: number;
  width: number;
  questions: { text: string; bold: boolean }[];
}

/** Plan x-positions per stage as a staircase: successive questions step right
 *  by an even share of the stage's span, floored at MIN_STAGGER — so a wide
 *  stage relaxes into a flat spread (no overlap → one row) while a tight
 *  stage cascades 1 ↘ 2 ↘ 3, priority reading down-right like a comm
 *  cluster. Returns items in input order, ready for packCards. */
export function planCards(stages: StageSpanIn[]): { x: number; h: number }[] {
  const out: { x: number; h: number }[] = [];
  for (const s of stages) {
    const hs = s.questions.map((q) => estimateCardH(q.text, q.bold));
    const n = hs.length;
    const inner = Math.max(s.width - 2 * STAGE_PAD_X, CARD_W);
    const step = n > 1 ? Math.max(MIN_STAGGER, (inner - CARD_W) / (n - 1)) : 0;
    hs.forEach((h, i) => {
      out.push({ x: s.left + STAGE_PAD_X + i * step, h });
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
