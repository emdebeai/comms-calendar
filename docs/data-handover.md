# Adding your team's comms — data guide

This is the guide to hand a coworker who owns a team's communications
(Recruitment, Marketing, Admissions, or Conversion) so they can add their
comms to the timeline themselves. It needs no code knowledge.

Fill in **one row per communication** in the spreadsheet. A blank template
lives at [`data/comms-template.csv`](../data/comms-template.csv) — copy the header row
and go.

## Where the data lives

- **Today:** a single file, `data/comms/<team>.csv`. Edit it (or paste rows
  exported from a spreadsheet) and refresh the page.
- **Recommended for real multi-team use:** a shared **SharePoint Excel
  workbook, one sheet per team**, so each team edits only their own rows in a
  tool they already have. The app already supports this path — it just needs
  the workbook connected (see `server/graph.ts`). One sheet per team removes
  the "everyone edits the same file" collision problem.

**Bad rows don't break anything.** If a row is missing a required field or has
an unrecognised value, that single row is skipped and a notice appears at the
top of the timeline ("N rows couldn't be imported — row 14 (…)"). Everyone
else's comms still load. Fix the flagged row and refresh.

## The columns

| Column | Required | What to put |
|---|---|---|
| `id` | — | **Leave blank.** Generated automatically from the title. |
| `team` | ✅ | `Recruitment`, `Marketing`, `Admissions`, or `Conversion` |
| `title` | ✅ | The comm's name, e.g. `Open Day launch email`. Keep it **unique** if you want to link to it from `triggers`. |
| `cta` | — | The primary call to action, e.g. `Register now`. (Events don't show a CTA.) |
| `type` | ✅ | `Email`, `SMS`, `Webinar`, `Call`, or `Event` |
| `school_year` | ✅ | `10`, `11`, `12`, or `Post` — **the audience's year level** (see the year model below) |
| `month` | ✅ | `Jan`…`Dec` (full name or 3-letter) |
| `day` | — | `1`–`31`. Approximate — it only nudges the comm's position *within* the month, it isn't a precise calendar date. Leave blank for mid-month. |
| `moment` | — | The moment it ties to, **by name** (see list below). Leave blank if none. |
| `triggers` | — | Other comms this one relates to, **by their exact title**, separated by `;`. e.g. `Open Day (Bundoora)` |
| `secondary_cta_1`, `secondary_cta_2` | — | Extra CTAs shown in the detail panel |
| `marketo_id` | — | Source campaign id, if you have one |
| `open_rate`, `click_rate` | — | Send metrics as a percentage string, e.g. `56.7%` |
| `platform` | — | The system it's **sent** from: `Marketo`, `Cvent`, or `ClickSend`. Leave blank and it's inferred — `Email`→Marketo, `SMS`→ClickSend. Only set it for the exceptions, e.g. an event-confirmation **email** that goes out of `Cvent`. Events aren't "sent" and get no badge. |

### Moment names (use these exactly, or leave blank)

`Open Day · Yr 11` · `Open Day · Yr 12` · `VTAC Timely Close` ·
`Change of Preference` · `Offer Round` · `O-Week`

(These are the vertical bands on the timeline. A name that doesn't match one
of these is simply ignored — no band linked.)

## The year model (important — this trips people up)

The three school-year bands run **in parallel**, not in sequence. This
timeline shows **one planning year's activity for three audiences at once** —
not one student followed for three years. So:

- Put a comm under the **year level of the people it's sent to**, not a
  sequence position. A Year 12 preference email → `school_year = 12`.
- If the **same send goes to more than one year level** (e.g. an Open Day
  invite emailed to Years 10, 11 *and* 12), add it as **one row per year** —
  three rows, same title, same date, `school_year` 10 / 11 / 12.
- Everything is treated as the current planning year. Only the post-results
  tail (`Post`) rolls into next year.

## Triggers / related comms

`triggers` draws a **line between two related comms** (e.g. an event and its
reminder). Write the *other* comm's **exact title**; the app matches it
automatically — you don't need any id. The line is undirected (it shows the
two are related, not which causes which). A title that matches nothing is
dropped silently, so a typo just means "no line", never an error.

## Worked example

```
team,        title,                       cta,                 type,   school_year, month, day, moment,             triggers
Recruitment, Open Day (Bundoora),         Attend Open Day,     Event,  12,          Aug,   2,   Open Day · Yr 12,
Marketing,   Open Day reminder SMS,       Open Day is tomorrow,SMS,    12,          Aug,   1,   Open Day · Yr 12,   Open Day (Bundoora)
```

The SMS lands 1 day before the event, both sit under the Year 12 Open Day
band, and a line connects them.
