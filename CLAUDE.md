# Quick Facts — Project Context

# Design system — RMIT Design System (consult before designing UI)

The canonical design system lives at **https://rmit-design-system-styleguide.vercel.app**.
Treat it as the single source of truth for tokens, components, and patterns. Before inventing a colour, font size, spacing value, or component, `WebFetch` the relevant page from the table below.

## Pointer table — design question → page to fetch

| Question | Fetch |
|---|---|
| Active colour tokens, semantic names, contrast | `/colour` |
| Type scale + heading/body pairings | `/typography` |
| Spacing scale + form-element rhythm | `/spacing` |
| Breakpoints, page padding, max widths | `/layout` |
| Radii — when to use which | `/radii` |
| Shadows + elevation tokens | `/elevation` |
| Icon library + sizing-by-context | `/iconography`, `/icons` |
| Form controls (anatomy + a11y) | `/controls` |
| Display + layout components | `/display` |
| Overlays (modals, popovers, tooltips) | `/overlays` |
| `Button` variants + sizes | `/buttons` |
| Form inputs (text, textarea, select, checkbox, radio, file) | `/form` |
| Status badges, banners, toasts | `/notifications` |
| WCAG contrast checks | `/accessibility` |
| Copy rules (sentence case, error tone) | `/voice-and-tone` |
| Why decisions go this way | `/principles` |
| What's not built yet | `/known-gaps` |

## Hard rules (apply when generating UI code)

- **No hex literals.** Use the named tokens from `/colour` (e.g. `bg-rmit-blue`, `text-grey-70`). If a colour isn't tokenised, ask before introducing one.
- **No arbitrary text sizes** like `text-[22px]` for normal headings. Use the type scale on `/typography`.
- **Sentence case** for inline copy (nav, buttons, back links). **Title Case** for headings and step-indicator labels.
- **Tailwind utilities only.** No CSS Modules, no styled-components, no CSS-in-JS.
- **Lucide for icons.** Don't add a second icon library.
- Before introducing a new pattern, search the styleguide first.