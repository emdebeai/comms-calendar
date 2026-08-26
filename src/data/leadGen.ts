// Top lead-generating events — registration/lead counts from the recruitment
// team's figures. Matched by title prefix so multi-campus programmes (Open
// Day × 3, April tours × 2) share one programme-level figure; the badge and
// panel label the basis year so a 2025 figure never reads as a 2026 count.
export interface LeadGenEntry {
  rank: number;
  leads: number;
  /** which cycle the figure comes from + scope note */
  basis: string;
}

const TOP: { match: RegExp; entry: LeadGenEntry }[] = [
  { match: /^open day/i, entry: { rank: 1, leads: 9922, basis: "2025 registrations · all campuses" } },
  { match: /^victorian careers show/i, entry: { rank: 2, leads: 3360, basis: "2026" } },
  { match: /^vce and careers expo/i, entry: { rank: 3, leads: 2703, basis: "2026" } },
  {
    match: /^april school holidays campus tour/i,
    entry: { rank: 4, leads: 1139, basis: "2026 · both tours" },
  },
  { match: /^tech and trades/i, entry: { rank: 5, leads: 1023, basis: "2025" } },
];

/** The top-5 lead-gen entry for an EVENT title, or null. */
export function leadGenFor(title: string): LeadGenEntry | null {
  return TOP.find((t) => t.match.test(title.trim()))?.entry ?? null;
}
