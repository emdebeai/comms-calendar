// Content for the landing page: the verbatim scope/purpose statement and
// four pillars, plus the reference sections (glossary and bibliography are real;
// people and AI-use are structured placeholders).

export interface AboutPage {
  slug: "bibliography" | "glossary" | "people" | "ai-policy";
  title: string;
  intro: string;
}

/** Scope / purpose. The statement is verbatim from the project brief; the
 *  three emphasised words are rendered bold in the landing hero. */
export const INTRO = {
  eyebrow: "Prospective student communications",
};

/** The four qualities the work supports — verbatim from the brief. */
export const PILLARS: { title: string; blurb: string }[] = [
  { title: "End-to-end", blurb: "Encompassing all stages of the journey from Understand to Enrol" },
  { title: "Cross functional", blurb: "Representing all business areas within the portfolio" },
  { title: "User-centric", blurb: "Centring and connecting to the prospective student experience" },
  { title: "Scalable", blurb: "Built for teams to collaboratively develop, iterate and add nuance" },
];

export const PERSONAS = [
  {
    code: "DOM SL",
    name: "Domestic school leaver",
    blurb: "Year 12 domestic student applying to RMIT through VTAC. The persona this map is built around.",
    available: true,
  },
  {
    code: "NSL",
    name: "Domestic non-school leaver",
    blurb: "Mature-age and returning domestic applicants. Not mapped yet.",
    available: false,
  },
  {
    code: "INTON",
    name: "International onshore",
    blurb: "International students already in Australia. Not mapped yet.",
    available: false,
  },
] as const;

/** term → definition */
export const GLOSSARY: { term: string; def: string }[] = [
  { term: "DOM SL", def: "Domestic school leaver — a Year 12 domestic student. The persona this map covers." },
  { term: "NSL", def: "Non-school leaver — a domestic mature-age or returning applicant." },
  { term: "INTON", def: "International onshore — an international student already in Australia." },
  { term: "VTAC", def: "Victorian Tertiary Admissions Centre — the body school leavers apply through." },
  { term: "ATAR", def: "Australian Tertiary Admission Rank — the Year 12 result used for selection." },
  { term: "CoP", def: "Change of Preference — the window to reorder VTAC preferences after results." },
  { term: "SNAP", def: "Schools Network Access Program — RMIT's equity access scheme." },
  { term: "eDM", def: "Electronic direct mail — a marketing email send." },
  { term: "Open Day", def: "RMIT's annual on-campus recruitment event, held across campuses in August." },
  { term: "Touchpoint", def: "A single communication or interaction a student has with RMIT along the journey." },
];

// External, published sources — cited in RMIT Harvard (author-date). URL and
// accessed-date are pending from the team; the org names below need confirming.
export interface Reference {
  author: string;
  year: string;
  title: string;
  publisher: string;
  accessed?: string;
  url?: string;
}
export const REFERENCES: Reference[] = [
  {
    author: "Universities Admissions Centre",
    year: "2024",
    title: "Student Lifestyle & Learning Report 2024",
    publisher: "UAC website",
    accessed: "11 August 2026",
    url: "https://uac.edu.au/uac-student-lifestyle-and-learning-report-2024",
  },
];

// Internal RMIT data — listed separately, not as formal Harvard citations
// (these have no public URL).
export const DATA_SOURCES: { title: string; note: string }[] = [
  {
    title: "MIP (Market Intelligence and Proposition) — Domestic Demand Outlook 2026",
    note: "RMIT internal market-intelligence outlook on domestic demand by field and pathway.",
  },
  {
    title: "RMIT program-page voice-of-customer (Aug 2025 – Aug 2026)",
    note: "Verbatim feedback from domestic current high-school students, by journey stage.",
  },
  {
    title: "Dovetail longitudinal VOC synthesis (2024–2026)",
    note: "The six persistent themes across the domestic undergraduate prospective folder.",
  },
  {
    title: "Enrolment-guide page survey (Qualtrics, HE domestic)",
    note: "187 responses to Aug 2026 on the enrolment experience.",
  },
  {
    title: "Salesforce Study@RMIT enquiry export",
    note: "Record-level inbound enquiries by channel, Aug 2025 – Feb 2026.",
  },
];

/** people consulted — placeholder until confirmed */
export const PEOPLE: { name: string; role: string }[] = [
  { name: "To be confirmed", role: "Marketing — eDMs and campaigns" },
  { name: "To be confirmed", role: "Recruitment — events and schools" },
  { name: "To be confirmed", role: "Admissions and Conversion" },
  { name: "To be confirmed", role: "Study@RMIT / Student Connect" },
];

export const AI_POLICY = {
  intro:
    "How generative AI was used to build this prototype, and the guardrails applied. Placeholder copy below — to be finalised.",
  points: [
    "AI assisted with structuring and building the prototype's code and this site.",
    "All quantitative figures are drawn from the cited sources; AI did not invent data.",
    "Student questions tagged [new] were derived by AI from the supporting evidence and are marked as such.",
    "No personal or student-identifying data was provided to any AI system.",
  ],
};

export const ABOUT_PAGES: AboutPage[] = [
  { slug: "bibliography", title: "Bibliography", intro: "The sources behind the evidence on this map." },
  { slug: "glossary", title: "Glossary", intro: "Terms and acronyms used across the map." },
  { slug: "people", title: "People consulted", intro: "The teams and people who shaped this map." },
  { slug: "ai-policy", title: "How AI was used", intro: "" },
];
