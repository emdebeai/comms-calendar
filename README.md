# Prospective Student Comms Journey

An interactive timeline prototype of the outbound and inbound communications a
prospective student receives across the three-year journey (Year 10 →
enrolment). Swimlanes per team (Recruitment / Marketing / Admissions /
Conversion) plus inbound engagement, with "moments that matter", always-on
campaign bars, trigger links between comms, and a detail panel with send
metrics and a feedback thread.

## Run it

```bash
npm install
npm run dev
```

- Client (Vite): http://localhost:5173
- Local API (reads the data files): http://localhost:5174

`npm run build` type-checks and produces a production build in `dist/`.

## Remote data (Redis)

Two shapes, both declared in **`server/registry.ts`** — that file is the one to
edit when adding a future CSV ingestion or review page:

| Shape | What it holds | Read | Write |
|---|---|---|---|
| **Dataset** | Reference data built from a CSV in git (e.g. the eDM send list) | `/api/dataset/<name>` | `npm run seed` |
| **Collection** | Review answers and comments | `/api/collection/<name>` | same URL, `POST` |

Git stays the source of truth for datasets: `npm run seed` rebuilds each one
from its sources and pushes it, so refreshing the live data is a seed, not a
redeploy — and a bad ingest is fixed by correcting the CSV and reseeding, never
by editing the store. If a page can't reach Redis it falls back to the snapshot
committed next to it and says so; **writes never degrade** — a failed save keeps
the answer on screen with the reason.

Both API routes are dynamic (`api/dataset/[name].ts`, `api/collection/[name].ts`),
so adding datasets or reviews never adds a serverless function.

## Where the data lives

Comms are read from **`data/comms.csv`** (see `src/lib/commsSchema.ts`
for the column schema). Both are plain local files — edit the CSV or replace
it with a spreadsheet export and refresh the page.

**Feedback notes** land in different places depending on where the app is
running:

| Running | Notes go to | Shared with others |
|---|---|---|
| `npm run dev` | `server/data/feedback.json` via the Express API | Anyone on that server |
| Deployed to Vercel | `api/feedback.ts` → Redis (Vercel KV / Upstash), or SharePoint once Graph is set up | Yes |
| Single-file build (`build:standalone`) | The viewer's own `localStorage` | No — it says so in the UI |

### `/marketing-edms` — the eDM question review

A standalone page (no React) for marketing to confirm which student question
each eDM answers. It reads `marketing-edms/data.json`, generated from the same
sources the map uses so it can't drift:

```bash
node scripts/build-edm-review.mjs   # after editing comms.csv or the question links
```

Answers save per-send to `/api/edm-review` — `server/data/edm-review.json` in
dev, Redis or SharePoint on the deployed site (same store hierarchy as
comments, see `api/edm-review.ts`). The page is behind the same site password.
Pull the answers back with `GET /api/edm-review`.

**Applying the answers to the map** is one gated command, not a hand edit:

```bash
node scripts/apply-edm-review.mjs                          # local dev answers
node scripts/apply-edm-review.mjs https://<site>/api/edm-review   # deployed (uses BASIC_AUTH_*)
```

It rebuilds `QUESTION_LINKS` in `src/data/studentExperience.ts` (confirmed
answers kept, "wrong" reassigned, "none" unlinked) and writes each send's
three CTAs into the `cta` / `secondary_cta_1` / `secondary_cta_2` columns of
`comms.csv`. It leaves "Not sure" answers and free-text "Other" questions for
you, prints a summary of exactly what changed, and never commits — run it,
read the summary, `git diff`, then commit.

To switch the deployed site on, add a Redis from **Vercel → Storage → Create →
Upstash for Redis** and connect it to the project; Vercel injects
`KV_REST_API_URL` / `KV_REST_API_TOKEN` and the function starts using it on the
next deploy. Fill in the `AZURE_*` / `EXCEL_*` variables instead (or as well)
and it writes to the SharePoint workbook, which takes priority. With neither
configured the API answers 503 and the composer keeps the note on screen with
the reason — a note is never silently dropped. See `.env.example`.

## Responsible AI & data handling

This prototype was built in line with RMIT's [Responsible Artificial
Intelligence (AI) Procedure](https://policies.rmit.edu.au/document/view.php?id=305).
Two disclosures for reviewers:

- **Built with AI assistance.** This prototype was scaffolded and iterated with
  an AI coding assistant (Claude Code). All data, design decisions, and code
  were human-reviewed. The app itself contains **no runtime AI** — no models,
  no LLM calls, no tunable AI parameters — so it is not an "AI asset" under the
  procedure. If AI is ever added *into* the app, the procedure's full framework
  (Privacy, Security and Third-Party Risk Assessments; Information Domain
  Register entry; named AI Sponsor / Developer / Operator / Assurer roles)
  applies **before** implementation.

- **Local-only by design; no external data egress.** At runtime the app reads
  only the local files above, served by a local API on `localhost`. It does
  **not** transmit RMIT data to any external service, cloud store, or
  third-party API. (A SharePoint / Microsoft Graph data source exists in the
  code but is **not** configured; the local-file fallback is in use. Enabling
  it would move data into RMIT's own M365 tenancy — confirm with Information
  Governance before doing so.)

Before this prototype informs any wider build, confirm with the data owner /
Information Governance that the underlying marketing data is cleared for use,
and read the procedure's linked Information Governance and Privacy policies.
