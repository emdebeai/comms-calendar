// Layout for the student swimlane's question bubbles. Each stage's questions
// are spread across the stage's time span and packed into up to STUDENT_ROWS
// rows, so a wide stage lays them out horizontally and a narrow one stacks a
// few. Positions are band-local: x is timeline-space (0 = first month, same as
// scaleX / commPos.x), y is measured from the top of the student band.
import { STAGES } from "../data/journey";
import { linkedCommIds } from "../data/studentExperience";
import { questionLabel, stageDisplayQuestions } from "../data/studentView";
import { scaleX } from "./scale";

export const STUDENT_ROWS = 3;
export const BUBBLE_H = 26;
const ROW_H = 32;
const PAD_TOP = 10;
const MIN_W = 66;
const MAX_W = 156;
const GAP_X = 8;

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

/** The band height needed for STUDENT_ROWS rows of bubbles. */
export const STUDENT_BUBBLE_AREA_H = PAD_TOP * 2 + STUDENT_ROWS * ROW_H;

/** Lay every stage's questions out as bubbles. Recomputed per render (cheap),
 *  so it tracks the current zoom. */
export function bubbleLayout(): Bubble[] {
  const out: Bubble[] = [];
  for (const stage of STAGES) {
    const questions = stageDisplayQuestions(stage.label);
    const n = questions.length;
    if (n === 0) continue;

    const left = scaleX(stage.from);
    const width = Math.max(scaleX(stage.to) - left, MIN_W);

    // Use as many columns as the width affords (fewer rows), but never so few
    // that we'd need more than STUDENT_ROWS rows.
    const fitCols = Math.max(1, Math.floor(width / (MIN_W + GAP_X)));
    const minCols = Math.ceil(n / STUDENT_ROWS);
    const cols = Math.max(minCols, Math.min(n, fitCols));
    const colW = width / cols;

    questions.forEach((question, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const w = Math.min(MAX_W, Math.max(MIN_W, colW - GAP_X));
      const x = left + col * colW + (colW - w) / 2;
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
