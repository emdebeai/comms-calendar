// The student view's display config: the persona's voice per stage, and the
// handful of questions the map surfaces. Trimmed to what matters to Persona 01
// — a domestic school leaver applying direct to an undergraduate degree via
// VTAC. Pathway/TAFE-only and duplicate questions are left out; the source doc
// keeps the full set (src/data/studentExperience.ts).
import { STUDENT_EXPERIENCE, stageQuestions } from "./studentExperience";

// Up to five questions per stage, in the order we show them. Matched by
// substring against the full question text, so small wording tweaks in the
// source doc don't break the pick. Team-map questions are kept; pathway
// products (diploma / associate degree / TAFE-to-degree) are dropped.
const DISPLAY: Record<string, string[]> = {
  Understand: [
    "What subjects do I actually need",
    "Do I want to aim for university",
    "Which jobs and industries",
    "What will I actually study",
  ],
  Consider: [
    "What ATAR am I tracking for",
    "Should I study at [Uni A]",
    "Does this course include work experience",
    "How much will it cost me",
    "Which VCE subjects are prerequisites",
  ],
  Decide: [
    "Is RMIT definitely the right first choice",
    "What is the exact process to start my application",
    "Am I eligible for a scholarship",
    "How do I order RMIT vs my backups",
    "What are the VTAC and course codes",
  ],
  Begin: [
    "What do I actually need to have ready",
    "Do I need to find my Year 11 results",
    "Can I use my digital ATAR",
  ],
  Submit: [
    "Is my course list locked in",
    "Why is this upload failing",
    "If something goes wrong mid-submission",
    "Will I get a confirmation",
  ],
  Wait: [
    "When is ATAR release day",
    "How does Change of Preference work",
    "When do VTAC Round 1 offers come out",
    "Where will my results and offer actually land",
    "What support is there if I'm stressed",
  ],
  Offer: [
    "When is the reply deadline",
    "If I accept a backup offer",
    "How long can I defer for",
    "Can I change my preferences now",
  ],
  Enrol: [
    "Which subjects do I need to choose",
    "Who can I talk to if I hit a technical problem",
    "Why do I have to do these tests",
    "How do I log in for the first time",
    "How do I get timetabling",
  ],
};

/** The curated questions to show for a stage — the source doc's full text,
 *  filtered to the ones we surface, capped at five, in priority order. */
export function stageDisplayQuestions(stage: string): string[] {
  const all = stageQuestions(stage);
  const out: string[] = [];
  for (const pick of DISPLAY[stage] ?? []) {
    const match = all.find((q) => q.toLowerCase().includes(pick.toLowerCase()));
    if (match && !out.includes(match)) out.push(match);
  }
  return out.slice(0, 5);
}

/** The persona's first-person voice for a stage — the "Decided:" quote from
 *  the experience-layer doc, unwrapped. This is what the student is saying. */
export function stageVoice(stage: string): string | null {
  const data = STUDENT_EXPERIENCE.find((e) => e.stage === stage);
  const voice = data?.blocks
    .flatMap((b) => b.groups)
    .find((g) => g.heading === "Student voice")
    ?.items.find((it) => it.startsWith("Decided"));
  if (!voice) return null;
  const m = voice.match(/[“"]([^”"]+)[”"]/);
  return m ? m[1] : voice.replace(/^Decided:\s*/, "");
}

/** How many of a stage's shown questions have a touchpoint answering them. */
export function stageCoverage(
  stage: string,
  answered: (stage: string, question: string) => boolean,
): { answered: number; total: number } {
  const qs = stageDisplayQuestions(stage);
  return { answered: qs.filter((q) => answered(stage, q)).length, total: qs.length };
}
