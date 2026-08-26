// Free-text notes about individual comms — the NARRATIVE that used to live
// inside CSV cells. The CSVs in data/comms/ hold terse values only (labels,
// tags, dates); anything that reads as a sentence lives here, keyed by comm
// id (the slugified title, or the row's explicit id), and renders in the
// detail panel's Notes row.
export const COMM_NOTES: Record<string, string> = {
  // ── Admissions / Conversion — offer-to-enrol sequencing ──
  "congratulations-first-name-you-re-in":
    "Offer Round 1 offer letter. Admissions sends Conversion the VTAC offers file, which sets off the post-offer sequence.",
  "vtac-post-offer-sms":
    "Same day as the offer letters. Sent off the VTAC offers file provided by Admissions.",
  "congratulations-first-name-for-receiving-an-rmit-offer":
    "EDM1 — Enrolment Reminder (HE). Two weeks after the post-offer SMS.",
  "sms2-do-you-need-enrolment-support": "Two weeks after the enrolment reminder.",
  "first-name-last-chance-to-complete-your-enrolment":
    "Last Day to Enrol EDM. Five days before Semester 1 classes start (1 March 2027).",

  // ── Digital ──
  "campus-tours-webpage":
    "40% of all traffic arrived from the “Here’s a glimpse of 2026” eDM’s second CTA (April School Holiday Tours).",

  // ── Recruitment events — what happens on the day ──
  "rmit-on-campus-experience": "SNAP presented on the day (presentation / postcards).",
  "april-school-holidays-campus-tour-bundoora":
    "Health labs, medical science & education facilities. SNAP presented on the day (presentation / postcards).",
  "april-school-holidays-campus-tour-city":
    "Attendees choose a study-area session. SNAP presented on the day (presentation / postcards).",
  "school-expo-school-run-rmit-attending":
    "Subject selection help. SNAP presented on the day (presentation / postcards).",
  "vce-and-careers-expo-mcec":
    "Year 11s are ~40% of attendees. ATAR, preferencing and prerequisite guides. SNAP presented on the day (presentation / postcards).",
  "rmit-student-for-a-day":
    "Workshops across two program areas. SNAP presented on the day (presentation / postcards).",
  "open-day-bundoora-campus": "SNAP presented on the day (presentation / postcards).",
  "open-day-city": "SNAP presented on the day (presentation / postcards).",
  "open-day-brunswick": "SNAP presented on the day (presentation / postcards).",
};

export function commNote(commId: string): string | undefined {
  return COMM_NOTES[commId];
}
