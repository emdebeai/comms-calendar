// CLI wrapper around generateMapPdf — writes the map's print PDF to a file.
//   node scripts/print-pdf.mjs [url] [outfile]
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { generateMapPdf } from "./exportMapPdf.mjs";

const url = process.argv[2] ?? "http://localhost:5173/?print&dots";
const out = process.argv[3] ?? "exports/comms-map.pdf";

const { pdf, widthM, heightM } = await generateMapPdf({ url, log: (m) => console.log(m) });
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, pdf);
console.log(
  `wrote ${out} — ${widthM.toFixed(2)}×${heightM.toFixed(2)}m, ${(pdf.length / 1e6).toFixed(2)} MB`,
);
process.exit(0);
