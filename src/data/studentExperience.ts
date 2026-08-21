// Student experience layer — what prospective students are thinking, needing,
// asking, deciding and doing at each journey stage. Source: "Student
// Experience Layer Text by stages" (Marketing/SX working doc). Shown as a
// collapsible band under the journey-stage header so stakeholders can check
// the comms in each stage against what students actually need there.
//
// Stage labels must match STAGES in src/data/journey.ts. The source doc's
// "NO OFFER (Pivot)" stage has no timeline span of its own — it's folded
// into Offer as a second block.

export interface ExperienceGroup {
  heading: string;
  items: string[];
}

export interface ExperienceBlock {
  /** optional label when a stage holds more than one scenario */
  label?: string;
  groups: ExperienceGroup[];
}

export interface StageExperience {
  /** must match a STAGES label in journey.ts */
  stage: string;
  timing: string;
  blocks: ExperienceBlock[];
}

export const STUDENT_EXPERIENCE: StageExperience[] = [
  {
    stage: "Understand",
    timing: "Year 10 – early Year 11",
    blocks: [
      {
        groups: [
          {
            heading: "Student voice",
            items: [
              "Decided: “I want to do [Field], but I need help with what school subjects to do.”",
              "Undecided: “I have no idea what I want to do, and subject selection is stressing me out. I need help.”",
            ],
          },
          {
            heading: "I need to",
            items: [
              "Figure out what I actually like doing and what jobs match that.",
              "Choose school subjects that keep my options open.",
            ],
          },
          {
            heading: "Questions",
            items: [
              "What subjects do I actually need to take in Year 11 and 12?",
              "Do I want to aim for university, vocational training (TAFE), or go straight to work?",
              "Which jobs and industries does [Field] actually lead to — and are they hiring?",
              "Is a TAFE or applied pathway a faster route into my field than a degree?",
              "What will I actually study — units, majors, and structure year by year?",
            ],
          },
          {
            heading: "Decisions",
            items: [
              "Choosing an ATAR (academic) or non-ATAR/VM (vocational/TAFE) pathway.",
              "Picking 2 or 3 general fields (e.g. health, creative) instead of specific degrees.",
            ],
          },
          {
            heading: "Actions",
            items: [
              "Guidance: 1-on-1 meeting with the school careers advisor.",
              "Chats: discussing senior subject selection with guardians at home.",
              "Casual digging: career quizzes or scrolling “day-in-the-life” social videos.",
            ],
          },
        ],
      },
    ],
  },
  {
    stage: "Consider",
    timing: "late Year 11 – early Year 12",
    blocks: [
      {
        groups: [
          {
            heading: "Student voice",
            items: [
              "Decided: “I know I want to do [Field], but I need to find out which uni actually has the best program or what I am likely to get into (predicted marks/score).”",
              "Undecided: “I have a broad interest in [Area like Business or Science], but I need to see which specific course fits me.”",
            ],
          },
          {
            heading: "I need to",
            items: [
              "Narrow down my options to a shortlist of 2 or 3 actual courses.",
              "Have a backup plan in case my ATAR doesn't match the cut-offs.",
            ],
          },
          {
            heading: "Questions",
            items: [
              "What ATAR do I need?",
              "Should I study at [Uni A] or [Uni B]? Which has the better vibe and location?",
              "Does this course include work experience, internships or industry placements?",
              "How much will it cost me — fees, transport, and can I study close to home?",
              "Can I study this on campus, blended or fully online?",
              "Which VCE subjects are prerequisites for this course, and what if I haven't done them?",
            ],
          },
          {
            heading: "Decisions",
            items: [
              "Locking in 2 or 3 specific courses and institutions to actively look into.",
              "Deciding whether to apply for early entry/early offer schemes or rely on final ATAR results.",
            ],
          },
          {
            heading: "Actions",
            items: [
              "Vibe checks: attending campus events, Open Days and info nights to test out the “vibe”.",
              "Testing scores: using online ATAR calculators to run different score scenarios.",
              "Social proofing: checking Reddit or student forums to find out what a course is really like.",
            ],
          },
        ],
      },
    ],
  },
  {
    stage: "Decide",
    timing: "mid–late Year 12",
    blocks: [
      {
        groups: [
          {
            heading: "Student voice",
            items: [
              "Decided: “I'm putting RMIT as my first preference. Now I just need to get the application started.”",
              "Undecided: “I'm still not 100% sure, so I'm adding an RMIT course and a few pathway backups to my preference list to play it safe.”",
            ],
          },
          {
            heading: "I need to",
            items: [
              "Finalise my preference strategy.",
              "Take the plunge, open the portal, and actually begin my application.",
            ],
          },
          {
            heading: "Questions",
            items: [
              "Is RMIT definitely the right first choice, or a plan B backup on my list?",
              "What is the exact process to start my application, and what dates do I need to meet?",
              "Am I eligible for a scholarship or fee support, and when do I apply?",
              "How do I order RMIT vs my backups so I don't get locked out of a better offer?",
              "What are the VTAC and course codes I need to preference this course?",
            ],
          },
          {
            heading: "Decisions",
            items: [
              "Whether to place RMIT as a high-priority preference or strategic backup on the application list.",
              "Stop researching and actually click “Apply” to start the process.",
            ],
          },
          {
            heading: "Actions",
            items: [
              "Evidence: looking at program pages, or speaking to RMIT staff.",
              "Preference drafting: mapping course orders and placing RMIT strategically.",
              "Portal onboarding: clicking “Apply”, creating an account, and starting the form.",
            ],
          },
        ],
      },
    ],
  },
  {
    stage: "Begin",
    timing: "late Year 12",
    blocks: [
      {
        groups: [
          {
            heading: "Student voice",
            items: [
              "Decided: “I'm starting today. Just need to grab my marks and (portfolio) files first.”",
              "Undecided: “About to apply. Better write down my backup course codes first so I'm ready.”",
            ],
          },
          {
            heading: "I need to",
            items: [
              "Gather all my documents together so I don't get stuck mid-form.",
              "Make sure I meet the entry rules before I start writing.",
            ],
          },
          {
            heading: "Questions",
            items: [
              "What do I actually need to have ready on my computer before I open the portal?",
              "Do I need to find my Year 11 results, write a personal statement, or submit a portfolio?",
              "Can I use my digital ATAR / digital ID to apply, or do I need physical documents?",
            ],
          },
          {
            heading: "Decisions",
            items: [
              "Whether they have enough documents to begin the application now, or need to wait.",
              "What documents they can gather themselves versus what they need to ask their school or parents for.",
            ],
          },
          {
            heading: "Actions",
            items: [
              "Gathering files: snapping photos of IDs, school transcripts, or organising creative work.",
              "Requirement checking: reviewing the course page's entry checklist one last time.",
            ],
          },
        ],
      },
    ],
  },
  {
    stage: "Submit",
    timing: "late Year 12 · in portal",
    blocks: [
      {
        groups: [
          {
            heading: "Student voice",
            items: [
              "Decided: “I'm in the portal. I just want to fill out my details, upload my docs, and get this application submitted.”",
              "Undecided: “I'm filling out the form, but I'm still tweaking my backup options and order on the list before I hit the final button.”",
            ],
          },
          {
            heading: "I need to",
            items: [
              "Get through this application form without making any mistakes.",
              "Get this application submitted before the deadline.",
            ],
          },
          {
            heading: "Questions",
            items: [
              "Is my course list locked in, or can I still change my mind after I hit submit?",
              "Why is this upload failing?",
              "If something goes wrong mid-submission, how quickly can I get help?",
              "Will I get a confirmation that my application actually went through?",
            ],
          },
          {
            heading: "Decisions",
            items: [
              "Stop double-checking and actually submit the application.",
              "Submit now with standard details, or wait until a creative portfolio or extra document is fully ready.",
            ],
          },
          {
            heading: "Actions",
            items: [
              "Form progression: entering information and course choices.",
              "Doc uploading: snapping photos of IDs, school transcripts, or uploading portfolios.",
              "Final submission: clicking “Submit” and paying registration fees if required.",
            ],
          },
        ],
      },
    ],
  },
  {
    stage: "Wait",
    timing: "late Year 12 · post-submission",
    blocks: [
      {
        groups: [
          {
            heading: "Student voice",
            items: [
              "Decided: “What if my early offer or portfolio gets rejected? I need to know how to adjust my preferences.”",
              "Undecided: “No ATAR or bad marks? I need to know how I change preferences for a TAFE pathway.”",
            ],
          },
          {
            heading: "I need to",
            items: [
              "Survive the wait without losing my mind.",
              "Be ready to change my preference list the second ATARs are released.",
            ],
          },
          {
            heading: "Questions",
            items: [
              "When are results released?",
              "How does Change of Preference work?",
              "When are offers made?",
              "Where will my results and offer actually land — will it come to my phone or portal?",
              "What support is there if I'm stressed while I wait?",
            ],
          },
          {
            heading: "Decisions",
            items: [
              "Whether to keep their course order or shuffle preferences after seeing results.",
              "Whether to accept a pathway offer as a safety net or wait for subsequent rounds.",
            ],
          },
          {
            heading: "Actions",
            items: [
              "Result retrieval: refreshing VTAC at 7:00 AM on release day.",
              "Preference shuffling: shuffling course orders during Change of Preference.",
              "Advisory hotlines: calling RMIT for backup pathway options.",
            ],
          },
        ],
      },
    ],
  },
  {
    stage: "Offer",
    timing: "post-results",
    blocks: [
      {
        label: "Offer received",
        groups: [
          {
            heading: "Student voice",
            items: [
              "Decided: “I want to lock in my RMIT offer, but find out how to defer for a gap year.”",
              "Undecided: “I want to accept my backup offer, but stay eligible for a Round 2 upgrade.”",
            ],
          },
          {
            heading: "I need to",
            items: [
              "Lock in my RMIT offer before the deadline so I don't lose my spot.",
              "Figure out how to defer this for a gap year or keep my Round 2 options open.",
            ],
          },
          {
            heading: "Questions",
            items: [
              "If I accept a backup offer, can I still get a higher preference in Round 2?",
              "When is the reply deadline, and what if I miss it?",
              "Can I defer a TAFE offer, or is that only for uni degrees?",
              "How long can I defer for, and does deferring affect my scholarship or place?",
            ],
          },
          {
            heading: "Decisions",
            items: [
              "Deciding to accept, defer, or decline the offer.",
              "Accepting a backup offer as a safety net while waiting for later rounds.",
            ],
          },
          {
            heading: "Actions",
            items: [
              "Portal response: clicking accept, defer, or decline in the student portal.",
              "Rule verification: reading the offer letter guidelines to prevent accidental lapses.",
              "Sharing outcomes: telling parents and careers advisors to plan the enrolment next steps.",
            ],
          },
        ],
      },
      {
        label: "No offer — the pivot",
        groups: [
          {
            heading: "Student voice",
            items: [
              "Decided: “I want to find another way into RMIT, even if I have to start with a backup pathway.”",
              "Undecided: “I want to quickly find a backup plan so I don't end up with nothing.”",
            ],
          },
          {
            heading: "I need to",
            items: [
              "Look up RMIT associate degrees or diplomas that pathway into my original course.",
              "Quickly rearrange my preferences or contact RMIT support before the next round cutoffs.",
            ],
          },
          {
            heading: "Questions",
            items: [
              "Can I change my preferences now to get an offer in Round 2?",
              "Is there an RMIT diploma or associate degree I can jump into instead?",
              "Do I need to contact RMIT directly to apply for a pathway course?",
              "Which RMIT diploma or TAFE pathway guarantees credit into my original degree?",
              "Will a pathway cost me more or take longer overall than a direct entry?",
            ],
          },
          {
            heading: "Decisions",
            items: [
              "Pivoting to an RMIT TAFE/diploma pathway instead of waiting a year.",
              "Shifting VTAC preferences to target lower-entry courses before the cutoff.",
            ],
          },
          {
            heading: "Actions",
            items: [
              "Pathway lookup: checking the RMIT website for diploma/associate degree entry requirements.",
              "Immediate shuffling: rearranging VTAC preferences for the next offer round.",
              "Support booking: calling RMIT Student Connect or attending a last-minute info session.",
            ],
          },
        ],
      },
    ],
  },
  {
    stage: "Enrol",
    timing: "new student",
    blocks: [
      {
        groups: [
          {
            heading: "Student voice",
            items: [
              "Committed: “I've accepted my offer and I'm ready to lock this in and start my journey at RMIT.”",
              "Anxious: “I need to make sure my enrolment goes through correctly so I don't lose my spot.”",
            ],
          },
          {
            heading: "I need to",
            items: [
              "Complete the online enrolment steps to officially secure my place.",
              "Confirm my course structure and enrol in the correct classes.",
              "Finalise my student account and access my digital campus tools.",
            ],
          },
          {
            heading: "Questions",
            items: [
              "Which subjects do I need to choose for my first semester?",
              "Who can I talk to if I hit a technical problem?",
              "Why do I have to do these tests? I already got a place, right?",
              "How do I log in for the first time — where's my temporary password?",
              "Where do I actually go to enrol?",
              "How do I get timetabling and class-selection help before semester starts?",
              "What study-skills or peer support is there if I fall behind early?",
            ],
          },
          {
            heading: "Decisions",
            items: [
              "Whether these specific subjects are the right fit for career goals this semester.",
              "Move forward with formalising student status now to secure the place.",
            ],
          },
          {
            heading: "Actions",
            items: [
              "Portal completion: entering personal and academic details to finalise the official enrolment.",
              "Course selection: choosing and confirming core subjects and electives for the semester.",
              "Access setup: activating student accounts and verifying access to university systems.",
            ],
          },
        ],
      },
    ],
  },
];

