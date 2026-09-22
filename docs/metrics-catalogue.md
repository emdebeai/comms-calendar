# Metrics catalogue — Phase 2 (Change of Preference)

One row per metric per touchpoint type. Pre-filled from the Phase 2 brief, the CJA dashboard brief, and the Study@ and personalisation sessions. A dash means nobody has confirmed it yet — fill it in, never guess a benchmark or a system.

- **Level**: Touchpoint (benchmark exists for this exact touchpoint) · Channel (channel-wide only) · None exists (record it — that's a finding).
- **Access**: whether George can read the source directly, or the owner exports it.
- **Join key**: what links the metric to a touchpoint in the map.

## Source owners

| Rows | Owner | Systems |
|---|---|---|
| Marketing eDM, webpage, paid social, tools | Analytics lead | CJA (marketing only) |
| Personalised content | Personalisation manager | DAP (Salesforce) → MCAP |
| Phone, chat, face to face, CSAT, outcomes | Study@ | Genesys, Qualtrics, Salesforce |
| SMS, Events | **not yet identified** | — |

## Marketing

| Touchpoint type | Metric | Definition | Unit | Benchmark | Level | Source system | Owner | Access | Join key | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| eDM | Sent | Emails sent | # | — | — | Marketo → CJA | Analytics lead | Requested | marketo_id | CJA dashboard brief |
| eDM | Delivered | Emails delivered (sent minus bounces) | # | — | — | Marketo → CJA | Analytics lead | Requested | marketo_id | CJA dashboard brief |
| eDM | Opens | Unique opens | # | — | — | Marketo → CJA | Analytics lead | Requested | marketo_id | CJA dashboard brief |
| eDM | Clicks | Unique clicks, any CTA | # | — | — | Marketo → CJA | Analytics lead | Requested | marketo_id | CJA dashboard brief |
| eDM | Open rate | Opens ÷ delivered | % | — | — | Marketo → CJA | Analytics lead | Requested | marketo_id | Some 2025 values already in the map CSVs — confirm they match CJA's definition |
| eDM | CTOR | Click-to-open rate: clicks ÷ opens | % | — | — | Marketo → CJA | Analytics lead | Requested | marketo_id | Use CJA's definition — write it here once confirmed |
| eDM | Clicks per CTA | Clicks on each CTA link, not just the email | # | — | — | Marketo → CJA | Analytics lead | Requested | marketo_id + CTA URL | Needed for chains — one email has multiple CTAs. Depends on UTMs |
| eDM | UTM present | Does each CTA carry a UTM / trackable link | Y/N | 100% | Channel | Marketo | Marketing | Requested | marketo_id | Drives the 'missing UTM' flag |
| Webpage | People | Unique visitors | # | — | — | CJA | Analytics lead | Requested | Page URL | CJA dashboard brief |
| Webpage | Sessions | Visits | # | — | — | CJA | Analytics lead | Requested | Page URL | — |
| Webpage | Page views | Views of the page | # | — | — | CJA | Analytics lead | Requested | Page URL | — |
| Webpage | Bounce rate | Single-page sessions ÷ sessions | % | — | — | CJA | Analytics lead | Requested | Page URL | Personalisation manager also uses this per personalisation |
| Webpage | Form starts | Where the CTA leads to a form | # | — | — | CJA | Analytics lead | Requested | Page URL | — |
| Webpage | Form submits | Completed submissions | # | — | — | CJA | Analytics lead | Requested | Page URL | Campus tours page: 64.41% forms → registrations already captured |
| Webpage | Top referrers | Top 5 sources of traffic into the page | list | — | n/a | CJA | Analytics lead | Requested | Page URL | Funnel-in for chains |
| Webpage | Most common next step | Top 5 pages/actions after this page | list | — | n/a | CJA | Analytics lead | Requested | Page URL | If not a form — what are users doing? |
| Webpage | Traffic share from eDM | Share of page traffic attributed to a given eDM CTA | % | — | — | CJA | Analytics lead | Requested | Page URL + marketo_id | Depends on UTMs — 40% already captured for campus tours page |
| Paid social | — | Core metrics per channel not yet defined | — | — | — | — | Marketing (paid media) | No | Campaign / landing URL | Brief: 'define core metrics used for each channel' — and where they funnel to on the site |
| Tool (e.g. Find a course by ATAR) | — | Are tools measured differently to webpages? | — | — | — | CJA? | Analytics lead | Requested | Page URL | Open question from the CJA brief |

## Digital

| Touchpoint type | Metric | Definition | Unit | Benchmark | Level | Source system | Owner | Access | Join key | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| Personalised content | % of total audience | Share of page audience who saw this personalisation | % | — | — | DAP (Salesforce) → MCAP | Personalisation manager | No | Page URL + variant id | From personalisation session |
| Personalised content | Bounce rate | Bounce rate for exposed vs not exposed | % | — | — | DAP → MCAP / CJA | Personalisation manager | No | Page URL + variant id | — |
| Personalised content | Main CTA clicks | Clicks on the page's main goal CTA, exposed vs not | # | — | — | DAP → MCAP / CJA | Personalisation manager | No | Page URL + variant id | The 'with vs without' split for the side panel |
| Personalised content | Preference attribution | Share of exposed users whose RMIT preference moved up | % | — | — | DAP + VTAC preference data | Personalisation manager / DAP team | No | Email (VTAC match) | 1:1 only where email matches VTAC record. Confirm this data is usable for this project |
| Personalised content | Submits per person | Applications submitted as a ratio per exposed person, vs baseline | ratio | — | — | DAP | Personalisation manager | No | Page URL + variant id | Suggested by personalisation manager |
| Personalised content | Enquiries | Enquiries generated from the personalised experience | # | — | — | DAP / Salesforce | Personalisation manager | No | Page URL + variant id | — |

## Study@

| Touchpoint type | Metric | Definition | Unit | Benchmark | Level | Source system | Owner | Access | Join key | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| Phone | Handle time | Average time to handle an interaction | min | — | — | Genesys | Study@ | Via Study@ export | Channel + date | From Study@ session |
| Phone | Wait time | Average time in queue | min | — | — | Genesys | Study@ | Via Study@ export | Channel + date | — |
| Phone | Abandonment rate | Share of contacts abandoned before handled | % | — | — | Genesys | Study@ | Via Study@ export | Channel + date | — |
| Live chat | Handle time | Average time to handle an interaction | min | — | — | Genesys | Study@ | Via Study@ export | Channel + date | — |
| Live chat | Wait time | Average time in queue | min | — | — | Genesys | Study@ | Via Study@ export | Channel + date | — |
| Live chat | Abandonment rate | Share of contacts abandoned before handled | % | — | — | Genesys | Study@ | Via Study@ export | Channel + date | — |
| Face to face | Handle time | Average time to handle an interaction | min | — | — | Genesys | Study@ | Via Study@ export | Channel + date | — |
| Face to face | Wait time | Average time in queue | min | — | — | Genesys | Study@ | Via Study@ export | Channel + date | — |
| Face to face | Abandonment rate | Share of contacts abandoned before handled | % | — | — | Genesys | Study@ | Via Study@ export | Channel + date | — |
| Any interaction | CSAT | Satisfaction after any interaction — by channel, enquiry type, over time | score | — | — | Qualtrics | Study@ | Via Study@ export | Channel + enquiry type + date | Also the VoC input for CSAT by journey stage |
| Any interaction | Enquiry type / intent | What the student was contacting about (e.g. seeking reassurance) | category | — | n/a | Genesys / Qualtrics | Study@ | Via Study@ export | Enquiry type | Feeds the COP question set — students' own words with volumes |
| Any interaction | Referrer | Where the contact came from: Contact page, VTAC (web/phone), COP landing page, main RMIT number, Student Connect | category | — | n/a | Genesys / Salesforce | Study@ | Via Study@ export | Referrer | Funnel-in for chains ending in an enquiry |
| Any interaction | Outcome — preference change | Did the student's RMIT preference change after the interaction | Y/N | — | — | Salesforce | Study@ | Via Study@ export | Interaction id | Closest thing to an outcome measure per touchpoint. Protect this |
| Any interaction | Outcome — eligibility | Did the interaction increase eligibility for enrolment | Y/N | — | — | Salesforce | Study@ | Via Study@ export | Interaction id | 'Next best action' field |
| Any interaction | Outcome — conversion | Did the student convert (apply / enrol) | Y/N | — | — | Salesforce | Study@ | Via Study@ export | Interaction id | — |
| Pre-COP outbound | Preference changes | Preference changes following outbound campaign contact | # | — | — | Salesforce | Study@ | Via Study@ export | Campaign | From Study@ session |

## Study@ / Marketing

| Touchpoint type | Metric | Definition | Unit | Benchmark | Level | Source system | Owner | Access | Join key | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| SMS | Delivered | Messages delivered | # | — | — | — | — | No | — | Source system and owner still unknown — open follow-up from brief |
| SMS | COP event registrations | Registrations triggered by the SMS | # | — | — | — | — | No | — | Study@ use SMS to drive COP event registration |
| SMS | Enquiries triggered | Enquiries to Study@ triggered by the SMS | # | — | — | — | — | No | — | — |

## Recruitment / Events

| Touchpoint type | Metric | Definition | Unit | Benchmark | Level | Source system | Owner | Access | Join key | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| Event | Registrations | Registrations for the event | # | — | — | — | — | No | Event id | Source still unknown — open follow-up from brief. Top-5 lead-gen figures already in the map |
| Event | Attendance | Attendees (vs registrations) | # | — | — | — | — | No | Event id | — |
| Event | CSAT | Post-event satisfaction | score | — | — | Qualtrics? | — | No | Event id | — |
| Event | Referrer | How registrants got to the registration — eDM, SMS, web, social | list | — | n/a | — | — | No | Event id | Funnel for chains ending in a registration |

## VoC

| Touchpoint type | Metric | Definition | Unit | Benchmark | Level | Source system | Owner | Access | Join key | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| Journey stage | CSAT by journey stage | Satisfaction aggregated to the map's journey stages | score | — | — | Qualtrics | CX / Study@ | Via export | Journey stage | Brief goal 1: incorporate the VoC program |
