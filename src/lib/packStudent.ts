// Shared layout for the student question-cards. Each stage lays its questions
// out as a compact column-major grid (fill top-to-bottom, then the next column
// to the right — the touchpoint cards' reading order). The card WIDTH and the
// number of COLUMNS adapt to the stage's span: a wide stage (Consider,
// Understand, or any stage once its months are zoomed) uses wider cards and
// more columns so the block stays short — targeting TARGET_H — instead of one
// tall stack; a narrow stage (Submit / Offer ≈ 0.9 month) falls back to a
// single column of minimum-width cards that still fit within its own span, so
// no card overflows into the neighbouring stage. Pure — both the live layout
// (studentBubbles, scaleX) and the band-height calc (scale, baseScaleX) use it.
import { PRINT_MODE } from "./printMode";

// Card width bounds. MIN fits the narrowest stage (~108px at 120px/month) so a
// single-column stage never overflows its divider; MAX keeps wide-stage cards
// from getting ungainly. Printed at ~4m wide, 104–170px is ~9–14cm across.
export const MIN_CARD = 104;
export const MAX_CARD = 170;
/** Nominal width kept for importers that need a single figure. */
export const CARD_W = MIN_CARD;

// The card font. Bumped in the print/export view so the questions read larger
// on the wall — the layout below measures and reserves height at this size, so
// cards resize correctly (no clipping) rather than the font just overflowing.
export const FONT_PX = PRINT_MODE ? 15 : 12;
const LINE_H = Math.round(FONT_PX * 1.25); // leading-tight
const PAD_V = 14; // py-1.5 both sides + borders
export const PAD_Y = 10;
const GAP_X = 8;
const ROW_GAP = 8;
const STAGE_PAD_X = 6;
/** Height a stage's card block aims to stay within — more columns are added
 *  until the tallest column fits, budget permitting. */
const TARGET_H = 166;
const CHARS_PER_LINE = 16; // fallback when canvas measuring is unavailable

// Real text measurement (canvas), so a card's reserved slot matches what the
// browser renders — a character-count guess is off by a line often enough to
// make the stacked gaps ragged.
const measureCtx =
  typeof document !== "undefined" ? document.createElement("canvas").getContext("2d") : null;

function wrappedLines(text: string, bold: boolean, innerW: number): number {
  if (!measureCtx) return Math.max(1, Math.ceil(text.length / CHARS_PER_LINE));
  // The card's actual type: text-xs on the app's font-sans stack — semibold
  // for answered questions, regular for open ones (they wrap differently).
  // Inter is the app's rendered face (index.css); a fallback face miscounts.
  measureCtx.font = `${bold ? 600 : 400} ${FONT_PX}px Inter, system-ui, -apple-system, sans-serif`;
  // Break at spaces AND after hyphens (the browser wraps "class-selection" as
  // "class-" / "selection"); hyphen fragments join with no space.
  const tokens = text
    .split(/\s+/)
    .flatMap((w) => w.split(/(?<=-)/).map((part, i) => ({ part, spaced: i === 0 })));
  let lines = 1;
  let line = "";
  for (const { part, spaced } of tokens) {
    const probe = line ? `${line}${spaced ? " " : ""}${part}` : part;
    if (measureCtx.measureText(probe).width <= innerW) {
      line = probe;
    } else {
      lines++;
      line = part;
    }
  }
  return lines;
}

/** A card's rendered height at a given card width and weight. */
export function estimateCardH(text: string, bold: boolean, cardW: number): number {
  const innerW = cardW - 16 - 2; // px-2 both sides + 1px border each side
  return wrappedLines(text, bold, innerW) * LINE_H + PAD_V;
}

export interface Placed {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface StageSpanIn {
  left: number;
  width: number;
  questions: { text: string; bold: boolean }[];
}

interface ColPlan {
  cols: number;
  cardW: number;
  perCol: number;
  hs: number[];
  height: number;
}

/** For one stage, try increasing column counts and keep the fewest columns
 *  whose tallest column fits TARGET_H (falling back to the shortest option if
 *  none do). More columns → narrower cards → fewer cards per column. */
function planStage(s: StageSpanIn): ColPlan {
  const n = s.questions.length;
  const avail = Math.max(s.width - 2 * STAGE_PAD_X, MIN_CARD);
  const maxCols = Math.max(1, Math.floor((avail + GAP_X) / (MIN_CARD + GAP_X)));
  let best: ColPlan | null = null;
  for (let cols = 1; cols <= Math.min(maxCols, n); cols++) {
    const cardW = Math.max(
      MIN_CARD,
      Math.min(MAX_CARD, Math.floor((avail - (cols - 1) * GAP_X) / cols)),
    );
    const hs = s.questions.map((q) => estimateCardH(q.text, q.bold, cardW));
    const perCol = Math.ceil(n / cols);
    const colH = new Array(cols).fill(0);
    hs.forEach((h, i) => {
      colH[Math.floor(i / perCol)] += h + ROW_GAP;
    });
    const height = Math.max(...colH) - ROW_GAP;
    if (!best || height < best.height) best = { cols, cardW, perCol, hs, height };
    if (height <= TARGET_H) break;
  }
  return best ?? { cols: 1, cardW: MIN_CARD, perCol: n, hs: [], height: 0 };
}

/** Lay out every stage's cards as compact column-major grids. Returns absolute
 *  placements (band-local x, plus PAD_Y-offset y) and the overall band height. */
export function layoutStages(stages: StageSpanIn[]): { placed: Placed[]; height: number } {
  const placed: Placed[] = [];
  let deepest = 0;
  for (let g = 0; g < stages.length; g++) {
    const s = stages[g];
    if (s.questions.length === 0) continue;
    const plan = planStage(s);
    const colY = new Array(plan.cols).fill(0);
    s.questions.forEach((_, i) => {
      const col = Math.floor(i / plan.perCol);
      const x = s.left + STAGE_PAD_X + col * (plan.cardW + GAP_X);
      const y = PAD_Y + colY[col];
      placed.push({ x, y, w: plan.cardW, h: plan.hs[i] });
      colY[col] += plan.hs[i] + ROW_GAP;
    });
    deepest = Math.max(deepest, plan.height);
  }
  return { placed, height: PAD_Y * 2 + Math.max(deepest, LINE_H + PAD_V) };
}
