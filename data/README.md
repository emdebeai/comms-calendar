# Data — what drives the map, and where it lives

One rule: **everything that drives the map is versioned in git, in one of two
places by shape** — spreadsheet-shaped data here in `data/`, code-shaped data
in `src/data/`. Redis (behind `/api`) only ever holds user input and serving
copies, never source of truth.

## `data/` — spreadsheet-shaped source of truth

| File | What it is |
|---|---|
| `comms/<team>.csv` | Every touchpoint on the map, ONE FILE PER SENDER TEAM — the filename is the team (no team column), so a file can go to that team's rep and come back without touching anyone else's rows. Column reference: `src/lib/commsSchema.ts` (`FILE_COLUMNS`). Read by the dev API (`server/dataStore.ts`) and baked into the standalone build (`src/lib/loadComms.ts`). |
| `comms-template.csv` | Blank header row for teams adding sends — same columns as the per-team files (see `docs/data-handover.md`). |
| `campaigns.csv` | Campaign definitions for the campaign lens — window, core moment, stage gate, possible extensions, calendar markers, outcome metric (definition only), scope rule. First row: Change of Preference 2026. |
| `chains.csv` | Where a touchpoint sends people next (`from,to,via,resolution,measured`). `resolution` is `send` (exact touchpoint → page) or `channel` (`lane:<team>` → page — what CJA can say without a UTM naming the send). `measured=no` is a broken chain. |
| `metrics-catalogue.csv` | Metric names, definitions, benchmark *level*, source system and owner per touchpoint type — never values. Edited on `/metrics`; `scripts/apply-metrics-catalogue.mjs` folds edits back. |
| `dummy/metric-values.csv` | **Proxy figures only.** Obviously fake round numbers so the campaign lens can be seen working. Real values never enter the repo — a team loads its own export locally with the same columns (`comm_id,cta,metric,value,benchmark,period` — `cta` is `primary` / `secondary` / `tertiary` for a metric of one link inside the send, blank for the send as a whole). |

**Digital pages for COP.** `comms/digital.csv` always carries the six named COP pages (Change of Preference, VTAC and RMIT terms, Pathways, Find a course by ATAR, Equity access schemes, Contact Study@RMIT), each with its `url`. The CJA export's 10 highest-traffic pages for the school-leaver segment over the period are matched on `url`; any top-10 page not already listed is added as a row by the Digital team.

Campaign-lens columns on the per-team files: `cvp` (the value proposition, terse), `variants`, `variant_basis` (`segmentation` / `personalisation`), `new_2026`, `utm` (`yes` / `no`, blank = unknown), `url` (webpages — the CJA join key).

Two rules for the CSVs:

- **`personas` is a lens, not a split** — shared touchpoints tag every journey
  they appear on (semicolon list, e.g. `domsl;nsl`; blank = `domsl`). The map
  filters by the active persona, so a second persona is a different filter
  over the same files, never a second copy of the rows.
- **No narrative text in cells** — fields hold terse values (labels, tags,
  dates, figures). Anything that reads as a sentence lives in
  `src/data/commNotes.ts`, keyed by comm id, and renders in the detail
  panel's Notes row.

## `src/data/` — code-shaped map data

| File | What it drives |
|---|---|
| `journey.ts` | Journey stages, school years, moments that matter, embargoes |
| `comms.ts` | Inbound engagement series (Digital, Study@RMIT), media campaign schedules |
| `studentExperience.ts` | Stage voice/needs/actions + question→touchpoint links |
| `studentView.ts` | The student-questions swimlane's display set and ordering |
| `studentSources.ts` | Evidence/sources behind each stage's questions |
| `leadGen.ts` | Top-5 lead-generating events (ranks + figures) |
| `aboutContent.ts` | Landing page copy, personas, glossary, bibliography, people consulted |

## Not source of truth

- `server/data/feedback.json` — local-dev fallback store for comments (Redis
  holds the real thing when configured). Runtime state, not map data.
- `marketing-edms/data.json` — a **built** snapshot (`npm run
  build:edm-review`); regenerate it, never hand-edit.
