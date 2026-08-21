// Evidence layer for the student questions — the "why we believe students ask
// this" that used to live only in docs/experience-layer-questions.md. Modelled
// so the map can show, per question: who authored it (the team, or derived
// from data), how strong the backing is, and the sources behind the stage.
//
// Origin  — "team": verbatim from the Student Experience Layer map.
//           "derived": worded by us from the supporting data in that stage.
// Tier    — resolved from the flags below:
//           "triangulated" (▲, backed by UAC + VOC + Dovetail) → audit first,
//           "evidenced"    (has named quantitative/VOC backing),
//           "directional"  (stage marked an evidence gap; proxy data only),
//           "team"         (from the map, no stage-specific new evidence).
// Shown in the question's detail panel (click a bubble), not on the swimlane.

export type QuestionOrigin = "team" | "derived";
export type EvidenceTier = "triangulated" | "evidenced" | "directional" | "team";

export interface EvidenceSource {
  label: string;
  detail: string;
}

interface StageEvidence {
  /** the stage carries an explicit evidence gap (proxy data only) */
  gap?: boolean;
  /** supporting sources for the stage's questions */
  sources: EvidenceSource[];
  /** exact question text → its origin + whether triangulated (▲) */
  questions: Record<string, { origin: QuestionOrigin; triangulated?: boolean }>;
}

const UAC = "UAC Student Lifestyle & Learning Report 2024";
const VOC = "RMIT program-page voice-of-customer";
const DOVE = "Dovetail VOC synthesis (2024–26)";
const ENROL_VOC = "Enrolment-guide survey (Qualtrics, HE)";

