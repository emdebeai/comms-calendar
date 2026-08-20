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
  eyebrow: "Prospective student touch points",
  body: [
    "By creating and working from a holistic view of the future student experience, we will enable the business to consider the needs and goals of students at each step of the journey, as well as considering the journey as an end-to-end experience.",
    "This will support discussions and decision making that is anchored in what a student is experiencing outside and beyond a discrete touchpoint.",
  ],
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
    title: "MIP (Market Intelligence and Proposition): Domestic Demand Outlook 2026",
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

// Aligned to the RMIT AI Governance Framework (March 2024), the Responsible
// AI Procedure and the IT Acceptable Use Standard. The deployed map contains
// no AI at runtime; AI was the development tool.
export const AI_POLICY = {
  sections: [
    {
      heading: "What AI did",
      points: [
        "Generative AI (Anthropic Claude) assisted in building this prototype: the code, the data processing, and this site.",
        "Student questions tagged [new] were derived by AI from the cited evidence and are marked as such wherever they appear.",
        "All quantitative figures come from the cited sources. AI did not invent data, and gaps are shown as gaps rather than filled with defaults.",
      ],
    },
    {
      heading: "What AI never saw",
      points: [
        "No student or staff personal identifiers. The enquiry data used contains no names, contact details or IDs, and student feedback quotes are de-identified.",
        "Parent and careers-advisor records were excluded from the persona analysis.",
      ],
    },
    {
      heading: "Human oversight",
      points: [
        "Every AI-assisted output is reviewed by a person before it lands, with full change history kept in version control.",
        "Steps that write review outcomes back into the map run only when a person triggers them and reviews the result.",
      ],
    },
    {
      heading: "Where this runs",
      points: [
        "The prototype is a password-gated proof of concept in a private repository, on temporary hosting while an enterprise-approved home is arranged.",
        "The map itself contains no AI at runtime.",
      ],
    },
  ],
};

export const ABOUT_PAGES: AboutPage[] = [
  { slug: "bibliography", title: "Bibliography", intro: "" },
  { slug: "glossary", title: "Glossary", intro: "" },
  { slug: "people", title: "People consulted", intro: "" },
  { slug: "ai-policy", title: "How AI was used", intro: "" },
];
