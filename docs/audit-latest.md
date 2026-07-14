# Design review gate — comms-calendar

- **Reviewed:** 2026-07-09 · **Remediation:** 2026-07-10
- **Scope:** Whole project (`src/`, `server/data/comms.csv`), with focus on the recently reworked comm-card / layout / detail-panel work.
- **Reviews run:** standards-guardian, design-reviewer, a11y-auditor (WCAG 2.1 AA).

---

## Remediation status (2026-07-10)

Every code-level finding below has been fixed and verified (typecheck + production build pass; behaviour confirmed in-browser). The **one** item deliberately left open is **BL-1** — ratifying the categorical colour palette — which the product owner chose not to route through `/rmit-design:propose-change` at this time.

**Gate verdict remains FAIL** solely because BL-1 is a governance blocker that cannot be closed in code. Once DR-0001 is approved (or the palette is re-mapped), the gate should pass.

| ID | Finding | Status |
|----|---------|--------|
| BL-1 | Categorical palette DR still `proposed` | **Deferred** — owner excluded from this pass; still blocks handoff |
| BL-2 | Control state invisible to AT | ✅ `aria-pressed` + non-colour cues on filter chips, moment buttons, month buttons |
| BL-3 | Filtered cards interactive at 1.8:1 | ✅ filtered-out cards now `disabled` + `aria-hidden`, off the tab order |
| BL-4 | Empty Admissions/Conversion lanes | ✅ "No comms mapped yet" note per empty lane (gutter) |
| MF-1 | `grey-60` as text fails AA | ✅ all text/meaningful-icon uses moved to `grey-70`+ (existing token; no new deviation) |
| MF-2 | No canvas bypass | ✅ "Skip to communications list" link → `#comms-list` |
| MF-3 | No visible focus indicator | ✅ shared `FOCUS_RING` (box-shadow ring) applied to every canvas control |
| MF-4 | CTA false affordance | ✅ demoted to muted `grey-70` text (kept the wrap + trailing chevron per earlier request) |
| MF-5 | Corner badges overlap content | ✅ right gutter (`pr-4`) reserved when a card has badges |
| MF-6 | Detail panel padded with "—" rows | ✅ blank attribute rows omitted entirely |
| MF-7 | Opens on empty Year 10 | ✅ first load scrolls to Year 12 (month 24) |
| MF-8 | Flagship vs generic event colour | ↩︎ Superseded by stakeholder call: Open Day is **not** to be singled out (some teams dispute it's the most important), so open-day cards render as normal events. Moment labels still qualified ("Open Day · Yr 11/12"). |

**Consider items addressed:** native `<button>` for cards; `inert` background behind the open dialog; filter-aware `sr-only` list (incl. CTAs); visible form labels; `+N more` accessible name with month/team; feedback-badge & inbound-label contrast bumped; internal-tooling footer copy tightened; "No send data yet" affordance; filter-model signpost in the legend hint; deduped lane-stripe logic + shared `EYEBROW`/`FOCUS_RING` constants; larger dialog-close & primary-button hit areas.

**Consider items still open (low priority, by choice):** full 44px touch targets on canvas-geometry controls (month/moment/`+N more` — driven by `scale.ts` and left desktop-sized); loading-state skeleton; campaign-bar sticky-label clamp; legend how-to → popover redesign.

The full original findings, verbatim, follow for the record.

---

## Overall verdict: **FAIL** _(as first reviewed — see remediation status above)_

Two of three gates failed:

- **standards-guardian → FAIL** — one governance blocker (the off-styleguide categorical palette is documented in DR-0001 but the DR is still `proposed`, not approved). Token hygiene is otherwise clean (no hex literals, no arbitrary sizes, no second icon library, no CSS-in-JS, copy-case rules respected).
- **a11y-auditor → FAIL** — control state not exposed to assistive tech, filtered cards left interactive at ~1.8:1, `grey-60`-as-text contrast failures, and a missing bypass/focus-indicator story.
- **design-reviewer → advisory** — no hard verdict, but flags a "reads as broken" empty-lane problem as highest impact.

A project must PASS all three before `/rmit-design:handoff`. **Do not proceed to handoff until the blockers below are cleared.**

Note: contrast ratios below were computed with the WCAG relative-luminance formula, not estimated. The open-day event palette the recent work introduced was explicitly checked and **passes** (title `grey-90` on `tint-pink` = 10.24:1; knockout icon `tint-pink` on solid `pink` = 5.45:1).

---

## Blockers (must clear to pass the gate)

**BL-1 — Categorical palette DR is `proposed`, not approved.** _(standards)_
`src/index.css:39-46` defines 8 off-styleguide tokens (`--color-tint-purple/teal/pink/indigo`, `--color-purple/teal/pink/indigo`) consumed via `icons.ts:29-32`. They're now tracked in `docs/decisions/DR-0001-categorical-comm-colours.md` with AA contrast checks, but the DR still reads `Status: proposed` and its own Consequences require approval before handoff. An agent assurance / memory note is not approval.
→ Route through `/rmit-design:propose-change` and move DR-0001 to `approved` (or re-map the four non-email types onto canonical tints if rejected). This is an upstream styleguide gap, not a project-local one — do not "fix" it by editing `index.css` again.

**BL-2 — Control state is invisible to assistive tech.** _(a11y — WCAG 4.1.2, 1.4.1)_
Filter chips + "All types" reset (`Legend.tsx:21-31,39-52`) and moment-that-matters buttons (`HeaderBands.tsx:156-181`) convey on/off / pinned state by colour alone, with no `aria-pressed`. The two core interactions (filter by type, highlight a moment's linked comms) are unusable non-visually.
→ Add `aria-pressed` + a non-colour cue to each. `showLines` at `Legend.tsx:68` already does this correctly — mirror it.

**BL-3 — Filtered/dimmed cards stay interactive at ~1.8:1.** _(a11y — WCAG 1.4.3, 2.4.3, 4.1.2)_
Dimmed cards get `opacity-30` (`CommCard.tsx:56`) but keep `tabIndex={0}` and their activation handlers (`Timeline.tsx:214-216`), so keyboard users tab onto near-invisible cards (composited title 1.80:1) and open panels for comms the filter is hiding.
→ When dimmed because filtered-out, set `tabIndex={-1}` + `aria-hidden` (or `aria-disabled` and block activation) so focus order matches what's visible.

**BL-4 — Two of four swimlanes are empty with no empty state.** _(design)_
`server/data/comms.csv` has 19 Marketing + 2 Recruitment comms and **0 Admissions, 0 Conversion**. Those lanes render as permanently blank stripes across the full 38-month width — indistinguishable from a data-load failure, and it undermines the core "comms per team" job.
→ Seed representative Admissions/Conversion comms, or render a per-lane "No comms mapped yet" empty state (`Timeline.tsx` lane loop ~L211-229 / gutter L261-294).

---

## Must-fix (required for a clean pass; not all are AA-blocking on their own)

**MF-1 — `grey-60` used as body/label text fails AA on every light surface.** _(a11y 1.4.3 + standards; systemic)_
`grey-60` (#8d8d8d) tops out at ~3.3:1 on white and cannot reach 4.5:1. Appears at: Legend hints `Legend.tsx:79,81`; month tick labels `HeaderBands.tsx:85`; lane sub-labels `Timeline.tsx:290`; "Month"/"Moments that matter" `Timeline.tsx:108,124`. The `Link2` "triggers" icon (meaningful, needs 3:1) is `grey-60` on `tint-pink` = **2.69:1** (`CommCard.tsx:98-103`, WCAG 1.4.11).
→ Fix at the token via `/rmit-design:propose-change` — forbid `grey-60` for text / darken it; `grey-70` passes at 4.54:1. Do not patch per-component.

**MF-2 — No bypass for the huge canvas.** _(a11y — WCAG 2.4.1)_
100+ sequential tab stops (every card + 38 month buttons + moment buttons + chips) with no skip link (`App.tsx:88-160`).
→ Add a "Skip to communications list" link, or take cards out of sequential order behind a roving-tabindex/grid pattern with the `sr-only` list as the primary AT path.

**MF-3 — No visible focus indicator on canvas controls.** _(a11y — WCAG 2.4.7)_
Only the dialog defines `FOCUS_RING` (`CommDetailPanel.tsx:18`). Cards, legend chips, month/moment buttons and "+N more" chips rely on the UA default, which the `overflow-auto` scroller (`App.tsx:89`) can clip. The card `active`/hover ring is not tied to keyboard focus.
→ Lift `FOCUS_RING` to a shared location and apply a `ring`/`box-shadow`-based `focus-visible` indicator everywhere; ensure focus scrolls the element into view.

**MF-4 — CTA on cards is a false affordance.** _(design)_
`CommCard.tsx` renders the CTA as a blue link with a trailing arrow, but the whole card is one button — aiming at "Register now →" just opens the panel, and the link styling competes with the title for hierarchy.
→ Demote the CTA to plain secondary text (`grey-70`, no arrow) or drop it from the card and keep CTAs in the detail panel (already listed there).

**MF-5 — Corner badges overlap card content.** _(design)_
Trigger/feedback badges are absolutely positioned at `top/right-1` (`CommCard.tsx:97-114`) with no reserved gutter; two-line titles now run under them since cards became content-hugging with 8px padding.
→ Reserve a right gutter (e.g. `pr-5`) when `hasTriggers || feedbackCount`.

**MF-6 — Detail panel padded with empty "—" rows.** _(design)_
`CommDetailPanel.tsx:160-176` always renders Secondary 1/2, Triggers, Triggered by, Marketo ID even when blank, burying the rows that carry signal.
→ Skip `AttributeRow`s with no value (or collapse empties into one muted line).

**MF-7 — Default viewport opens on the emptiest part of the journey.** _(design)_
`App.tsx` starts at `scrollLeft: 0` (Year 10, ~no comms); first impression reads "empty app."
→ On load, anchor horizontal scroll to where content starts (Year 12 season), reusing the `useLayoutEffect` pattern at `App.tsx:60-63`.

**MF-8 — Flagship Open Day treatment collides with the generic event colour.** _(design)_
`event` is assigned the pink categorical hue (`icons.ts:32`), and flagship open-day cards use `tint-pink` + solid-pink chip — the same hue as any ordinary event, so the "highlight of the year" barely registers. Both Open Day moments (`journey.ts:28-29`) share the label with no year qualifier.
→ Give flagship cards a distinct accent (e.g. `rmit-red` border or a "flagship" badge matching the `MomentsBand` major treatment) and qualify labels ("Open Day · Yr 11").

---

## Consider (polish / robustness)

Interaction & content
- **Legend is an overloaded instruction bar** — four hint strings crammed into one row (`Legend.tsx:56-84`); move how-to microcopy into a help popover.
- **Filter model is surprising** — clicking one type *isolates* it rather than toggling (`App.tsx:70-78`); signpost it or switch to explicit multi-select.
- **No "metrics not tracked" / "no send data yet" affordance** — Performance block renders nothing when absent (`CommDetailPanel.tsx:179`); a muted note confirms intent.
- **Loading state is a bare text line** (`App.tsx:116-124`) — a lane-grid skeleton better sets expectations.
- **Campaign-bar sticky labels can misrepresent span** when the bar's start scrolls off (`CampaignBar.tsx:17-20`).
- **Internal-tooling copy leaking to UI** — SharePoint/roadmap footer (`CommDetailPanel.tsx:275-278`).

a11y robustness
- **Touch targets below the project's ≥44px standard** — filter chips ~30px, "+N more" 22px, close button ~26px, month/moment buttons ~24-26px. (No AA target-size SC in 2.1, but violates project standard.)
- **Modal doesn't neutralise the background** — timeline behind the dialog isn't `inert`/`aria-hidden` (`CommDetailPanel.tsx:117-127`).
- **Marginal small-text contrast** — feedback-count badge on `tint-pink` = 4.38:1 (`CommCard.tsx:105-113`); inbound peak labels `grey-70` on `tint-blue` = 4.29:1 (`InboundLane.tsx:57`).
- **Form fields lack persistent visible labels** — placeholder + `aria-label` only (`CommDetailPanel.tsx:232-264`); placeholders vanish on input (3.3.2).
- **"+N more" accessible name lacks month/team context** (`Timeline.tsx:249`).
- **`sr-only` list doesn't reflect filter/expansion state** (`App.tsx:149-159`).

Code / standards hygiene
- **`CommCard` is a `div role="button"`** (`CommCard.tsx:45`) — prefer a native `<button>` and drop the manual Enter/Space handling.
- **Hand-rolled buttons instead of a shared `Button`** — 3+ pill recipes across Legend / chip / add-note / month-moment. Unify (raise the missing shared component via `/rmit-design:propose-change`).
- **Duplicated lane-stripe IIFE** at `Timeline.tsx:135-152` and `:261-269` — extract a helper.
- **Repeated eyebrow/overline utility string** (`text-xs font-semibold tracking-widest uppercase`) across `CommDetailPanel`/`Timeline` — shared class candidate.
- **Inconsistent dim/disabled opacities** — `opacity-30` / `opacity-40` / `disabled:opacity-50`; standardise.
- **Layout magic numbers** (`top: hasTriggers ? 18 : 4`, `HeaderBands` line-packing constants) — name them as `scale.ts` constants.

---

## Resolved since the previous audit (no longer flagged)
- Form inputs now have `aria-label`s; detail panel is a proper `role="dialog"` with focus move-in/restore + Tab trap; Escape closes it; error copy is human sentence-case using `text-danger`; the categorical palette now has a DR (pending approval); stale `public/data/comms.csv` comment corrected.
- Open-day event palette contrast verified PASS; `prefers-reduced-motion` handled globally.
