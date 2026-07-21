import { MOMENTS } from "../data/journey";
import type { Comm, CommType, Platform, Team } from "../data/types";

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
// moment        optional — the moment-that-matters this comm ties to, by
//               NAME (as shown on the timeline): "Open Day · Yr 11",
//               "Open Day · Yr 12", "VTAC Timely Close", "Change of
//               Preference", "Offer Round", "O-Week". Ids still work too.
//               An unrecognised value is ignored (no band linked).
// triggers      optional — semicolon-separated list of the OTHER comms this
//               one relates to, by their exact title (e.g. "Open Day –
//               Bundoora Campus"). Titles are auto-slugified to match, so
//               you don't need to know the internal id. A title that
//               doesn't match anything is dropped silently rather than
//               erroring the whole import.
// secondary_cta_1 / secondary_cta_2
//               optional — extra CTAs shown in the comm's detail panel.
//               Kept at the END of the column order so older sheets
//               without them still load.
// marketo_id    optional — source campaign id (the digits between SL- and
//               the date in a Marketo email name). Shown in the detail panel.
// open_rate / click_rate
//               optional — send-performance metrics, stored verbatim as
//               display strings (e.g. "56.7%"). Also END-of-order for
//               back-compat.
// platform      optional — the system a comm is SENT out of: Marketo
//               (marketing eDMs), Cvent (event confirmation emails),
//               ClickSend (text messages). Leave blank and it's inferred
//               from the channel — email→Marketo, sms→ClickSend — so only
//               event-confirmation EMAILS (which go out of Cvent, not
//               Marketo) need it set. In-person events aren't "sent" and get
//               no platform unless one is stated.
// time          optional — run time for in-person events, written however
//               the source writes it (e.g. "10am – 4pm"). Free text: it's
//               shown in the detail panel but never parsed, since the
//               timeline positions a comm by its date alone. Leave blank
//               for anything that isn't an event.

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
  "marketo_id",
  "open_rate",
  "click_rate",
  "platform",
  "time",
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

// Forgiving platform lookup — accepts the common ways teams write each one.
const PLATFORM_ALIASES: Record<string, Platform> = {
  marketo: "marketo",
  "adobe": "marketo",
  "adobe marketo": "marketo",
  "adobe marketo engage": "marketo",
  cvent: "cvent",
  clicksend: "clicksend",
  "click send": "clicksend",
};

/** Resolves the `platform` cell — the system a comm is *sent* out of. An
 *  explicit value wins; a blank (or unrecognised) one falls back to the
 *  channel default: email→Marketo, sms→ClickSend. So the CSV only names a
 *  platform when it breaks the norm (e.g. a confirmation email that goes out
 *  of Cvent, not Marketo). In-person events aren't "sent", so they get no
 *  platform unless one is stated explicitly. */
function resolvePlatform(raw: string, type: CommType): Platform | undefined {
  const norm = raw.trim().toLowerCase();
  const explicit = norm ? PLATFORM_ALIASES[norm] : undefined;
  if (explicit) return explicit;
  if (type === "email") return "marketo";
  if (type === "sms") return "clicksend";
  return undefined;
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

/** Resolves a `moment` cell to a moment id. Accepts the moment's name as
 *  shown on the timeline (e.g. "Change of Preference") or its raw id
 *  (e.g. "cop"); an unrecognised value returns undefined so a typo just
 *  means "no moment linked" rather than a phantom reference. */
function resolveMoment(raw: string): string | undefined {
  const v = raw.trim();
  if (!v) return undefined;
  const lc = v.toLowerCase();
  return (
    MOMENTS.find((m) => m.id.toLowerCase() === lc)?.id ??
    MOMENTS.find((m) => m.label.toLowerCase() === lc)?.id ??
    undefined
  );
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
    momentId: resolveMoment(row.moment || ""),
    triggers: row.triggers
      ? row.triggers.split(";").map((t) => slugify(t)).filter(Boolean)
      : undefined,
    marketoId: row.marketo_id || undefined,
    openRate: row.open_rate || undefined,
    clickRate: row.click_rate || undefined,
    platform: resolvePlatform(row.platform || "", matchType(row.type || "email")),
    time: row.time || undefined,
  };
}

export interface CommsParseResult {
  comms: Comm[];
  /** rows that failed validation — skipped, not fatal, so one team's typo
   *  can't take down everyone else's comms */
  issues: { row: number; message: string }[];
}

/** Parses a whole batch of raw rows, skipping (and collecting) any that fail
 *  validation instead of throwing on the first bad one. This is what makes
 *  the multi-team spreadsheet handover safe: a single malformed row is
 *  reported, not fatal. `startRow` is the sheet row number of the first data
 *  row (2 when a header occupies row 1) for human-readable issue messages. */
export function parseCommRows(
  rows: Record<string, string>[],
  startRow = 2,
): CommsParseResult {
  const usedIds = new Set<string>();
  const comms: Comm[] = [];
  const issues: { row: number; message: string }[] = [];
  rows.forEach((row, i) => {
    try {
      comms.push(normalizeCommRow(row, startRow + i, usedIds));
    } catch (e) {
      issues.push({ row: startRow + i, message: (e as Error).message });
    }
  });
  return { comms: resolveTriggers(comms), issues };
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