// ── Question ↔ comms links ────────────────────────────────────────────────
//
// The alignment layer: which comms speak to which student question. The tool
// deliberately does NOT judge whether coverage is good — it just draws the
// line so teams can see it. Hover/click a question in the stage panel and the
// linked comms light up on the canvas; a question with no links dims
// everything, which is the gap made visible.
//
// Links reference comms by id (the slugified title — same rule as the CSV's
// `triggers` column, see commsSchema.ts). `match` is a case-insensitive
// substring of the question text, so rewording a question slightly doesn't
// silently orphan its links (and a broken match just means "no links", never
// an error).
//
// Worked example: Change of Preference. One student question in Wait — "How
// does Change of Preference work?" — mapped to the full COP cluster across
// Marketing (eDMs) and Recruitment (event + confirmation). Add more links the
// same way, or let teams call them out in feedback until they're captured
// here.

export interface QuestionLink {
  /** STAGES label the question lives under */
  stage: string;
  /** case-insensitive substring of the question text */
  match: string;
  /** linked comm ids (slugified titles) */
  commIds: string[];
}

export const QUESTION_LINKS: QuestionLink[] = [
  // Generated by scripts/apply-edm-review.mjs from marketing's review.
  // `match` is the full question text (unambiguous). Re-run the script to
  // refresh; edit by hand only for links the review can't express.
  {
    stage: "Understand",
    match: "Do I want to aim for university, vocational training (TAFE), or go straight to work?",
    commIds: [
      "what-is-vocational-study",
      "what-is-vocational-study-2",
      "what-is-vocational-study-3",
    ],
  },
  {
    stage: "Understand",
    match: "Is a TAFE or applied pathway a faster route into my field than a degree?",
    commIds: [
      "what-are-pathways",
      "what-are-pathways-2",
      "what-are-pathways-3",
    ],
  },
  {
    stage: "Consider",
    match: "Should I study at [Uni A] or [Uni B]? Which has the better vibe and location?",
    commIds: [
      "become-an-rmit-student-for-a-day",
      "become-an-rmit-student-for-a-day-2",
      "best-questions-to-ask-on-the-day",
      "best-questions-to-ask-on-the-day-2",
      "best-questions-to-ask-on-the-day-3",
      "discover-melbourne",
      "discover-melbourne-2",
      "discover-melbourne-3",
      "only-at-brunswick",
      "only-at-bundoora",
      "only-at-open-day-can-you",
      "only-at-rmit-open-day",
      "only-at-rmit-open-day-2",
      "only-at-rmit-open-day-3",
      "only-at-the-city-campus",
      "open-day-brunswick",
      "open-day-brunswick-registration-confirmation",
      "open-day-bundoora-campus",
      "open-day-bundoora-campus-registration-confirmation",
      "open-day-city",
      "open-day-city-registration-confirmation",
      "register-for-open-day-and-win",
      "the-open-day-guide-is-live",
      "the-open-day-guide-is-live-2",
    ],
  },
  {
    stage: "Decide",
    match: "Am I eligible for a scholarship or fee support, and when do I apply?",
    commIds: [
      "what-to-know-about-scholarships",
      "what-to-know-about-scholarships-2",
      "what-to-know-about-scholarships-3",
    ],
  },
  {
    stage: "Decide",
    match: "How do I order RMIT vs my backups so I don't get locked out of a better offer?",
    commIds: [
      "explore-a-future-with-rmit",
      "explore-a-future-with-rmit-2",
      "explore-a-future-with-rmit-3",
      "explore-a-future-with-rmit-4",
      "there-s-still-time-to-preference-rmit",
      "there-s-still-time-to-preference-rmit-2",
    ],
  },
  {
    stage: "Decide",
    match: "Is RMIT definitely the right first choice, or a plan B backup on my list?",
    commIds: [
      "why-choose-rmit",
    ],
  },
  {
    stage: "Decide",
    match: "What is the exact process to start my application, and what dates do I need to meet?",
    commIds: [
      "here-s-a-glimpse-of-2026",
      "here-s-a-glimpse-of-2026-2",
      "here-s-a-glimpse-of-2026-3",
      "we-re-here-to-help-preference-rmit",
      "what-s-next-after-open-day",
    ],
  },
  {
    stage: "Wait",
    match: "How does Change of Preference work?",
    commIds: [
      "change-of-preference-closes-today",
      "cop-explained",
      "cop-explained-2",
    ],
  },
  {
    stage: "Wait",
    match: "When are offers made?",
    commIds: [
      "explore-a-future-with-rmit-5",
    ],
  },
  {
    stage: "Wait",
    match: "When are results released?",
    commIds: [
      "vtac-results-are-released-today",
    ],
  },
];

