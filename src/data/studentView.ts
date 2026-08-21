// The student view's display config: the persona's voice per stage, and the
// handful of questions the map surfaces. Trimmed to what matters to Persona 01
// — a domestic school leaver applying direct to an undergraduate degree via
// VTAC. Pathway/TAFE-only and duplicate questions are left out; the source doc
// keeps the full set (src/data/studentExperience.ts).
import { STUDENT_EXPERIENCE, stageQuestions } from "./studentExperience";

// Up to five questions per stage, in the order we show them. Two kinds of
// entry: a plain string is a substring match against the experience-layer doc
// (so small wording tweaks there don't break the pick); `{ new }` is a
// question authored from the Study@RMIT search/enquiry demand data — the real
// questions students bring to study.rmit.edu.au — that the doc didn't already
// carry. Team-map questions are kept; pathway products (diploma / associate
// degree / TAFE-to-degree) are dropped.
type Pick = string | { new: string };

const DISPLAY: Record<string, Pick[]> = {
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
    // Study@RMIT: the Dec–Jan VTAC peak is dominated by preference-order and
    // "how do I maximise my chance of an offer" — not just how CoP works.
    { new: "How should I order my preferences to get the best offer I can?" },
    "When do VTAC Round 1 offers come out",
    "What support is there if I'm stressed",
  ],
  Offer: [
    // Study@RMIT: Jan–Feb demand is "what does my outcome mean, and what now?"
    { new: "I've got an offer — what does it actually mean, and what do I do next?" },
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

// Short speech-bubble labels — the gist of each question, for the swimlane
// where the full sentence won't fit. Matched by substring against the full
// question; the full text still shows on hover.
const SHORT: Record<string, [string, string][]> = {
  Understand: [
    ["What subjects do I actually need", "Which subjects?"],
    ["Do I want to aim for university", "Uni, TAFE or work?"],
    ["Which jobs and industries", "Which jobs?"],
    ["What will I actually study", "What will I study?"],
  ],
  Consider: [
    ["What ATAR am I tracking", "What ATAR?"],
    ["Should I study at [Uni A]", "Which uni?"],
    ["work experience", "Work experience?"],
    ["How much will it cost", "What will it cost?"],
    ["VCE subjects are prerequisites", "VCE prerequisites?"],
  ],
  Decide: [
    ["right first choice", "RMIT or backup?"],
    ["exact process to start", "How do I apply?"],
    ["eligible for a scholarship", "Any scholarships?"],
    ["order RMIT vs my backups", "Preference order?"],
    ["VTAC and course codes", "Which VTAC codes?"],
  ],
  Begin: [
    ["have ready on my computer", "What do I need ready?"],
    ["Year 11 results", "Results or portfolio?"],
    ["digital ATAR", "Digital ATAR OK?"],
  ],
  Submit: [
    ["course list locked", "Can I still change?"],
    ["upload failing", "Upload won't work?"],
    ["something goes wrong", "Where's the help?"],
    ["get a confirmation", "Did it go through?"],
  ],
  Wait: [
    ["ATAR release day", "When are results?"],
    ["Change of Preference work", "How does CoP work?"],
    ["order my preferences to get the best", "Best preference order?"],
    ["Round 1 offers come out", "When are offers?"],
    ["stressed while I wait", "Support while I wait?"],
  ],
  Offer: [
    ["what does it actually mean", "What does my offer mean?"],
    ["reply deadline", "Reply deadline?"],
    ["accept a backup offer", "Backup then Round 2?"],
    ["How long can I defer", "Can I defer?"],
    ["change my preferences now", "Change preferences?"],
  ],
  Enrol: [
    ["subjects do I need to choose", "Which subjects?"],
    ["technical problem", "Who do I call?"],
    ["do these tests", "Why these tests?"],
    ["log in for the first time", "How do I log in?"],
    ["timetabling", "Timetable help?"],
  ],
};

/** The short bubble label for a question (falls back to the full text). */
export function questionLabel(stage: string, question: string): string {
  const q = question.toLowerCase();
  const hit = SHORT[stage]?.find(([m]) => q.includes(m.toLowerCase()));
  return hit ? hit[1] : question;
}

/** The curated questions to show for a stage — doc questions (resolved to
 *  their full text) plus any authored from Study@RMIT demand data, capped at
 *  five, in priority order. */
export function stageDisplayQuestions(stage: string): string[] {
  const all = stageQuestions(stage);
  const out: string[] = [];
  for (const pick of DISPLAY[stage] ?? []) {
    if (typeof pick === "string") {
      const match = all.find((q) => q.toLowerCase().includes(pick.toLowerCase()));
      if (match && !out.includes(match)) out.push(match);
    } else if (!out.includes(pick.new)) {
      out.push(pick.new);
    }
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
