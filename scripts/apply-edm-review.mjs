// Fold marketing's eDM review answers back into the map — the human-gated
// "apply" step. Reads the saved answers, applies them to two places:
//
//   1. src/data/studentExperience.ts  — QUESTION_LINKS (which comm answers
//      which student question). Baseline = the current links; the review
//      supplies the diffs.
//   2. data/comms/marketing.csv — each reviewed send's cta /
//      secondary_cta_1 / secondary_cta_2 columns (Primary / Secondary /
//      Tertiary CTA from the review).
//
// It never writes silently: it prints exactly what changed, and it leaves
// three things for a human — "Not sure" answers, "Other" free-text questions
// that aren't on the map, and any comm id it can't find. Run it, read the
// summary, then `git diff` before committing.
//
//   node scripts/apply-edm-review.mjs [answers.json | https://…/api/edm-review]
//
// With a URL it uses BASIC_AUTH_USER / BASIC_AUTH_PASSWORD for the site gate;
// with no argument it reads the local dev file server/data/edm-review.json.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const rd = (p) => readFileSync(resolve(root, p), "utf-8");
const WARN = "⚠";

// ── load answers ────────────────────────────────────────────────────────
async function loadAnswers() {
  const arg = process.argv[2];
  const src = arg || "server/data/edm-review.json";
  if (/^https?:\/\//.test(src)) {
    const headers = {};
    const u = process.env.BASIC_AUTH_USER,
      p = process.env.BASIC_AUTH_PASSWORD;
    if (u && p) headers.Authorization = "Basic " + Buffer.from(`${u}:${p}`).toString("base64");
    const res = await fetch(src, { headers });
    if (!res.ok)
      throw new Error(`fetch ${src} -> ${res.status}. Set BASIC_AUTH_USER/PASSWORD if the site is gated.`);
    return res.json();
  }
  if (!existsSync(resolve(root, src)))
    throw new Error(
      `No answers at ${src}. Pass the deployed API URL, e.g.\n  node scripts/apply-edm-review.mjs https://<site>/api/edm-review`,
    );
  return JSON.parse(rd(src));
}

// ── comms.csv (same slugify + dedupe as commsSchema.ts) ───────────────────
function parseCsv(text) {
  const rows = [];
  let row = [],
    field = "",
    q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else q = false;
      } else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") field += c;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}
function toCsv(rows) {
  return rows
    .map((r) => r.map((v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)).join(","))
    .join("\n");
}
const slugify = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// Per-team files, concatenated in sorted order (matches the app's id de-dup);
// CTA writes go back to marketing.csv only.
import { readdirSync } from "node:fs";
const commFiles = readdirSync(resolve(root, "data/comms")).filter((f) => f.endsWith(".csv")).sort();
const perFile = new Map();
const csv = [];
for (const f of commFiles) {
  const t = parseCsv(rd(`data/comms/${f}`)).filter((r, i) => i === 0 || r.some((v) => v.trim()));
  const hdr = t[0].map((h) => h.trim()).concat(["team"]);
  if (!csv.length) csv.push(hdr);
  const start = csv.length;
  for (const r of t.slice(1)) csv.push(r.concat([f.replace(/\.csv$/, "")]));
  perFile.set(f, { header: t[0], start, end: csv.length });
}
const header = csv[0].map((h) => h.trim());
const ci = (n) => header.indexOf(n);

const rowById = new Map();
{
  const seen = new Map();
  csv.forEach((r, i) => {
    if (i === 0) return;
    let id = slugify(r[ci("title")]);
    const n = (seen.get(id) ?? 0) + 1;
    seen.set(id, n);
    if (n > 1) id = `${id}-${n}`;
    rowById.set(id, i);
  });
}
const marketingIds = new Set(
  [...rowById].filter(([, i]) => csv[i][ci("team")] === "marketing").map(([id]) => id),
);

