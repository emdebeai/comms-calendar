# Quick Facts — Project Context

# Design system — RMIT EDC concept (consult before designing UI)

The canonical design system lives at **https://edc-student-portal-concept.vercel.app/styleguide**.
Treat it as the single source of truth for tokens, components, and patterns. Before inventing a colour, font size, spacing value, or component, `WebFetch` the relevant page from the table below.

## Pointer table — design question → page to fetch

| Question | Fetch |
|---|---|
| Active colour tokens, semantic names, contrast | `/styleguide/colour` |
| Type scale + heading/body pairings | `/styleguide/typography` |
| Spacing scale + form-element rhythm | `/styleguide/spacing` |
| Breakpoints, page padding, max widths | `/styleguide/layout` |
| Radii — when to use which | `/styleguide/radii` |
| Shadows + elevation tokens | `/styleguide/elevation` |
| Icon library + sizing-by-context | `/styleguide/iconography`, `/styleguide/icons` |
| Available components + anatomy + a11y | `/styleguide/components`, `/styleguide/controls` |
| `Button` variants + sizes | `/styleguide/buttons` |
| Form inputs (text, textarea, select, checkbox, radio, file) | `/styleguide/form` |
| Status badges, banners, toasts | `/styleguide/notifications` |
| WCAG contrast checks | `/styleguide/accessibility` |
| Copy rules (sentence case, error tone) | `/styleguide/voice-and-tone` |
| Why decisions go this way | `/styleguide/principles` |
| What's not built yet | `/styleguide/known-gaps` |

## Hard rules (apply when generating UI code)

- **No hex literals.** Use the named tokens from `/styleguide/colour` (e.g. `bg-rmit-blue`, `text-grey-70`). If a colour isn't tokenised, ask before introducing one.
- **No arbitrary text sizes** like `text-[22px]` for normal headings. Use the type scale on `/styleguide/typography`.
- **Sentence case** for inline copy (nav, buttons, back links). **Title Case** for headings and step-indicator labels.
- **Tailwind utilities only.** No CSS Modules, no styled-components, no CSS-in-JS.
- **Lucide for icons.** Don't add a second icon library.
- Before introducing a new pattern, search the styleguide first.