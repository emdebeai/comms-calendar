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
| `campaign-touchpoints.csv` | **Proxy.** The campaign's own touchpoint list (the map's campaign lens: `/?campaign=cop-2026`) — team, kind (send / page / conversation), objective (awareness / consideration / decision — which metric counts as success), CTAs, CVP, variants, UTM, URL. Separate from `comms/` on purpose: the map's data is never changed by campaign work. `map_id` links a touchpoint to its card on the map where one exists. |
| `campaigns.csv` | Campaign definitions for the campaign lens — window, core moment, stage gate, possible extensions, calendar markers, outcome metric (definition only), scope rule. First row: Change of Preference 2026. |
| `chains.csv` | Where a touchpoint sends people next, ONE ROW PER CTA (`from,to,cta,via,utm,resolution,measured,people`): an eDM with three CTAs is three rows, each with its own UTM state. `resolution` is `send` (the CTA carried its unique UTM, so the page knows the exact eDM and CTA) or `channel` (`lane:<team>` → page — what CJA can say without a UTM naming the send). `measured=no` is a broken chain. |
| `metrics-catalogue.csv` | Metric names, definitions, benchmark *level*, source system and owner per touchpoint type — never values. Edited on `/metrics`; `scripts/apply-metrics-catalogue.mjs` folds edits back. |
| `dummy/page-referrers.csv` | **Proxy.** Per page: CJA Marketing Channel × UTM source, sessions and share — channel level only (`comm_id,channel,utm_source,sessions,share`). |
| `dummy/studyat-daily.csv` | **Proxy.** Study@ by day and channel across the window (`date,channel,contacts,handle_time,wait_time,abandonment_rate,csat,csat_responses`). Daily because COP is a three-day spike a monthly average would hide; CSAT blank where responses are thin. Genesys + Qualtrics. |
| `dummy/page-next-steps.csv` | **Proxy.** Top actions people take on a page (`comm_id,action,people,share,to`) — form submissions, clicks to another page; `to` links the action to a touchpoint where one exists. |
| `dummy/metric-values.csv` | **Proxy figures only.** Obviously fake round numbers so the campaign lens can be seen working. Real values never enter the repo — a team loads its own export locally with the same columns (`comm_id,cta,metric,value,benchmark,period` — `cta` is `primary` / `secondary` / `tertiary` for a metric of one link inside the send, blank for the send as a whole). |


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

## Running a campaign on real data (local only, nothing uploaded)

Real figures never go in this repo or on the hosted site. They live in
`local/campaign/` on one machine — git-ignored — and the campaign view reads
them from disk when it's run or built there.

1. `npm run campaign:local` creates `local/campaign/` with a header-only CSV
   for each file below. Fill them in (a spreadsheet is fine; save as CSV, keep
   the file names). A file left header-only falls back to the proxy data.
2. `npm run dev` → `http://localhost:5173/?campaign=cop-2026`, or
   `npm run build:standalone` → `dist-standalone/index.html`, one file you can
   open by double-click (add `?campaign=cop-2026` to the address). That file
   makes no network requests; share it only as you would the data inside it.

| Local file | What goes in it | Comes from |
|---|---|---|
| `touchpoints.csv` | One row per touchpoint **per audience variant**: id, team, kind, objective, type, title, date, audience, CTAs, CVP, variants, UTM, URL | The teams (not sensitive, but campaign-specific) |
| `chains.csv` | One row per CTA: which touchpoint it leaves, which it lands on, the CTA text, whether it carries a UTM, whether the next step is measured, people | Marketo click report + the teams |
| `metric-values.csv` | One row per metric per touchpoint: `comm_id, cta, metric, value, benchmark, period`. `cta` is blank for send-level metrics, `primary` / `secondary` for a link's | Marketo send + click reports, CJA, event platform |
| `page-referrers.csv` | Per page: channel, UTM source, sessions, share | CJA Marketing Channel × UTM source |
| `page-next-steps.csv` | Per page: the top actions people took next, people, share | CJA next page / action |
| `web-daily-by-page.csv` | `date, page_id, sessions` per page per day in the window | CJA |
| `studyat-daily.csv` | Per day per channel: contacts, handle time, wait time, abandonment, CSAT | Genesys + Qualtrics |

The campaign itself (window, moment, stage gate) stays in `data/campaigns.csv`.

**Or load them on the page.** In campaign mode, "Load data" on the campaign
pill takes the teams' exports — picked or pasted — and reads them in the
browser. The panel lists one row per export (Marketing's sends sheet and
CTAs sheet, Digital's page files, Study@'s Genesys days) with its state: Not
loaded, Ready (staged, needs "Apply and reload") or On the map. A file is
recognised by its column headers, wherever the header row sits, so the name
doesn't matter; one that matches nothing is called out in red with its first
line. They
are held in that tab (gone when it closes) unless "Keep on this device" is
ticked, and they win over `local/` and the proxy files. Nothing is sent
anywhere: campaign mode makes no API calls at all.

**Proxy figures show only while nothing real is loaded.** As soon as any
file is loaded (or supplied in `local/`), every file that wasn't is read as
empty — header only — so a real figure is never shown beside a made-up one.
Lanes with nothing say so ("No pages loaded"); the pill says how many of the
seven files are in.

**The eDM sheets go in as they are.** Marketing exports two files, as CSVs or
as one `.xlsx` with two sheets, picked together or one at a time: the
sends (`Email Name, Marketo ID, Date, Audience Variant, Subject Line/Banner
Copy, Theme, New this year, Objective, Benchmark, Sent, Delivered, …, %
Opened, …, Clicked to Opened Ratio, …, % Unsubscribed`) and the CTAs (`Email
Name, CTA, Primary/Secondary, Link, Clicks, % Clicks, People, % People`).
"Load data" tells them apart by their headers and folds them into
`touchpoints.csv`, `chains.csv` and `metric-values.csv` in the browser
(`src/lib/marketo.ts`); Email Name is the join between them, matched
regardless of case: one touchpoint per
send (title = subject line, audience = variant, CVP = theme, the sheet's one
benchmark on the objective's success measure), one chain per link (rank 1 =
primary, 2 = secondary, the rest tertiary; UTM = whether the link carries
`utm_campaign`). A link's destination is matched to a tracked page by its
path; any other destination becomes a page named from its URL's last path
segment ("…/managing-study-stress?utm…" → "Managing study stress", no lookup
involved). Every row that isn't a Marketing send is kept as it was. SheetJS
is loaded only when a workbook is picked.

**Genesys exports go in as they are.** Study@ gets one Genesys queue export a
day (`Interval Start, Media Type, Queue Name, Offer, Answer, Abandon, Avg
Wait, Avg Handle, …`). Choose all of them at once in "Load data" and they are
folded into `studyat-daily.csv` in the browser (`src/lib/genesys.ts`): only
the Study@ queues, `voice` → phone and `message` → chat, contacts = Offer,
wait and handle times weighted by answered contacts, abandonment = Abandon /
Offer. A day exported twice keeps the later copy. Face to face isn't in
Genesys and shows as "Not in the data"; CSAT stays blank until Qualtrics is
added.