// ── studentExperience.ts: question -> stage, and the current links ────────
const se = rd("src/data/studentExperience.ts");
const expPart = se.slice(0, se.indexOf("export const QUESTION_LINKS"));
const stageQs = {};
const starts = [...expPart.matchAll(/stage:\s*"([^"]+)",\s*\n\s*timing:/g)];
starts.forEach((m, k) => {
  const seg = expPart.slice(m.index, starts[k + 1]?.index ?? expPart.length);
  const qs = [];
  for (const g of seg.matchAll(/heading:\s*"Questions",\s*\n\s*items:\s*\[([\s\S]*?)\n\s*\],/g))
    for (const it of g[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)) qs.push(it[1].replace(/\\"/g, '"'));
  stageQs[m[1]] = qs;
});
const stageOf = new Map();
for (const [stage, qs] of Object.entries(stageQs)) for (const q of qs) stageOf.set(q, stage);

const linkStart = se.indexOf("export const QUESTION_LINKS");
const linkEnd = se.indexOf("\n];", linkStart) + "\n];".length;
const linksSrc = se.slice(linkStart, linkEnd);
const currentLinks = [
  ...linksSrc.matchAll(/stage:\s*"([^"]+)",\s*\n\s*match:\s*"([^"]+)",\s*\n\s*commIds:\s*\[([^\]]*)\]/g),
].map((m) => ({ stage: m[1], match: m[2], ids: [...m[3].matchAll(/"([^"]+)"/g)].map((x) => x[1]) }));

// resolve each existing link to a canonical full question; build the current
// comm -> question map (so non-Marketing links carry through untouched).
const assign = new Map();
for (const l of currentLinks) {
  const q = (stageQs[l.stage] ?? []).find((x) => x.toLowerCase().includes(l.match.toLowerCase()));
  if (!q) {
    console.warn(`${WARN} current link match "${l.match}" (${l.stage}) matched no question; its comms will be dropped`);
    continue;
  }
  for (const id of l.ids) assign.set(id, { stage: l.stage, question: q });
}

// ── apply the review to Marketing comms ───────────────────────────────────
const answers = await loadAnswers();
const flags = { unsure: [], other: [], missing: [] };
let reassigned = 0,
  unassigned = 0,
  confirmed = 0;

for (const [id, a] of Object.entries(answers)) {
  if (!marketingIds.has(id)) {
    if (!rowById.has(id)) flags.missing.push(id);
    continue; // the review only governs Marketing sends
  }
  const v = a.verdict;
  if (v === "yes") {
    confirmed++;
    continue; // keep current assignment
  }
  if (!v || v === "unsure") {
    if (v === "unsure") flags.unsure.push(id);
    continue;
  }
  if (v === "none") {
    if (assign.delete(id)) unassigned++;
    continue;
  }
  if (v === "wrong") {
    const q = (a.question || "").trim();
    if (q && stageOf.has(q)) {
      assign.set(id, { stage: stageOf.get(q), question: q });
      reassigned++;
    } else {
      flags.other.push({ id, question: q }); // "Other" free-text — needs a human
    }
  }
}

// ── rebuild QUESTION_LINKS, grouped by (stage, question) ──────────────────
const STAGE_ORDER = ["Understand", "Consider", "Decide", "Begin", "Submit", "Wait", "Offer", "Enrol"];
const SEP = "\u0000"; // questions contain spaces; key on a NUL they never do
const groups = new Map();
for (const [id, { stage, question }] of assign) {
  const key = stage + SEP + question;
  if (!groups.has(key)) groups.set(key, new Set());
  groups.get(key).add(id);
}
const ordered = [...groups.entries()].sort((a, b) => {
  const [sa, qa] = a[0].split(SEP);
  const [sb, qb] = b[0].split(SEP);
  return STAGE_ORDER.indexOf(sa) - STAGE_ORDER.indexOf(sb) || qa.localeCompare(qb);
});

const esc = (s) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
const block =
  "export const QUESTION_LINKS: QuestionLink[] = [\n" +
  "  // Generated by scripts/apply-edm-review.mjs from marketing's review.\n" +
  "  // `match` is the full question text (unambiguous). Re-run the script to\n" +
  "  // refresh; edit by hand only for links the review can't express.\n" +
  ordered
    .map(([key, ids]) => {
      const [stage, question] = key.split(SEP);
      const idList = [...ids].sort().map((x) => `      "${esc(x)}",`).join("\n");
      return `  {\n    stage: "${esc(stage)}",\n    match: "${esc(question)}",\n    commIds: [\n${idList}\n    ],\n  },`;
    })
    .join("\n") +
  "\n];";

writeFileSync(resolve(root, "src/data/studentExperience.ts"), se.slice(0, linkStart) + block + se.slice(linkEnd));

// ── write CTAs into comms.csv ─────────────────────────────────────────────
let ctaWrites = 0;
const CTA_COLS = {
  ctaPrimary: ci("cta"),
  ctaSecondary: ci("secondary_cta_1"),
  ctaTertiary: ci("secondary_cta_2"),
};
for (const [id, a] of Object.entries(answers)) {
  const ri = rowById.get(id);
  if (ri === undefined) continue;
  let touched = false;
  for (const [field, col] of Object.entries(CTA_COLS)) {
    const val = (a[field] || "").trim();
    if (val && csv[ri][col] !== val) {
      csv[ri][col] = val;
      touched = true;
    }
  }
  if (touched) ctaWrites++;
}
if (ctaWrites) {
  const mk = perFile.get("marketing.csv");
  const body = csv.slice(mk.start, mk.end).map((r) => r.slice(0, mk.header.length));
  writeFileSync(resolve(root, "data/comms/marketing.csv"), toCsv([mk.header, ...body]) + "\n");
}

// ── report ────────────────────────────────────────────────────────────────
const total = Object.keys(answers).length;
console.log(`\nApplied ${total} answers:`);
console.log(`  ${confirmed} confirmed as-is | ${reassigned} reassigned | ${unassigned} unassigned`);
console.log(`  ${ctaWrites} sends had CTA text written to comms.csv`);
console.log(`  QUESTION_LINKS rebuilt: ${ordered.length} question groups`);
if (flags.unsure.length)
  console.log(`\n  ${WARN} ${flags.unsure.length} "Not sure" left unchanged for you to decide:\n     ${flags.unsure.join(", ")}`);
if (flags.other.length)
  console.log(
    `\n  ${WARN} ${flags.other.length} "Other" question(s) not on the map (add to studentExperience.ts by hand):\n` +
      flags.other.map((f) => `     ${f.id}: "${f.question}"`).join("\n"),
  );
if (flags.missing.length)
  console.log(`\n  ${WARN} ${flags.missing.length} answer(s) for unknown comm ids (renamed/removed?):\n     ${flags.missing.join(", ")}`);
console.log(`\nReview the changes: git diff src/data/studentExperience.ts data/comms/marketing.csv\n`);
