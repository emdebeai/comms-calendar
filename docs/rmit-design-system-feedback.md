# RMIT Design System: feedback from building a real product on it

**From:** the Comms Touchpoint Map team (EDC prototype)
**Re:** [rmit-design-system-styleguide.vercel.app](https://rmit-design-system-styleguide.vercel.app)
**Date:** 19 August 2026

## Why this exists

We built a dense, data-heavy internal tool (a prospective-student communications timeline: charts, a gantt, filter controls, detail panels, and two full form surfaces) entirely on the design system's tokens and patterns. This document lists every place where we had to go off-system to ship, because each of those is a real gap the system could close.

It is written as improvement requests on a strong base, not a critique. The token architecture, the semantic naming, and the foundations pages are genuinely good to build against. Everything below is what a real product surfaced that a component gallery would not.

## How to read this

Each item is one of two kinds:

- **Documentation gap**: the pattern likely exists in `@rmit-ds/ui`, but the styleguide page does not publish the actual recipe (tokens, classes, states), so a developer cannot build it from the page alone. Closing these is mostly a writing task.
- **Coverage gap**: the pattern does not exist in the system at all, so every team invents its own. Closing these is a design task.

Severity is our read of impact on a real product: **High** blocks correct or accessible implementation; **Medium** causes silent divergence between teams; **Low** is polish.

---

## Summary

| # | Item | Kind | Severity |
|---|---|---|---|
| 1 | Form fields have anatomy but no implementation tokens | Documentation | **High** |
| 2 | No focus-ring token | Coverage | **High** |
| 3 | `grey-60` fails AA contrast for small text | Defect | **High** |
| 4 | Checkbox, radio, and chip/segmented controls undocumented | Documentation | Medium |
| 5 | Button variants list names but not tokens or states | Documentation | Medium |
| 6 | Dark-mode token values are not published | Coverage | **High** |
| 7 | Course-accent palette is half-specified (no pairing rules) | Documentation | Medium |
| 8 | No categorical / data-visualisation colour system | Coverage | **High** |
| 9 | No chip / tag / badge taxonomy | Coverage | Medium |
| 10 | No empty, loading, or "data gap" states | Coverage | Medium |
| 11 | Overlay specs (dropdown, popover, tooltip) are thin | Documentation | Medium |
| 12 | No density / compact scale for data-heavy tools | Coverage | Medium |
| 13 | Accessibility is contrast-only; patterns are missing | Coverage | Medium |
| 14 | No motion / animation tokens | Coverage | Low |

---

## Part A: Gaps to close (exists, but underspecified or wrong)

### 1. Form fields have anatomy but no implementation tokens (High)

**What the page says now.** `/form` and `/controls` describe behaviour and structure well: label above the control, sentence case, helper text and error message stacked, `gap-10` between groups and `gap-6` within, error state as a red border plus `aria-invalid="true"` plus a message below. Good anatomy.

**What is missing.** No tokens or classes for the control itself: background, border colour, border width, radius, padding, height, font size, text colour, placeholder colour, focus treatment, or disabled treatment. We had to reconstruct the recipe by cross-referencing `/colour` (default control border is `grey-30`) and `/radii` (`rounded-md`). A developer cannot build the input from the form page.

**Why it matters.** Forms are the single most-used interactive component. Leaving the recipe implicit guarantees every product's inputs look slightly different, and it pushes the accessibility-critical focus and error states onto each team to reinvent.

**Suggested fix.** Publish the full input, textarea, and select recipe on `/form`, with the exact classes for default, focus, filled, disabled, read-only, and error, and the placeholder colour. State the label recipe explicitly too (size, weight, colour, spacing to control).

---

### 2. No focus-ring token (High)

**What the page says now.** `/colour` explicitly notes it "does not explicitly state a focus ring token." Nothing on the site defines a canonical focus treatment.

**What is missing.** A named focus token: colour, ring width, offset, and how the offset behaves on light versus dark surfaces.

**Why it matters.** Visible focus is a hard WCAG 2.4.7 (AA) requirement, so every product must build one, and without a token they will all differ in colour and thickness. We authored our own (`ring-2` in the interactive blue with a `ring-offset`), and we initially hardcoded a white offset, which produced a white halo in dark mode until we switched it to the surface token. That is exactly the kind of mistake a token prevents.

**Suggested fix.** Define one focus token (we suggest a 2px ring in `highlight` / `blue-highlight` with a 1px offset that references the surface token so it adapts by theme) and reference it from every interactive component spec.

---

### 3. `grey-60` fails AA contrast for small text (High)

**What the page says now.** `/colour` publishes `grey-60` as `#8d8d8d` and maps it to the semantic token `content-subtle`.

**The defect.** `#8d8d8d` is approximately **3.3:1 on white** and about **3.0:1 on the `surface` token** (`#f1f2ef`). Both are below the 4.5:1 required for normal-size body text, and `content-subtle` sits right on the 3:1 floor even for large text and UI components. Because it is named `content-subtle`, teams will reach for it for exactly the small, secondary meta text where it fails.

**Evidence.** We had to darken it to `#767676` in our build (about 4.55:1 on white) to pass, which means our `grey-60` no longer matches the system's.

**Why it matters.** This is a testable accessibility failure shipped under the system's own blessing, and it is the kind of thing the `/accessibility` page exists to prevent.

**Suggested fix.** Either darken `grey-60` to clear 4.5:1 on `surface` (around `#767676` or darker), or keep the value but re-scope `content-subtle` to large-text and non-text use only, with an explicit warning on `/colour` and `/accessibility`.

---

### 4. Checkbox, radio, and the chip / segmented-control family are undocumented (Medium)

**What the page says now.** `/controls` specs the toggle switch well (`role="switch"`, `aria-checked`, pill with sliding knob, space to toggle). Nothing else.

**What is missing.** Checkbox, radio button, segmented control, and filter chips have no specs at all: size, border token, checked or selected colour, focus, label styling, spacing.

**Why it matters.** We built checkboxes (a review table), filter pills, and segmented toggles with no reference, so each is a local invention. These are table-stakes controls that every form and toolbar needs.

**Suggested fix.** Add checkbox, radio, and a chip/segmented-control spec to `/controls`, including the selected colour token and focus treatment, and note the accessible pattern for each (for filters, `aria-pressed` toggle buttons worked well for us and may be worth blessing alongside `role="switch"`).

---

### 5. Button variants list names but not tokens or states (Medium)

**What the page says now.** `/buttons` names the variants (primary in RMIT red, secondary in RMIT blue, outline, ghost, white) and the size padding (`sm` `px-4 py-2 text-sm`, `md` `px-6 py-3 text-base`, `lg` `px-8 py-4 text-lg`).

**What is missing.** Per-variant background and text tokens, hover, active, disabled, and focus. There is also no icon-button or icon-plus-label spec.

**Why it matters.** A developer cannot build the buttons from the page. Icon buttons in particular are everywhere in a real tool (toolbars, close buttons, steppers) and had no reference, so we made our own sizing and accessible-name rules.

**Suggested fix.** Add a state and token table per variant, and an icon-button spec (size, hit area, required accessible name).

---

### 6. Dark-mode token values are not published (High)

**What the page says now.** `/colour` leans on semantic tokens (`content`, `content-muted`, `border`, `brand`, `brand-strong`, `highlight`, `on-brand`) and states that "shared components consume semantic tokens rather than raw primitive names, enabling product-level system remapping." That strongly implies theme-ability.

**What is missing.** The dark-theme values for those tokens. There is no dark palette table anywhere on the site.

**Why it matters.** If theme-ability is a promise of the semantic layer, the dark values are part of the contract. We supported dark mode and had to author a complete dark `@theme` by hand (every grey step, brand, status, tint, and course accent re-derived), which means our dark theme is an educated guess rather than the system's.

**Suggested fix.** Publish the dark values for the full token set on `/colour`, and state the theming mechanism (data attribute or media query) that flips them.

---

### 7. Course-accent palette is half-specified (Medium)

**What the page says now.** `/colour` publishes the course-accent tints (`tint-purple`, `tint-teal`, `tint-pink`, `tint-indigo`) plus soft variants, and the matching text hues (`purple` `#5e3a9e`, `teal` `#0d6f64`, `pink` `#a92561`, `indigo` `#2e3a8c`).

**What is missing.** Pairing and usage rules: which text hue is meant to sit on which tint, the contrast-checked combinations, and guidance on assigning accents to categories.

**Why it matters.** We use these to colour-code communication types (email, SMS, webinar, call, event). Without pairing rules, teams will combine a tint and a text hue that do not meet contrast, or assign accents inconsistently across products.

**Suggested fix.** Add a small pairing table (tint plus its intended text hue, with the contrast ratio) and one sentence on categorical assignment.

---

## Part B: Things to add (missing entirely)

### 8. A categorical / data-visualisation colour system (High)

This is the biggest coverage gap for any dashboard, report, or analytics surface, which is most internal tooling.

**What is missing.** The system has decorative course-accent tints but no proper categorical or sequential data palette, no chart-specific tokens (axis, gridline, series), and, most importantly, no **"colour is not the only signal"** pattern. Our map is charts, a gantt, timelines, and status dots, and to stay accessible we had to pair every colour with an icon and provide screen-reader-only data tables behind each chart. None of that is in the system.

**Why it matters.** Every reporting product at RMIT will hit this wall and solve it differently, and most will solve the accessibility half badly.

**Suggested fix.** Add a data-viz foundations page: a categorical palette (colour-blind-safe, contrast-checked), a sequential ramp, chart-part tokens, and a required "redundant encoding" pattern (icon or shape or text alongside colour) with the sr-only-table technique documented.

---

### 9. A chip / tag / badge taxonomy (Medium)

**What is missing.** The styleguide mentions "pills" only once, under `/radii` (`rounded-full`). `/notifications` covers banners and toasts, but the small inline-chip family is absent: status badge, filter chip, removable tag, and count badge, each with its own colour, size, and interaction rules.

**Why it matters.** We use small pills for journey stage, campaign, audience, counts, and status, all invented locally. These are among the most common atoms in a data UI.

**Suggested fix.** Add a chip/tag/badge page that distinguishes the four types and gives each a colour and interaction spec, tied to the existing tint tokens.

---

### 10. Empty, loading, and "data gap" states (Medium)

**What is missing.** No empty-state, loading, or missing-data pattern anywhere in the system.

**Why it matters.** A core principle of our product is honestly showing where data is missing rather than fabricating a default (for example "no CTA recorded" and explicit evidence-gap flags). We had to design that language and its visual treatment from scratch. This is a content-design gap as much as a visual one, and it pairs naturally with the existing `/voice-and-tone` page.

**Suggested fix.** Add an empty-and-gap-states page: the visual treatment for "no data yet", "intentionally blank", and "loading", plus tone guidance for each.

---

### 11. Concrete overlay specs (Medium)

**What the page says now.** `/overlays` exists in the nav (modals, popovers, tooltips), but the published detail is thin.

**What is missing.** Buildable specs for dropdown menu, popover, and tooltip: elevation, max-width, arrow, dismiss behaviour, and focus trapping.

**Why it matters.** Our floating control docks, legend popovers, and tooltips had no reference for any of that, so each is a local decision.

**Suggested fix.** Flesh out `/overlays` with a spec per overlay type, tied to the elevation and radii scales, and state the focus-management expectation for each.

---

### 12. A density / compact scale (Medium)

**What is missing.** A documented compact variant of the sizing scale.

**Why it matters.** The published sizing is generous and marketing-page shaped (`md` button is `py-3`, forms use `gap-10` between groups). A dense internal tool either follows the system and wastes vertical space, or diverges silently, which is what our map did. Vertical space was one of our biggest layout constraints.

**Suggested fix.** Publish a compact scale (tighter control heights, paddings, and group gaps) as an explicit, sanctioned alternative for data-dense surfaces, so divergence is on-system rather than ad hoc.

---

### 13. Accessibility is contrast-only; the patterns are missing (Medium)

**What the page says now.** `/accessibility` covers contrast ratios (the WCAG checks).

**What is missing.** The accessibility work that actually consumed our time was patterns, not ratios: the focus-ring token (item 2), screen-reader-only companion tables for charts, the `aria-pressed` toggle-button pattern, accessible names for icon-only controls, and skip links. None are documented as reusable patterns.

**Why it matters.** Contrast is the easy half. The pattern half is where products silently fail, and a mature system ships these as named, copy-pasteable patterns so they are done once, not rediscovered per product.

**Suggested fix.** Expand `/accessibility` (or add an a11y-patterns page) covering focus, icon-only control naming, redundant encoding for charts, sr-only tables, toggle semantics, and skip links.

---

### 14. Motion / animation tokens (Low)

**What is missing.** No duration or easing tokens.

**Why it matters.** We used a handful of transitions and a small "pop-in" animation with locally chosen timings. Minor, but part of a complete system, and cheap to add.

**Suggested fix.** Add duration and easing tokens and one line on when motion is appropriate.

---

## If you fund three things first

1. **The form recipe and a focus-ring token (items 1 and 2).** Highest usage, currently unbuildable from the docs, and both gate WCAG compliance.
2. **Fix `grey-60` (item 3).** A near one-line change that stops products shipping inaccessible body text under the system's own naming.
3. **The categorical data-viz palette plus the "colour is not the only signal" pattern (item 8).** The biggest missing family for the reporting and dashboard work that makes up most internal tooling.

## A note on evidence

Every item above is the honest by-product of one prototype, and each marks a specific place where a real product had to leave the system to ship. If it is useful, that prototype is a decent live stress-test artefact to review together, since it exercises forms, charts, dense layout, dark mode, and accessibility patterns all at once.
