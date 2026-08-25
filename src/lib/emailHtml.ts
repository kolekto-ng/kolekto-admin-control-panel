/**
 * Detects a COMPLETE email document as opposed to a body fragment.
 *
 * Mirrors isFullHtmlDocument in
 * kolekto-be-old/templates/email/baseCampaignTemplate.js — keep the two in
 * sync, since the backend uses the same test to decide whether to wrap the
 * body in the Kolekto brand shell.
 *
 * This distinction is what stops a designed email from being destroyed. The
 * rich-text editor is a ProseMirror document: it can only represent nodes in
 * its schema, and it silently discards everything else on parse. Feeding it a
 * finished email flattens nested table layout, drops every <style> block, and
 * strips presentational attributes (bgcolor, width, align) — turning a 10KB
 * design into a bare table stub with no error shown.
 *
 * So a full document is never handed to the editor at all; it is edited as
 * source and previewed in a sandboxed iframe.
 */
export function isFullHtmlDocument(html: string | null | undefined): boolean {
  if (typeof html !== "string") return false;
  const head = html.slice(0, 2000).toLowerCase();
  return /<!doctype\s+html/.test(head) || /<html[\s>]/.test(head) || /<body[\s>]/.test(head);
}

/** True when a full document has no unsubscribe merge tag or link. */
export function isMissingUnsubscribe(html: string): boolean {
  return !/unsubscribe/i.test(html);
}
