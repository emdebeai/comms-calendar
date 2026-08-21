// Layout for the student question-cards: each stage packs its own questions
// inside its span (see packStudent), so cards never cross a stage separator
// and stage membership stays legible. Band-local coords; recomputed each
// render so it tracks zoom.
import { STAGES } from "../data/journey";
import { linkedCommIds } from "../data/studentExperience";
import { questionLabel, stageDisplayQuestions } from "../data/studentView";
import { scaleX } from "./scale";
import { packStage } from "./packStudent";

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

/** Lay every stage's questions out as stage-contained packed cards. */
export function bubbleLayout(): Bubble[] {
  const out: Bubble[] = [];
  for (const stage of STAGES) {
    const questions = stageDisplayQuestions(stage.label);
    if (questions.length === 0) continue;
    const left = scaleX(stage.from);
    const width = scaleX(stage.to) - left;
    const { boxes } = packStage(left, width, questions);
    questions.forEach((question, i) => {
      const commIds = linkedCommIds(stage.label, question);
      out.push({
        stage: stage.label,
        question,
        label: questionLabel(stage.label, question),
        answered: commIds.length > 0,
        commIds,
        ...boxes[i],
      });
    });
  }
  return out;
}
