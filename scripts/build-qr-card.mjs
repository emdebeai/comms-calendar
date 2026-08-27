// Printable QR card (A5 landscape) for the physical artefact — the QR opens
// the #/signup email-capture page. Print family: navy hero + dot strip.
//   node scripts/build-qr-card.mjs https://your-site.vercel.app
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import QRCode from "qrcode";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const site = process.argv[2];
if (!site) {
  console.error("Usage: node scripts/build-qr-card.mjs <site-url>");
  process.exit(1);
}
const target = `${site.replace(/\/$/, "")}/#/signup`;
const qrSvg = await QRCode.toString(target, {
  type: "svg",
  errorCorrectionLevel: "M",
  margin: 0,
  color: { dark: "#000054", light: "#ffffff" },
});

const DOTS = [
  [0, 4, 0.9], [0, 14, 0.55], [0, 30, 0.75], [0, 55, 0.6], [0, 78, 0.9],
  [1, 9, 0.6], [1, 38, 0.85], [1, 47, 0.5], [1, 71, 0.75], [1, 90, 0.6],
  [2, 22, 0.7], [2, 44, 0.55], [2, 62, 0.9], [2, 84, 0.7],
];

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  @page { size: 210mm 148mm; margin: 0; }
  * { margin:0; padding:0; box-sizing:border-box; }
  :root { --rmit-blue:#000054; --interactive:#0068d0; --tint-blue:#e0edfa;
    --grey-30:#e1e1e1; --grey-70:#6e6e6e; --grey-90:#333333; }
  body { width:210mm; height:148mm; background:#fff; display:flex; flex-direction:column;
    font-family:"Inter",system-ui,-apple-system,sans-serif; color:var(--grey-90);
    -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .hero { position:relative; background:var(--rmit-blue); color:#fff; padding:8mm 12mm 5mm; }
  .brand { font-size:11pt; font-weight:700; }
  .strip { position:relative; height:9mm; margin-top:3mm; }
  .lane { position:absolute; left:0; right:0; border-top:0.4mm solid rgba(255,255,255,0.15); }
  .tick { position:absolute; top:0; bottom:0; border-left:0.4mm dashed rgba(255,255,255,0.3); left:62%; }
  .dot { position:absolute; width:1.6mm; height:1.6mm; border-radius:50%; background:#fff; }
  .body { flex:1; display:flex; align-items:center; gap:12mm; padding:8mm 12mm; }
  .qr { width:62mm; height:62mm; flex-shrink:0; }
  .qr svg { width:100%; height:100%; }
  h1 { font-size:24pt; font-weight:700; line-height:1.15; letter-spacing:-0.01em; }
  .sub { margin-top:4mm; font-size:13pt; color:var(--grey-70); line-height:1.5; }
  .footer { display:flex; justify-content:space-between; border-top:0.35mm solid var(--grey-30);
    margin:0 12mm; padding:3mm 0 6mm; font-size:9pt; color:var(--grey-70); }
  .footer b { color:var(--grey-90); font-weight:600; }
</style></head><body>
  <div class="hero">
    <div class="brand">Current State Touchpoint Mapping</div>
    <div class="strip">
      ${[0, 1, 2].map((l) => `<div class="lane" style="top:${l * 3 + 1}mm"></div>`).join("")}
      <div class="tick"></div>
      ${DOTS.map(([lane, x, o]) => `<div class="dot" style="left:${x}%;top:${lane * 3 + 0.4}mm;opacity:${o}"></div>`).join("")}
    </div>
  </div>
  <div class="body">
    <div class="qr">${qrSvg}</div>
    <div>
      <h1>Want the map?</h1>
      <p class="sub">Scan, leave your RMIT email, and we&rsquo;ll send you the link.</p>
    </div>
  </div>
  <div class="footer">
    <span><b>Current State Touchpoints</b> · Prospective student journey · DOM SL</span>
    <span>${target.replace("https://", "")}</span>
  </div>
</body></html>`;

const tmp = resolve(tmpdir(), "qr-card.html");
writeFileSync(tmp, html);
const out = resolve("exports", "qr-signup-card.pdf");
execFileSync(CHROME, [
  "--headless=new",
  "--no-pdf-header-footer",
  `--print-to-pdf=${out}`,
  "--no-first-run",
  "--disable-extensions",
  `file://${tmp}`,
]);
console.log("wrote", out, "→", target);
