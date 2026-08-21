// Layout for the student question-cards. Each stage's questions are spread
// across the stage's time span, then the whole set is skyline-packed so cards
// stack vertically (like the comm cards in a busy month) rather than
// overlapping. Positions are band-local: x is timeline-space (0 = first month,
// same as scaleX / commPos.x), y is from the top of the student band.
// Recomputed each render so it tracks zoom.
import { STAGES } from "../data/journey";
import { linkedCommIds } from "../data/studentExperience";
import { questionLabel, stageDisplayQuestions } from "../data/studentView";
import { TOTAL_W, scaleX } from "./scale";
import { CARD_MAX_H, CARD_W, PAD_Y, ROW_H, packRows } from "./packStudent";

export const BUBBLE_H = CARD_MAX_H;

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

/** Spread a stage's questions across its span; a single one centres. */
function stageCardXs(from: number, to: number, n: number): number[] {
  const left = scaleX(from);
  const width = Math.max(scaleX(to) - left, CARD_W * 0.5);
  return Array.from({ length: n }, (_, i) => {
    const centre = left + (width * (i + 0.5)) / n;
    return Math.max(0, Math.min(TOTAL_W - CARD_W, centre - CARD_W / 2));
  });
}

/** Lay every stage's questions out as packed cards. */
export function bubbleLayout(): Bubble[] {
  const meta: Omit<Bubble, "y" | "w" | "h">[] = [];
  for (const stage of STAGES) {
    const questions = stageDisplayQuestions(stage.label);
    if (questions.length === 0) continue;
    const xs = stageCardXs(stage.from, stage.to, questions.length);
    questions.forEach((question, i) => {
      const commIds = linkedCommIds(stage.label, question);
      meta.push({
        stage: stage.label,
        question,
        label: questionLabel(stage.label, question),
        answered: commIds.length > 0,
        commIds,
        x: xs[i],
      });
    });
  }
  const { rows } = packRows(meta.map((m) => m.x));
  return meta.map((m, i) => ({ ...m, y: PAD_Y + rows[i] * ROW_H, w: CARD_W, h: CARD_MAX_H }));
}