const EVIDENCE: Record<string, StageEvidence> = {
  Understand: {
    sources: [
      { label: UAC, detail: "Biggest concerns: planning my future 66%, getting into uni 53% (p.6). Passion for the subject is the #1 course-selection factor at 80% (p.10)." },
      { label: VOC, detail: "Career Outcomes Not Detailed Enough (6 of 9 verbatims); Course Content Depth Insufficient (12 of 26)." },
      { label: DOVE, detail: "“a page specifically containing career options for after graduating” (2025)." },
    ],
    questions: {
      "What subjects do I actually need to take in Year 11 and 12?": { origin: "team" },
      "Do I want to aim for university, vocational training (TAFE), or go straight to work?": { origin: "team" },
      "Which jobs and industries does [Field] actually lead to — and are they hiring?": { origin: "derived", triangulated: true },
      "Is a TAFE or applied pathway a faster route into my field than a degree?": { origin: "derived" },
      "What will I actually study — units, majors, and structure year by year?": { origin: "derived", triangulated: true },
    },
  },
  Consider: {
    sources: [
      { label: UAC, detail: "Choosing where to study: courses on offer 71%, location 58%, vibe & culture 57%, cost 43% (p.9). Cost is an issue for 43%, up from 34% in 2023 (p.3)." },
      { label: VOC, detail: "ATAR / Selection Rank Hard to Find is the single most-cited frustration (15 of 26); Course Fees Unclear or Absent (8 of 10)." },
      { label: DOVE, detail: "“show the cost” (Apr 2025) · “Doesnt provide ATARs for all courses” (Feb 2025)." },
    ],
    questions: {
      "What ATAR am I tracking for? Can I get in early so I can stop stressing?": { origin: "team", triangulated: true },
      "Should I study at [Uni A] or [Uni B]? Which has the better vibe and location?": { origin: "team" },
      "Does this course include work experience, internships or industry placements?": { origin: "derived" },
      "How much will it cost me — fees, transport, and can I study close to home?": { origin: "derived", triangulated: true },
      "Can I study this on campus, blended or fully online?": { origin: "derived" },
      "Which VCE subjects are prerequisites for this course, and what if I haven't done them?": { origin: "derived", triangulated: true },
    },
  },
  Decide: {
    sources: [
      { label: UAC, detail: "33% of students applied for scholarships (p.9). University demand is becoming more price- and employability-driven (p.3)." },
      { label: VOC, detail: "Early Entry and Application Timing Unclear (2 of 5); VTAC / Program / Course Codes surfaced in verbatims." },
      { label: DOVE, detail: "“Couldn't find the date enrolment closes” (Jan 2025)." },
    ],
    questions: {
      "Is RMIT definitely the right first choice, or a plan B backup on my list?": { origin: "team" },
      "What is the exact process to start my application, and what dates do I need to meet?": { origin: "team" },
      "Am I eligible for a scholarship or fee support, and when do I apply?": { origin: "derived" },
      "How do I order RMIT vs my backups so I don't get locked out of a better offer?": { origin: "derived" },
      "What are the VTAC and course codes I need to preference this course?": { origin: "derived" },
    },
  },
  Begin: {
    sources: [
      { label: UAC, detail: "68% hold a digital credential such as a digital ATAR; 26,958 Year 12s have claimed their ATAR through CredFolio (p.11)." },
    ],
    questions: {
      "What do I actually need to have ready on my computer before I open the portal?": { origin: "team" },
      "Do I need to find my Year 11 results, write a personal statement, or submit a portfolio?": { origin: "team" },
      "Can I use my digital ATAR / digital ID to apply, or do I need physical documents?": { origin: "derived" },
    },
  },
  Submit: {
    gap: true,
    sources: [
      { label: UAC, detail: "Proxy only — no VOC covers the portal. Five-star service = friendly, knowledgeable staff 76%; a genuine apology and quick resolution 54% (p.7). 3 in 4 quit a brand after two or three bad experiences (p.3)." },
    ],
    questions: {
      "Is my course list locked in, or can I still change my mind after I hit submit?": { origin: "team" },
      "Why is this upload failing?": { origin: "team" },
      "If something goes wrong mid-submission, how quickly can I get help?": { origin: "derived" },
      "Will I get a confirmation that my application actually went through?": { origin: "derived" },
    },
  },
  Wait: {
    gap: true,
    sources: [
      { label: UAC, detail: "Directional only — no VOC or journey data covers the waiting period. Biggest concerns: financial security 56%, getting into uni 53%, mental health 50% (p.6)." },
    ],
    questions: {
      "When is ATAR release day, and what time do VTAC results go online?": { origin: "team" },
      "How does Change of Preference work?": { origin: "team" },
      "When do VTAC Round 1 offers come out, and what happens if I reject one?": { origin: "team" },
      "Where will my results and offer actually land — will it come to my phone or portal?": { origin: "derived" },
      "What support is there if I'm stressed while I wait?": { origin: "derived" },
    },
  },
  Offer: {
    gap: true,
    sources: [
      { label: UAC, detail: "Directional only — no VOC covers the offer/acceptance experience. 79% plan full-time study; gap-year intent up to 9% (p.4)." },
    ],
    questions: {
      "If I accept a backup offer, can I still get a higher preference in Round 2?": { origin: "team" },
      "When is the reply deadline, and what if I miss it?": { origin: "team" },
      "Can I defer a TAFE offer, or is that only for uni degrees?": { origin: "team" },
      "How long can I defer for, and does deferring affect my scholarship or place?": { origin: "derived" },
      "Can I change my preferences now to get an offer in Round 2?": { origin: "team" },
      "Is there an RMIT diploma or associate degree I can jump into instead?": { origin: "team" },
      "Do I need to contact RMIT directly to apply for a pathway course?": { origin: "team" },
      "Which RMIT diploma or TAFE pathway guarantees credit into my original degree?": { origin: "derived" },
      "Will a pathway cost me more or take longer overall than a direct entry?": { origin: "derived" },
    },
  },
  Enrol: {
    sources: [
      { label: UAC, detail: "Campus services wanted: timetabling 59%, study-skills classes 53%, employment services 51% (p.12)." },
      { label: ENROL_VOC, detail: "Confidence to enrol is the weakest score (3.69; 16% rate it 1–2); 79% arrive from an enrolment email; login/temp-password ~30% of verbatims." },
    ],
    questions: {
      "Which subjects do I need to choose for my first semester?": { origin: "team" },
      "Who can I talk to if I hit a technical problem?": { origin: "team" },
      "Why do I have to do these tests? I already got a place, right?": { origin: "team" },
      "How do I log in for the first time — where's my temporary password?": { origin: "derived", triangulated: false },
      "Where do I actually go to enrol?": { origin: "derived" },
      "How do I get timetabling and class-selection help before semester starts?": { origin: "derived" },
      "What study-skills or peer support is there if I fall behind early?": { origin: "derived" },
    },
  },
};

/** Origin + resolved tier for a question (defaults for anything unmapped). */
export function questionEvidence(
  stage: string,
  question: string,
): { origin: QuestionOrigin; tier: EvidenceTier } {
  const s = EVIDENCE[stage];
  const q = s?.questions[question];
  const origin: QuestionOrigin = q?.origin ?? "derived";
  let tier: EvidenceTier;
  if (s?.gap) tier = "directional";
  else if (q?.triangulated) tier = "triangulated";
  else if (s?.sources.length) tier = "evidenced";
  else tier = "team";
  return { origin, tier };
}

/** The sources + gap flag behind a stage. */
export function stageEvidence(stage: string): { gap: boolean; sources: EvidenceSource[] } {
  const s = EVIDENCE[stage];
  return { gap: s?.gap ?? false, sources: s?.sources ?? [] };
}

export const TIER_LABEL: Record<EvidenceTier, string> = {
  triangulated: "Triangulated — three independent sources",
  evidenced: "Evidenced — named data backing",
  directional: "Directional — proxy data, evidence gap",
  team: "From the experience-layer map",
};
