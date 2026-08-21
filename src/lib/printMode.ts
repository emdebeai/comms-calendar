// Single source of truth for the print/export view (?print). Used to strip
// interactive-only affordances (hover hints, filter toggles, the sticky pin)
// that make no sense on a static printed page. The @media print block in
// index.css handles the rest (opening the scrollport, hiding tooltips).
export const PRINT_MODE =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).has("print");
