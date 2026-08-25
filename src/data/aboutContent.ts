// Content for the landing page: the verbatim scope/purpose statement and
// four pillars, plus the reference sections (glossary and bibliography are real;
// people and AI-use are structured placeholders).

export interface AboutPage {
  slug: "bibliography" | "glossary" | "people";
  title: string;
  intro: string;
}

/** Scope / purpose. The statement is verbatim from the project brief; the
 *  three emphasised words are rendered bold in the landing hero. */
export const INTRO = {
  eyebrow: "Prospective student touchpoints",
  body: [
    "By creating and working from a holistic view of the future student experience, this tool hopes to enable teams at RMIT to identify opportunities and pain points whilst considering the needs and goals of students at each step of the journey, as well as the end-to-end experience.",
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
    blurb: "Year 12 domestic student applying to RMIT through VTAC.",
    available: true,
  },
  {
    code: "NSL",
    name: "Domestic non-school leaver",
    blurb: "Mature-age and returning domestic applicants.",
    available: false,
  },
  {
    code: "INTON",
    name: "International onshore",
    blurb: "International students already in Australia.",
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
    note: "Thematic analysis of feedback from domestic current high-school students, by journey stage. The raw verbatims were analysed outside this tool; themes only here.",
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

// People consulted — by role, as little org trees per division. `reports`
// nests one or two levels deep; `team` is the "| …" business-area suffix.
export interface OrgNode {
  role: string;
  team?: string;
  reports?: OrgNode[];
}
export const SPONSOR = "Director, Digital & Experience";
export const CONSULTED: { division: string; leads: OrgNode[] }[] = [
  {
    division: "Global Student Recruitment",
    leads: [
      {
        role: "Assistant Director, Student Recruitment (Australia)",
        reports: [
          { role: "Senior Manager, Student Recruitment" },
          { role: "Senior Manager, Student Recruitment Events & Initiatives" },
        ],
      },
      {
        role: "Assistant Director, Global Sales & Conversion",
        reports: [
          { role: "Senior Manager, Global Sales & Services", team: "Customer Service & Sales" },
          { role: "Prospective Student Performance Manager", team: "Customer Service & Sales" },
        ],
      },
      {
        role: "Associate Director, Admissions, Pathways & Operations",
        reports: [
          {
            role: "Manager, Admissions",
            reports: [{ role: "Project Officer, Admissions", team: "VTAC" }],
          },
        ],
      },
    ],
  },
  {
    division: "Global Marketing",
    leads: [
      {
        role: "Associate Director, Audiences, Campaigns & Media",
        reports: [
          { role: "Segment Manager", team: "Audiences" },
          { role: "Campaign Manager", team: "Audiences" },
        ],
      },
    ],
  },
  {
    division: "Digital & Experience",
    leads: [
      { role: "Assistant Director, Customer Experience" },
      {
        role: "CRM Enablement Manager",
        reports: [{ role: "CRM Specialist and Project Lead" }],
      },
      {
        role: "Associate Director, Digital Engagement",
        reports: [
          { role: "Senior Manager, Digital Experience" },
          { role: "Digital Experience Manager" },
        ],
      },
      {
        role: "Associate Director, Digital Data and Experience Platforms",
        reports: [{ role: "CRM and Automation Manager" }],
      },
      { role: "Senior Product Owner" },
    ],
  },
];

export const ABOUT_PAGES: AboutPage[] = [
  { slug: "bibliography", title: "Bibliography", intro: "" },
  { slug: "glossary", title: "Glossary", intro: "" },
  { slug: "people", title: "People consulted", intro: "" },
];
