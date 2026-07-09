import type { Comm, CommType, Team } from "../data/types";

// Shared row schema for comms, however they're sourced (local CSV today,
// a SharePoint Excel table once that's wired up). Both src/lib/loadComms.ts
// (browser) and server/dataStore.ts (Node) import this — it's pure, no
// DOM or Node-only APIs, so it works in both.
//
// id            ignored on read — every row gets an id auto-generated from
//               its title (see slugify below), so a spreadsheet's own
//               id/row-number column (however messy) never has to be
//               trusted. The rule is mechanical and worth knowing if you
//               want to reference a row from "triggers": lowercase the
//               title, replace anything that isn't a letter or number with
//               a hyphen, trim leading/trailing hyphens. E.g. "Subject
//               Selection Guide!" -> "subject-selection-guide". Two rows
//               with the same title get "-2", "-3" etc appended in sheet
//               order, so keep titles unique if you plan to link to them.
// team          Recruitment / Marketing / Admissions / Conversion
// title         comm name
// cta           primary call to action
// type          Email / SMS / Webinar / Call / Event
// school_year   10 / 11 / 12 / Post
// month         Jan..Dec (full name or abbreviation)
// day           optional, 1-31 — leave blank to place it mid-month
// moment        optional — id of a moment from src/data/journey.ts
//               (openday-y11, openday-y12, vtac-close, cop, offers, oweek)
// triggers      optional — semicolon-separated ids (the auto-generated
//               slug described above, not free text) of comms this one
//               sets off. An id that doesn't match anything is dropped
//               silently rather than erroring the whole import.
// secondary_cta_1 / secondary_cta_2
//               optional — extra CTAs shown in the comm's detail panel.
//               Kept at the END of the column order so older sheets
//               without them still load.

export const COMMS_COLUMNS = [
  "id",
  "team",
  "title",
  "cta",
  "type",
  "school_year",
  "month",
  "day",
  "moment",
  "triggers",
  "secondary_cta_1",
  "secondary_cta_2",
] as const;

const TEAMS: Team[] = ["recruitment", "marketing", "admissions", "conversion"];
const TYPES: CommType[] = ["email", "sms", "webinar", "call", "event"];
const MONTH_NAMES = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function matchTeam(raw: string): Team {
  const norm = raw.trim().toLowerCase();
  const found = TEAMS.find((t) => t === norm || t.startsWith(norm));
  if (!found) {
    throw new Error(`Unknown team "${raw}" — expected one of ${TEAMS.join(", ")}`);
  }
  return found;
}

function matchType(raw: string): CommType {
  const norm = raw.trim().toLowerCase();
  const aliases: Record<string, CommType> = {
    "in-person": "event",
    "in-person event": "event",
    "event": "event",
  };
  const found = aliases[norm] ?? TYPES.find((t) => t === norm || t.startsWith(norm));
  if (!found) {
    throw new Error(`Unknown comm type "${raw}" — expected one of ${TYPES.join(", ")}`);
  }
  return found;
}

function schoolYearOffset(raw: string): number {
  const norm = raw.trim().toLowerCase();
  if (norm.includes("10")) return 0;
  if (norm.includes("11")) return 12;
  if (norm.includes("12")) return 24;
  if (norm.includes("post")) return 36;
  throw new Error(`Unknown school year "${raw}" — expected 10, 11, 12, or Post`);
}

function monthOffset(raw: string): number {
  const norm = raw.trim().toLowerCase().slice(0, 3);
  const idx = MONTH_NAMES.indexOf(norm);
  if (idx === -1) throw new Error(`Unknown month "${raw}"`);
  return idx;
}

/** Converts school_year + month + optional day into the internal month
 *  float (0 = Jan of Year 10). Day only nudges position within the month —
 *  it doesn't need to be calendar-precise. */
function toMonthValue(schoolYear: string, month: string, day: string): number {
  const base = schoolYearOffset(schoolYear) + monthOffset(month);
  const d = day ? Number(day) : 15;
  const frac = Number.isFinite(d) ? Math.min(Math.max((d - 1) / 30, 0), 0.97) : 0.47;
  return base + frac;
}

/** Normalizes one raw row (string values, lowercase keys) into a Comm. Any
 *  "id" value in the row is ignored — the id is always derived from the
 *  title, since spreadsheet id columns can't be trusted to be meaningful
 *  or unique. `usedIds` tracks ids already assigned so far in the batch,
 *  so titles that repeat get a disambiguating suffix. `triggers` on the
 *  returned Comm still holds the raw id references as typed — call
 *  resolveTriggers() on the full batch afterward to drop any that don't
 *  match a real id. */
export function normalizeCommRow(
  row: Record<string, string>,
  rowNumberForErrors: number,
  usedIds: Set<string>,
): Comm {
  if (!row.team) throw new Error(`Row ${rowNumberForErrors}: missing team`);
  if (!row.title) throw new Error(`Row ${rowNumberForErrors}: missing title`);
  if (!row.school_year) throw new Error(`Row ${rowNumberForErrors}: missing school_year`);
  if (!row.month) throw new Error(`Row ${rowNumberForErrors}: missing month`);

  let id = slugify(row.title);
  while (usedIds.has(id)) id = `${id}-2`;
  usedIds.add(id);

  return {
    id,
    team: matchTeam(row.team),
    title: row.title,
    cta: row.cta || "Learn more",
    secondaryCta1: row.secondary_cta_1 || undefined,
    secondaryCta2: row.secondary_cta_2 || undefined,
    type: matchType(row.type || "email"),
    month: toMonthValue(row.school_year, row.month, row.day),
    row: 0, // overwritten by layoutTimeline on the client
    momentId: row.moment || undefined,
    triggers: row.triggers
      ? row.triggers.split(";").map((t) => t.trim()).filter(Boolean)
      : undefined,
  };
}

/** Drops any `triggers` reference that isn't a real id in this batch
 *  (typo, stale reference to a deleted row, etc.) rather than leaving a
 *  dangling link. Matching is case-insensitive since ids are otherwise
 *  already lowercase. Call once over the full batch after parsing. */
export function resolveTriggers(comms: Comm[]): Comm[] {
  const byId = new Set(comms.map((c) => c.id));

  return comms.map((c) => {
    if (!c.triggers || c.triggers.length === 0) return c;
    const resolved = c.triggers.filter((ref) => byId.has(ref.trim().toLowerCase()));
    return { ...c, triggers: resolved.length > 0 ? resolved : undefined };
  });
}
