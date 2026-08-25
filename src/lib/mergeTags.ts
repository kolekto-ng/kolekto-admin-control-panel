import type { MergeTag } from "@/pages/communications/api";

/**
 * Client-side mirror of kolekto-be-old/utils/mergeTagEngine.js.
 *
 * It exists so the editor's live preview can resolve {{first_name}} as the
 * admin types, without a save + round-trip per keystroke. Because it is a
 * mirror, it must match the server's semantics exactly — same pattern, same
 * fallback handling, same escaping — or the preview would promise something
 * the send path does not deliver.
 *
 * Syntax: {{key}} or {{key|Fallback text}}.
 */
const MERGE_TAG_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*(?:\|([^}]*))?\}\}/g;

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Replaces every {{key}} / {{key|fallback}} in `html` using `data`. A key
 * that is missing or empty falls back to the template's fallback text, or to
 * an empty string — a raw {{...}} is never left behind, matching the server.
 */
export function renderMergeTags(html: string, data: Record<string, string>): string {
  if (!html) return html;
  return html.replace(MERGE_TAG_PATTERN, (_match, key: string, fallback?: string) => {
    const value = data[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return escapeHtml(value);
    }
    return fallback !== undefined ? escapeHtml(fallback.trim()) : "";
  });
}

/** The distinct merge-tag keys referenced in `html`. */
export function extractMergeTagKeys(html: string): string[] {
  if (!html) return [];
  const keys = new Set<string>();
  for (const match of html.matchAll(MERGE_TAG_PATTERN)) keys.add(match[1]);
  return Array.from(keys);
}

/** Builds the { key: sample } map the preview renders with. */
export function buildSampleData(tags: MergeTag[]): Record<string, string> {
  const data: Record<string, string> = {};
  for (const tag of tags) {
    if (tag.sample) data[tag.key] = tag.sample;
  }
  return data;
}

/**
 * Keys used in `html` that the catalog does not know about — almost always a
 * typo ({{firstname}} for {{first_name}}). Worth surfacing, because such a tag
 * resolves to an EMPTY string when the campaign is sent, silently leaving a
 * gap in the copy rather than an obvious error.
 */
export function findUnknownMergeTags(html: string, tags: MergeTag[]): string[] {
  const known = new Set(tags.map((t) => t.key));
  return extractMergeTagKeys(html).filter((k) => !known.has(k));
}
