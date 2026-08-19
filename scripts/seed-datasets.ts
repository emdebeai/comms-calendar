// Push the git-canonical datasets into Redis: `npm run seed [name...]`.
//
// Git stays the source of truth. Each dataset has a build script that derives
// a JSON snapshot from the CSV / TS sources, that snapshot is committed, and
// this pushes it to Redis where the deployed pages read it. So refreshing the
// data on the live site is `npm run seed`, not a redeploy — and a bad ingest is
// fixed by correcting the source and reseeding, never by editing the store.
//
// Run with `--dry` to see what would be pushed without writing.
import "dotenv/config";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DATASETS } from "../server/registry.js";
import { isRedisConfigured } from "../server/redis.js";
import { writeDataset } from "../server/stores.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const names = args.filter((a) => !a.startsWith("--"));
const targets = names.length ? names : Object.keys(DATASETS);

for (const name of targets) {
  if (!DATASETS[name]) {
    console.error(`unknown dataset "${name}" — known: ${Object.keys(DATASETS).join(", ")}`);
    process.exitCode = 1;
  }
}
if (process.exitCode) process.exit();

if (!isRedisConfigured() && !dry) {
  console.error(
    "No Redis configured. Put KV_REST_API_URL / KV_REST_API_TOKEN in .env\n" +
      "(`vercel env pull .env`, or copy them from the Upstash dashboard).",
  );
  process.exit(1);
}

for (const name of targets) {
  const def = DATASETS[name];

  // Rebuild first, so what lands in Redis always matches the sources in git
  // rather than whatever the snapshot happened to hold.
  console.log(`[${name}] building — ${def.build}`);
  execFileSync("node", [def.build], { cwd: root, stdio: "inherit" });

  const raw = readFileSync(resolve(root, def.snapshot), "utf-8");
  const data = JSON.parse(raw) as unknown;
  const summary =
    data && typeof data === "object" && !Array.isArray(data)
      ? Object.entries(data as Record<string, unknown>)
          .map(([k, v]) => `${Array.isArray(v) ? v.length : 1} ${k}`)
          .join(", ")
      : "1 document";

  if (dry) {
    console.log(`[${name}] would push ${summary} (${(raw.length / 1024).toFixed(1)} kB) — dry run`);
    continue;
  }

  const envelope = await writeDataset(name, data, def.snapshot);
  console.log(`[${name}] pushed ${summary} — seededAt ${envelope.seededAt}`);
}
