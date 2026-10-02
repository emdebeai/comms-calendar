// Sets up local/campaign/ — the git-ignored folder real campaign data lives
// in. Writes a header-only CSV for each file the campaign view reads (never
// overwriting one that exists), so a team member can fill them in a
// spreadsheet. Nothing here is uploaded or committed.
//
//   npm run campaign:local
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dir = resolve(root, "local/campaign");
mkdirSync(dir, { recursive: true });

// local file  ←  the repo's proxy file whose header (column set) it must match
const FILES = {
  "touchpoints.csv": "data/campaign-touchpoints.csv",
  "chains.csv": "data/chains.csv",
  "metric-values.csv": "data/dummy/metric-values.csv",
  "page-referrers.csv": "data/dummy/page-referrers.csv",
  "page-next-steps.csv": "data/dummy/page-next-steps.csv",
  "studyat-daily.csv": "data/dummy/studyat-daily.csv",
  "web-daily-by-page.csv": "data/dummy/web-daily-by-page.csv",
};

for (const [name, source] of Object.entries(FILES)) {
  const target = resolve(dir, name);
  if (existsSync(target)) {
    console.log(`kept     local/campaign/${name}`);
    continue;
  }
  const header = readFileSync(resolve(root, source), "utf-8").split("\n")[0];
  writeFileSync(target, header + "\n");
  console.log(`created  local/campaign/${name}`);
}
console.log(`
Fill these in (a spreadsheet is fine — save as CSV, same file names).
Any file left with only its header falls back to the proxy data.

  npm run dev               view at http://localhost:5173/?campaign=cop-2026
  npm run build:standalone  one offline file: dist-standalone/index.html

local/ and dist-standalone/ are git-ignored: nothing is committed or uploaded.`);
