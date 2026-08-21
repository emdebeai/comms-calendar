// Layout for the student swimlane's question bubbles. Each stage's questions
// are packed into up to STUDENT_ROWS rows WITHIN the stage's own box — a wide
// stage spreads them across its width, a narrow one uses narrower columns —
// so bubbles never spill past a stage separator. Positions are band-local: x
// is timeline-space (0 = first month, same as scaleX / commPos.x), y is from
// the top of the student band. Recomputed each render so it tracks zoom.
import { STAGES } from "../data/journey";
import { linkedCommIds } from "../data/studentExperience";
import { questionLabel, stageDisplayQuestions } from "../data/studentView";
import { scaleX } from "./scale";

// The band accommodates up to STUDENT_ROWS rows. A narrow journey stage packs
// its questions into a single column (a tall vertical stack) rather than
// cramped side-by-side slivers — accepting the extra height. A stage with 5
// questions in one column is the tallest case, so the band fits 5 rows.
export const STUDENT_ROWS = 5;
export const BUBBLE_H = 26;
const ROW_H = 34; // bubble + vertical gap
const PAD_TOP = 12;
const PAD_BOTTOM = 12;
const PAD_X = 10; // inset from the stage separators
const GAP_X = 10;
const TARGET_W = 100; // a stage fits as many ~100px columns as its width allows
const MAX_W = 184; // never wider than this, however wide the stage

export interface Bubble {
  stage: string;
  question: string;
  label: string;
  answered: boolean;
  commIds: string[];
  /** band-local box */
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The band height needed for STUDENT_ROWS rows. */
export const STUDENT_BUBBLE_AREA_H = PAD_TOP + STUDENT_ROWS * ROW_H + PAD_BOTTOM;

/** Columns for a stage — purely how many readable columns its width affords.
 *  A narrow stage gets 1 (a single vertical stack); a wide stage spreads out.
 *  Capped at STUDENT_ROWS rows' worth so nothing overflows the band. */
function stageCols(innerWidth: number, n: number): number {
  const byWidth = Math.max(1, Math.floor((innerWidth + GAP_X) / (TARGET_W + GAP_X)));
  const minCols = Math.ceil(n / STUDENT_ROWS); // guard: never need > STUDENT_ROWS rows
  return Math.min(n, Math.max(minCols, byWidth));
}

/** Lay every stage's questions out as bubbles, contained within their stage. */
export function bubbleLayout(): Bubble[] {
  const out: Bubble[] = [];
  for (const stage of STAGES) {
    const questions = stageDisplayQuestions(stage.label);
    const n = questions.length;
    if (n === 0) continue;

    const left = scaleX(stage.from);
    const inner = Math.max(scaleX(stage.to) - left - 2 * PAD_X, 40);
    const cols = stageCols(inner, n);
    const step = (inner + GAP_X) / cols; // column pitch
    const w = Math.min(MAX_W, step - GAP_X);

    questions.forEach((question, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      // centre the (capped-width) bubble within its column slot
      const x = left + PAD_X + col * step + (step - GAP_X - w) / 2;
      const y = PAD_TOP + row * ROW_H;
      const commIds = linkedCommIds(stage.label, question);
      out.push({
        stage: stage.label,
        question,
        label: questionLabel(stage.label, question),
        answered: commIds.length > 0,
        commIds,
        x,
        y,
        w,
        h: BUBBLE_H,
      });
    });
  }
  return out;
}
