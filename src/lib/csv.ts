// Minimal RFC4180-ish CSV parser — handles quoted fields, escaped quotes
// (""), and commas/newlines inside quotes. Good enough for exports from
// Excel or Google Sheets.
export function parseCsv(text: string, delimiter = ","): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      pushField();
    } else if (ch === "\n") {
      pushRow();
    } else if (ch === "\r") {
      // skip — \r\n line endings are handled by the following \n
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) pushRow();

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

/** Parses CSV text into an array of objects keyed by the header row. */
export function parseCsvRows(text: string): Record<string, string>[] {
  const [header, ...rows] = parseCsv(text);
  if (!header) return [];
  const keys = header.map((h) => h.trim().toLowerCase());
  return rows.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? "").trim()])));
}

/** The header names an export can be recognised by — a row that holds most
 *  of any one set is the header, wherever it sits in the file. */
export type HeaderSet = string[];

/** Exports aren't tidy: Marketo and Genesys put title or metadata lines
 *  above the header, Excel may save tabs or semicolons, and a BOM. Returns
 *  the text from the header row down, comma-delimited, so everything
 *  downstream can read it as a plain CSV — or null when no header row
 *  matches any known set. */
export function tidyExport(text: string, known: HeaderSet[]): { text: string; headerLine: number; delimiter: string } | null {
  const clean = text.replace(/^\uFEFF/, "");
  const lines = clean.split(/\r?\n/);
  const scan = lines.slice(0, 25);
  for (const delimiter of [",", "\t", ";"]) {
    for (let i = 0; i < scan.length; i++) {
      const cells = (parseCsv(scan[i], delimiter)[0] ?? []).map((c) => c.trim().toLowerCase());
      if (cells.length < 2) continue;
      const hit = known.some((set) => set.filter((h) => cells.includes(h.toLowerCase())).length / set.length >= 0.6);
      if (!hit) continue;
      const rows = parseCsv(lines.slice(i).join("\n"), delimiter);
      const out = rows.map((r) => r.map((v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)).join(",")).join("\n") + "\n";
      return { text: out, headerLine: i + 1, delimiter };
    }
  }
  return null;
}
