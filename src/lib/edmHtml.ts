// Marketo email templates (HTML export) → each email's link inventory. The
// template is the email as built: every link, in order, inside the module
// it sits in, with Marketo tokens still unresolved ({{my.12}} is the UTM
// string, appended at send time). From it: which links are buttons, which
// are body text, which are banner images, which are footer furniture; the
// rank of each CTA by position; and whether each carries the tracking
// token. Joined to the sends sheet by the Marketo ID in the file name.
// Parsed with the browser's DOMParser on files the user picked; nothing
// here touches the network. Templates hold tokens, not recipients.
import { pagePath } from "./marketo";

export type EdmLinkKind = "button" | "image" | "text" | "footer";
export type EdmLink = {
  /** The href with tokens and query stripped, as pagePath() keys it. */
  path: string;
  /** The href as written, tokens included. */
  href: string;
  text: string;
  kind: EdmLinkKind;
  module: string;
  /** Carries the UTM token or a literal utm_ query. */
  tagged: boolean;
  /** primary / secondary / tertiary for buttons by order; "" otherwise. */
  rank: "primary" | "secondary" | "tertiary" | "";
};
export type EdmTemplate = { marketoId: string; /** The file stem, normalised like an Email Name. */ nameKey: string; file: string; headline: string; links: EdmLink[] };

/** Email Names and template file names differ only in punctuation
 *  ("PSTU-Marketing-DOM-SL-9095-20Nov.Year 12" vs
 *  "PSTU_Marketing_DOM_SL_9095_20Nov_Year_12"): compare them stripped. */
export const nameKey = (s: string) => s.replace(/\.html?$/i, "").toLowerCase().replace(/[^a-z0-9]/g, "");

// Modules that are chrome, not content: their links never count as CTAs.
const FURNITURE = /^(top_preheader|logo|footer|acknowledgement|brand_mark|recipient_details|line_space|spacer)/i;
const SYSTEM = /\{\{system\./;
const UTM_TOKEN = /\{\{my\.\d+\}\}|utm_/;

/** The Marketo ID from a template's file name: "…_9095_20Nov_Year_12.html" → "9095". */
export const marketoIdFromName = (name: string): string => name.match(/(?:^|_)(\d{4,})(?:_|\.)/)?.[1] ?? "";

const clean = (s: string) => s.replace(/\s+/g, " ").trim();
// A link is a button when its nearest table is a filled, rounded block.
const isButton = (a: Element) => {
  const t = a.closest("table");
  const bg = (t?.getAttribute("bgcolor") ?? "").toLowerCase();
  const style = (t?.getAttribute("style") ?? "").toLowerCase();
  return Boolean(t && bg && !/#fff|#f5f5f5|transparent/.test(bg) && /border-radius/.test(style));
};

export function parseEdmTemplate(html: string, file: string): EdmTemplate {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const headline = clean(doc.querySelector(".mktoText[id^='Title_Text']")?.textContent ?? "")
    .replace(/\{\{[^}]*\}\}/g, "there").replace(/^Hi there,\s*/i, "");
  const seen = new Set<string>();
  const links: EdmLink[] = [];
  for (const a of Array.from(doc.querySelectorAll("a[href]"))) {
    const href = a.getAttribute("href")?.trim() ?? "";
    if (!href || SYSTEM.test(href)) continue;
    const module = a.closest("tr.mktoModule")?.id ?? "";
    const resolved = href.replace(/\{\{[^}]*default=([^}]*)\}\}/g, "$1").replace(/\{\{[^}]*\}\}/g, "");
    const path = pagePath(resolved.startsWith("http") ? resolved : `https://${resolved}`);
    const img = a.querySelector("img");
    const kind: EdmLinkKind = FURNITURE.test(module) ? "footer" : isButton(a) ? "button" : img ? "image" : "text";
    const text = clean(a.textContent ?? "") || clean(img?.getAttribute("alt") ?? "") || (kind === "image" ? "Banner" : "");
    // One row per destination per email; a button and its image share one.
    const key = `${path}|${kind === "footer" ? "f" : "c"}`;
    if (seen.has(key)) continue;
    seen.add(key);
    links.push({ path, href, text, kind, module, tagged: UTM_TOKEN.test(href), rank: "" });
  }
  // Buttons rank by position; everything else is unranked.
  let n = 0;
  for (const l of links) if (l.kind === "button") l.rank = (["primary", "secondary"] as const)[n++] ?? "tertiary";
  return { marketoId: marketoIdFromName(file), nameKey: nameKey(file), file, headline, links };
}

/** Lookup for the eDM fold. A Marketo ID is the program's, shared by every
 *  audience variant in it, so a template is matched to a send by name first
 *  and by Marketo ID only when that program has a single send. */
export type TemplateIndex = { byName: Map<string, EdmTemplate>; byId: Map<string, EdmTemplate[]> };
export function templateIndex(templates: EdmTemplate[]): TemplateIndex {
  const byName = new Map<string, EdmTemplate>(), byId = new Map<string, EdmTemplate[]>();
  for (const t of templates) {
    byName.set(t.nameKey, t);
    byId.set(t.marketoId, [...(byId.get(t.marketoId) ?? []), t]);
  }
  return { byName, byId };
}
