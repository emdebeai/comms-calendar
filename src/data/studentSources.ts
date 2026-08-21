// The sources behind each stage's student questions — shown in a question's
// detail panel (click a bubble), not on the swimlane. Themes come from the
// voice-of-customer synthesis (RMIT program-page feedback + Dovetail) and the
// UAC report; illustrative verbatims are folded into the theme, not left to
// stand alone. Stages with no direct research are flagged as a gap (proxy
// data only).

export interface EvidenceSource {
  label: string;
  detail: string;
}

interface StageEvidence {
  gap?: boolean;
  sources: EvidenceSource[];
}

const UAC = "UAC Student Lifestyle & Learning Report 2024";
const VOC = "RMIT voice-of-customer (program pages + Dovetail)";
const ENROL_VOC = "Enrolment-guide survey (Qualtrics, HE)";

const EVIDENCE: Record<string, StageEvidence> = {
  Understand: {
    sources: [
      {
        label: UAC,
        detail:
          "Biggest concerns: planning my future (66%) and getting into uni (53%). Passion for the subject is the top course-selection factor (80%).",
      },
      {
        label: VOC,
        detail:
          "Course pages don't make clear where a study actually leads, and content depth feels thin. Verbatim: “a page specifically containing career options for after graduating.”",
      },
    ],
  },
  Consider: {
    sources: [
      {
        label: UAC,
        detail:
          "Choosing where to study: courses on offer (71%), location (58%), vibe & culture (57%), cost (43%, up from 34% in 2023).",
      },
      {
        label: VOC,
        detail:
          "ATAR and selection rank are the most-cited frustration — hard to find on course pages. Fees are unclear or missing. Verbatims: “show the cost”; “doesn't provide ATARs for all courses.”",
      },
    ],
  },
  Decide: {
    sources: [
      {
        label: UAC,
        detail:
          "A third of students apply for scholarships. University demand is increasingly price- and employability-driven.",
      },
      {
        label: VOC,
        detail:
          "Early-entry and application timing is unclear; VTAC, program and course codes come up repeatedly. Verbatim: “couldn't find the date enrolment closes.”",
      },
    ],
  },
  Begin: {
    sources: [
      {
        label: UAC,
        detail:
          "68% hold a digital credential such as a digital ATAR; 26,958 Year 12s have already claimed their ATAR digitally.",
      },
    ],
  },
  Submit: {
    gap: true,
    sources: [
      {
        label: UAC,
        detail:
          "No direct voice-of-customer covers the application portal — proxy only. A five-star experience means knowledgeable staff (76%) and a quick, genuine fix when something goes wrong (54%); three in four leave a brand after two or three bad experiences.",
      },
    ],
  },
  Wait: {
    gap: true,
    sources: [
      {
        label: UAC,
        detail:
          "No direct data covers the waiting period — proxy only. Biggest concerns while waiting: financial security (56%), getting into uni (53%), mental health (50%).",
      },
    ],
  },
  Offer: {
    gap: true,
    sources: [
      {
        label: UAC,
        detail:
          "No direct data covers the offer and acceptance experience — proxy only. 79% plan full-time study; gap-year intent has risen to 9%.",
      },
    ],
  },
  Enrol: {
    sources: [
      {
        label: UAC,
        detail:
          "Campus services students want most: timetabling help (59%), study-skills classes (53%), employment services (51%).",
      },
      {
        label: ENROL_VOC,
        detail:
          "Confidence to enrol is the survey's weakest score. Most students arrive from an enrolment email, and first-time login and temporary-password questions dominate the feedback.",
      },
    ],
  },
};

/** The sources + gap flag behind a stage's questions. */
export function stageEvidence(stage: string): { gap: boolean; sources: EvidenceSource[] } {
  const s = EVIDENCE[stage];
  return { gap: s?.gap ?? false, sources: s?.sources ?? [] };
}
