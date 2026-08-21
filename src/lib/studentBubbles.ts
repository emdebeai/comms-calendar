// Layout for the student question-cards. Each stage's questions spread across
// its time span; the whole set is packed into ≤3 variable-height rows (cards
// hug their full text; overflow pushes right). Positions are band-local: x is
// timeline-space (0 = first month, same as scaleX / commPos.x), y from the top
// of the student band. Recomputed each render so it tracks zoom.
import { STAGES } from "../data/journey";
import { linkedCommIds } from "../data/studentExperience";
import { questionLabel, stageDisplayQuestions } from "../data/studentView";
import { TOTAL_W, scaleX } from "./scale";
import { CARD_W, estimateCardH, packCards } from "./packStudent";

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

interface Meta {
  stage: string;
  question: string;
  label: string;
  answered: boolean;
  commIds: string[];
  x: number;
  h: number;
}

function collectMeta(x: (m: number) => number): Meta[] {
  const meta: Meta[] = [];
  for (const stage of STAGES) {
    const questions = stageDisplayQuestions(stage.label);
    if (questions.length === 0) continue;
    const left = x(stage.from);
    const width = Math.max(x(stage.to) - left, CARD_W * 0.5);
    questions.forEach((question, i) => {
      const centre = left + (width * (i + 0.5)) / questions.length;
      const px = Math.max(0, Math.min(TOTAL_W - CARD_W, centre - CARD_W / 2));
      const commIds = linkedCommIds(stage.label, question);
      meta.push({
        stage: stage.label,
        question,
        label: questionLabel(stage.label, question),
        answered: commIds.length > 0,
        commIds,
        x: px,
        h: estimateCardH(question),
      });
    });
  }
  return meta;
}

/** Lay every stage's questions out as packed cards (current zoom). */
export function bubbleLayout(): Bubble[] {
  const meta = collectMeta(scaleX);
  const { placed } = packCards(meta.map((m) => ({ x: m.x, h: m.h })));
  return meta.map((m, i) => ({
    stage: m.stage,
    question: m.question,
    label: m.label,
    answered: m.answered,
    commIds: m.commIds,
    x: placed[i].x,
    y: placed[i].y,
    w: CARD_W,
    h: placed[i].h,
  }));
}
