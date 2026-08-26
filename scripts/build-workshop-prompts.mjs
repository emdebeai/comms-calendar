// Three printable A3 workshop-prompt sheets, styled with the tool's landing
// page + design tokens (navy hero band + dot-strip motif, tint-blue chip,
// Inter/system type, token greys). Writes exports/workshop-prompt-N.pdf via
// headless system Chrome.
//   node scripts/build-workshop-prompts.mjs
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const PROMPTS = [
  {
    n: "01",
    q: "What sort of conversations and decisions can a tool like this enable us to have?",
    sub: null,
  },
  {
    n: "02",
    q: "What extra information, data and functionality would help support decision making?",
    sub: null,
  },
  {
    n: "03",
    q: "What are the most valuable next steps?",
    sub: "And who needs to do them?",
  },
];

// The landing HeroStrip's dot field, verbatim coordinates.
const DOTS = [
  [0, 4, 0.9], [0, 14, 0.55], [0, 30, 0.75], [0, 55, 0.6], [0, 78, 0.9],
  [1, 9, 0.6], [1, 38, 0.85], [1, 47, 0.5], [1, 71, 0.75], [1, 90, 0.6],
  [2, 22, 0.7], [2, 44, 0.55], [2, 62, 0.9], [2, 84, 0.7],
];

const page = (p) => `<!doctype html>
<html><head><meta charset="utf-8"><style>
  @page { size: A3 landscape; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  :root {
    --rmit-blue: #000054; --interactive: #0068d0; --tint-blue: #e0edfa;
    --grey-30: #e1e1e1; --grey-70: #6e6e6e; --grey-90: #333333; --card: #ffffff;
  }
  body {
    width: 420mm; height: 297mm; background: var(--card);
    font-family: "Inter", system-ui, -apple-system, sans-serif;
    color: var(--grey-90); display: flex; flex-direction: column;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  /* ── Navy hero band with the landing page's dot-strip motif ── */
  .hero { position: relative; background: var(--rmit-blue); color: #fff;
    padding: 14mm 18mm 10mm; overflow: hidden; }
  .brand { font-size: 14pt; font-weight: 700; }
  .strip { position: relative; height: 26mm; margin-top: 8mm; }
  .lane { position: absolute; left: 0; right: 0; height: 0;
    border-top: 0.5mm solid rgba(255,255,255,0.15); }
  .tick { position: absolute; top: 0; bottom: 0; width: 0;
    border-left: 0.5mm dashed rgba(255,255,255,0.3); left: 62%; }
  .dot { position: absolute; width: 3mm; height: 3mm; border-radius: 50%;
    background: #fff; }
  /* ── Prompt body ── */
  .body { flex: 1; display: flex; flex-direction: column; padding: 16mm 18mm 0; }
  .chip { display: inline-block; width: fit-content; background: var(--tint-blue);
    color: var(--rmit-blue); font-size: 12pt; font-weight: 600;
    letter-spacing: 0.12em; text-transform: uppercase;
    padding: 2mm 5mm; border-radius: 2.5mm; }
  h1 { margin-top: 10mm; max-width: 370mm; font-size: 64pt; line-height: 1.12;
    font-weight: 700; letter-spacing: -0.015em; }
  .sub { margin-top: 6mm; font-size: 36pt; font-weight: 500; color: var(--grey-70); }
  /* ── Footer ── */
  .footer { display: flex; justify-content: space-between; align-items: baseline;
    border-top: 0.4mm solid var(--grey-30); margin: 0 18mm; padding: 5mm 0 10mm;
    font-size: 11pt; color: var(--grey-70); }
  .footer b { color: var(--grey-90); font-weight: 600; }
</style></head><body>
  <div class="hero">
    <div class="brand">Current State Touchpoint Mapping</div>
    <div class="strip">
      ${[0, 1, 2].map((l) => `<div class="lane" style="top:${l * 9 + 3}mm"></div>`).join("")}
      <div class="tick"></div>
      ${DOTS.map(([lane, x, o]) => `<div class="dot" style="left:${x}%;top:${lane * 9 + 1.7}mm;opacity:${o}"></div>`).join("")}
    </div>
  </div>
  <div class="body">
    <span class="chip">Workshop prompt ${p.n}</span>
    <h1>${p.q}</h1>
    ${p.sub ? `<div class="sub">${p.sub}</div>` : ""}
  </div>
  <div class="footer">
    <span><b>Current State Touchpoints</b> · Prospective student journey · DOM SL</span>
    <span>${p.n} / 03</span>
  </div>
</body></html>`;

mkdirSync("exports", { recursive: true });
for (const p of PROMPTS) {
  const html = resolve(tmpdir(), `prompt-${p.n}.html`);
  writeFileSync(html, page(p));
  const out = resolve("exports", `workshop-prompt-${p.n}.pdf`);
  execFileSync(CHROME, [
    "--headless=new",
    "--no-pdf-header-footer",
    `--print-to-pdf=${out}`,
    "--no-first-run",
    "--disable-extensions",
    `file://${html}`,
  ]);
  console.log("wrote", out);
}
