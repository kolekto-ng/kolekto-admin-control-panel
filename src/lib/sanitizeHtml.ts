import DOMPurify from "dompurify";

/**
 * Sanitizes campaign HTML for rendering inside the admin panel's own DOM.
 *
 * The compose tab renders the campaign body with dangerouslySetInnerHTML to
 * show a live inline preview. Without sanitizing, that is a stored-XSS sink:
 * campaign and template bodies are HTML authored by a human, they round-trip
 * through the database, and any `<script>` or `onerror=` in one would execute
 * with the admin's session — including for a DIFFERENT admin who merely opens
 * the campaign to review it.
 *
 * DOMPurify is used rather than a regex because this is the sink that matters
 * and it needs a real HTML parser to be trustworthy. The backend also strips
 * script constructs on write (kolekto-be-old/utils/htmlSanitizer.js); this is
 * the layer that actually protects the browser.
 *
 * The allow-list is deliberately generous about FORMATTING — `style` and
 * `align` are kept, because stripping them would destroy the text alignment
 * and inline styling the editor exists to produce. Only script execution is
 * removed.
 */
export function sanitizeCampaignHtml(html: string): string {
  return DOMPurify.sanitize(html || "", {
    ALLOWED_TAGS: [
      "p", "br", "hr", "div", "span", "section",
      "h1", "h2", "h3", "h4", "h5", "h6",
      "strong", "b", "em", "i", "u", "s", "strike", "sub", "sup", "small", "mark",
      "ul", "ol", "li", "blockquote", "pre", "code",
      "a", "img",
      "table", "thead", "tbody", "tfoot", "tr", "th", "td", "colgroup", "col",
      "figure", "figcaption",
    ],
    ALLOWED_ATTR: [
      "href", "src", "alt", "title", "target", "rel",
      // Formatting attributes — required for alignment and email layout.
      "style", "class", "align", "valign", "width", "height",
      "colspan", "rowspan", "cellpadding", "cellspacing", "border", "bgcolor", "role",
    ],
    // http/https/mailto/tel and data: images only — blocks javascript: URLs.
    ALLOWED_URI_REGEXP: /^(?:https?|mailto|tel|data:image\/(?:png|jpe?g|gif|webp);base64,)/i,
    // Keeps <a target="_blank"> from handing the opener to the linked page.
    ADD_ATTR: ["target"],
  });
}

/** Builds the srcDoc for the full-email preview iframe. */
export function sanitizePreviewDocument(html: string): string {
  return DOMPurify.sanitize(html || "", {
    WHOLE_DOCUMENT: true,
    ALLOWED_URI_REGEXP: /^(?:https?|mailto|tel|cid|data:image\/(?:png|jpe?g|gif|webp);base64,)/i,
    FORBID_TAGS: ["script", "iframe", "object", "embed", "form"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onanimationstart"],
  });
}
