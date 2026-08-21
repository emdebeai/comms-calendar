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

// Order and wording reflect the review notes (docs/question-notes.md): deletes,
// re-orders, cross-stage moves, reframes and merges. Moved/reframed/merged
// questions are authored as { new } so they render in their new home.
const DISPLAY: Record<string, Pick[]> = {
  Understand: [
    "What subjects do I actually need", // #1
    "Which jobs and industries", // #2
    "Do I want to aim for university", // #3
  ],
  Consider: [
    "What ATAR do I need", // #1
    "How much will it cost me", // #2
    "Should I study at [Uni A]", // #3
    "Does this course include work experience", // #4
    // "Which VCE subjects are prerequisites" — deleted (dup; belongs in a
    // pathways map).
  ],
  Decide: [
    // #1 — reframed from "What is the exact process…" (course codes folded in).
    { new: "How do applications even work, and what are the dates (including VTAC and course codes)?" },
    "Am I eligible for a scholarship", // #2
    // #3 — moved here from Understand.
    { new: "What will I actually study — units, majors, and structure year by year?" },
  ],
  Begin: [
    // #1 — merged "Is RMIT the right first choice" + "How do I order my backups",
    // moved from Decide and reframed.
    { new: "How do preferences work? Should my first choice be aspirational or practical?" },
    // #2 — moved here from Submit.
    { new: "Is my course list locked in, or can I still change my mind after I hit submit?" },
  ],
  Submit: [
    // #1 — reframed from "Will I get a confirmation…".
    { new: "What happens between the preferences and getting my results? Do I need to do anything?" },
  ],
  Wait: [
    "When are results released", // #1
    "When are offers made", // #2
    "What support is there if I'm stressed", // #3
    "How does Change of Preference work", // #4
    { new: "How should I order my preferences to get the best offer I can?" }, // #5 (no note)
  ],
  Offer: [
    { new: "I've got an offer — what does it actually mean, and what do I do next?" }, // #1
    "If I accept a backup offer", // #2
    "How long can I defer for", // #3
    // "Can I change my preferences now" — deleted (persona accepts first round).
  ],
  Enrol: [
    "Which subjects do I need to choose", // #1
    "How do I log in for the first time", // #2
    "How do I get timetabling", // #3
    "Who can I talk to if I hit a technical problem", // #4
    // "Why do I have to do these tests" — deleted.
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
    ["What ATAR do I need", "What ATAR do I need?"],
    ["Should I study at [Uni A]", "Which uni?"],
    ["work experience", "Does it include placements?"],
    ["How much will it cost", "What will it cost?"],
    ["VCE subjects are prerequisites", "VCE prerequisites?"],
  ],
  Decide: [
    ["How do applications even work", "How do I apply?"],
    ["eligible for a scholarship", "Any scholarships?"],
    ["What will I actually study", "What will I study?"],
  ],
  Begin: [
    ["How do preferences work", "How do preferences work?"],
    ["course list locked", "Can I still change?"],
  ],
  Submit: [
    ["What happens between the preferences", "What happens next?"],
  ],
  Wait: [
    ["results released", "When are results released?"],
    ["Change of Preference work", "How does CoP work?"],
    ["order my preferences to get the best", "Best preference order?"],
    ["offers made", "When are offers made?"],
    ["stressed while I wait", "Support while I wait?"],
  ],
  Offer: [
    ["what does it actually mean", "What does my offer mean?"],
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
