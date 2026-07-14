# DR-0001: Categorical colour scale for comm types

- **Status**: proposed
- **Date**: 2026-07-09
- **Author**: George Hanna
- **Scope**: system-change-proposed

## Context

The comms timeline encodes **team** by swimlane and **comm type** (email, SMS,
webinar, call, in-person event) by colour. Five visually distinct, accessible
categorical hues are needed so a viewer can tell types apart at a glance across
a dense canvas.

The canonical EDC styleguide palette (`/styleguide/colour`) provides brand
colours, a grey ramp, four semantic tints (blue/amber/red/green) and status
colours — but **no categorical scale**. Only `email` maps cleanly onto a
canonical token (`tint-blue` / `rmit-blue`). The other four types have no
on-token home.

The standards-guardian correctly flagged this as a divergence (FAIL): eight
non-canonical tokens were added to `src/index.css` without a decision record.

## Decision

Keep the eight categorical tokens in `src/index.css` **for now**, but record
them here as an explicit, tracked deviation rather than an undocumented one:

```
--color-tint-purple  #ede4f7   --color-purple  #5e3a9e   (webinar)
--color-tint-teal    #d4f1ee   --color-teal    #0d6f64   (sms)
--color-tint-pink    #fde0ea   --color-pink    #a92561   (event)
--color-tint-indigo  #e1e5fb   --color-indigo  #2e3a8c   (call)
```

Each type's `text`-on-`chip` pairing was contrast-checked and passes WCAG AA
(sms 5.07, webinar 6.62, call ≈7+, event 5.45 — all ≥ 4.5:1).

Because a categorical scale would help **any** project that needs to distinguish
more than four categories, the correct long-term home is the styleguide itself.
This DR is therefore scoped `system-change-proposed` and should be taken through
`/rmit-design:propose-change` so the scale is added upstream (or explicitly
rejected, at which point these types must re-map onto existing tokens).

## Alternatives considered

- **Map all types onto the four canonical tints.** Rejected: only four tints
  exist for five types, forcing two types to share a colour and defeating the
  timeline's core purpose (telling types apart).
- **Encode type by icon only, no colour.** Rejected: at card density the icons
  are 14px; colour is the primary fast-scan channel. Icons remain as a
  redundant, non-colour cue (supports colour-blind users).
- **Silently keep the tokens (status quo).** Rejected: undocumented deviations
  fail the standards gate and leave no audit trail.

## Consequences

- The prototype stays visually correct and AA-contrast-compliant today.
- The deviation is now traceable; the standards-guardian can see an explicit DR
  rather than an unexplained token block.
- **This DR is `proposed`, not `approved`.** A human approver must accept it, and
  the categorical scale must be resolved via `/rmit-design:propose-change`
  before `/rmit-design:handoff`. Until then the divergence remains open.
- If the propose-change is rejected, `src/index.css` and
  `src/components/icons.ts` must be reworked to canonical tokens.
