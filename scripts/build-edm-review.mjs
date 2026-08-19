// Generates marketing-edms/data.json — the sends and the question set shown
// on the review page. Run it whenever the CSV or the experience layer
// changes: `node scripts/build-edm-review.mjs`.
//
// Deliberately derived from the SAME sources the map uses (comms.csv +
// studentExperience.ts), so the review page can never quietly drift from
// what the map says.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(resolve(root, p), "utf-8");

// ── comms.csv → rows (same slugify + sheet-order dedupe as commsSchema.ts) ──
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim()));
}

const slugify = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const csv = parseCsv(read("server/data/comms.csv"));
const header = csv[0].map((h) => h.trim());
const col = (r, name) => (r[header.indexOf(name)] ?? "").trim();

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const BASE = { "10": 0, "11": 12, "12": 24, Post: 36 };
const STAGES = [
  ["Understand", 0, 6], ["Consider", 6, 31.7], ["Decide", 31.7, 32.15], ["Begin", 32.15, 32.6],
  ["Submit", 32.6, 33], ["Wait", 33, 35], ["Offer", 35, 36.5], ["Enrol", 36.5, 39],
];

const seen = new Map();
const rows = [];
for (const r of csv.slice(1)) {
  const title = col(r, "title");
  let id = slugify(title);
  const n = (seen.get(id) ?? 0) + 1;
  seen.set(id, n);
  if (n > 1) id = `${id}-${n}`;
  if (col(r, "team") !== "Marketing") continue;

  const sy = col(r, "school_year");
  const month = BASE[sy] + MONTHS.indexOf(col(r, "month").slice(0, 3)) + (Number(col(r, "day") || 1) - 1) / 30;
  const stage = (STAGES.find(([, a, b]) => month >= a && month < b) ?? ["Enrol"])[0];
  rows.push({
    id, sort: month, stage,
    date: `${col(r, "day")} ${col(r, "month")}`,
    year: { "10": "Year 10", "11": "Year 11", "12": "Year 12", Post: "Post-school" }[sy] ?? sy,
    campaign: col(r, "campaign"), title,
    audience: col(r, "audience"), theme: col(r, "theme"),
  });
}
rows.sort((a, b) => a.sort - b.sort);

// ── studentExperience.ts → question set + our proposed assignment ──────────
const src = read("src/data/studentExperience.ts");
const linksSrc = src.slice(src.indexOf("export const QUESTION_LINKS"));
const links = [...linksSrc.matchAll(
  /stage:\s*"([^"]+)",\s*\n\s*match:\s*"([^"]+)",\s*\n\s*commIds:\s*\[([^\]]*)\]/g,
)].map((m) => ({ stage: m[1], match: m[2], ids: [...m[3].matchAll(/"([^"]+)"/g)].map((x) => x[1]) }));

const expSrc = src.slice(0, src.indexOf("export const QUESTION_LINKS"));
const stageQs = {};
const stageStarts = [...expSrc.matchAll(/stage:\s*"([^"]+)",\s*\n\s*timing:/g)];
stageStarts.forEach((m, i) => {
  const seg = expSrc.slice(m.index, stageStarts[i + 1]?.index ?? expSrc.length);
  const qs = [];
  for (const q of seg.matchAll(/heading:\s*"Questions",\s*\n\s*items:\s*\[([\s\S]*?)\]/g)) {
    for (const item of q[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)) qs.push(item[1].replace(/\\"/g, '"'));
  }
  stageQs[m[1]] = qs;
});

for (const row of rows) {
  const link = links.find((l) => l.ids.includes(row.id));
  const q = link && (stageQs[link.stage] ?? []).find((x) => x.toLowerCase().includes(link.match.toLowerCase()));
  row.q = q ?? "";
  row.qstage = link?.stage ?? "";
  delete row.sort;
}

const out = { rows, questions: Object.entries(stageQs).flatMap(([stage, qs]) => qs.map((q) => ({ stage, q }))) };
mkdirSync(resolve(root, "marketing-edms"), { recursive: true });
writeFileSync(resolve(root, "marketing-edms/data.json"), JSON.stringify(out, null, 1));
console.log(`marketing-edms/data.json — ${rows.length} sends, ${out.questions.length} questions, ${rows.filter((r) => r.q).length} with a proposed question`);