/** Comm ids linked to a question (empty = no links mapped yet). */
export function linkedCommIds(stageLabel: string, question: string): string[] {
  const q = question.toLowerCase();
  return (
    QUESTION_LINKS.find((l) => l.stage === stageLabel && q.includes(l.match.toLowerCase()))
      ?.commIds ?? []
  );
}

/** Reverse lookup: the student questions a comm is linked to. */
export function linkedQuestions(commId: string): { stage: string; question: string }[] {
  const out: { stage: string; question: string }[] = [];
  for (const link of QUESTION_LINKS) {
    if (!link.commIds.includes(commId)) continue;
    const stage = STUDENT_EXPERIENCE.find((s) => s.stage === link.stage);
    const question = stage?.blocks
      .flatMap((b) => b.groups)
      .filter((g) => g.heading === "Questions")
      .flatMap((g) => g.items)
      .find((q) => q.toLowerCase().includes(link.match.toLowerCase()));
    if (question) out.push({ stage: link.stage, question });
  }
  return out;
}

/** All questions for a stage, flattened across blocks (Offer has two). */
export function stageQuestions(stageLabel: string): string[] {
  const stage = STUDENT_EXPERIENCE.find((s) => s.stage === stageLabel);
  return (
    stage?.blocks
      .flatMap((b) => b.groups)
      .filter((g) => g.heading === "Questions")
      .flatMap((g) => g.items) ?? []
  );
}
