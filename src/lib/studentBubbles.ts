// Layout for the student question-cards. Each stage's questions are planned
// column-major (top-to-bottom, then right — the touchpoint cards' reading
// order) across the stage's span, then skyline-packed like the comm collage.
// Band-local coords; recomputed each render so it tracks zoom.
import { STAGES } from "../data/journey";
import { linkedCommIds } from "../data/studentExperience";
import { questionLabel, stageDisplayQuestions } from "../data/studentView";
import { scaleX } from "./scale";
import { CARD_W, packCards, planCards } from "./packStudent";

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

/** Lay every stage's questions out as packed cards (current zoom). */
export function bubbleLayout(): Bubble[] {
  const meta: Omit<Bubble, "x" | "y" | "w" | "h">[] = [];
  const spans: { left: number; width: number; questions: { text: string; bold: boolean }[] }[] = [];
  for (const stage of STAGES) {
    const questions = stageDisplayQuestions(stage.label);
    if (questions.length === 0) continue;
    const left = scaleX(stage.from);
    const qs: { text: string; bold: boolean }[] = [];
    for (const question of questions) {
      const commIds = linkedCommIds(stage.label, question);
      qs.push({ text: question, bold: commIds.length > 0 });
      meta.push({
        stage: stage.label,
        question,
        label: questionLabel(stage.label, question),
        answered: commIds.length > 0,
        commIds,
      });
    }
    spans.push({ left, width: scaleX(stage.to) - left, questions: qs });
  }
  const { placed } = packCards(planCards(spans));
  return meta.map((m, i) => ({ ...m, x: placed[i].x, y: placed[i].y, w: CARD_W, h: placed[i].h }));
}
