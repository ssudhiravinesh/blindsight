/**
 * ToS text utilities shared by the edge functions and the extension. Pure:
 * relies only on Web APIs available in Deno, browsers and Node 20+.
 */

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  "#39": "'",
  nbsp: " ",
};

/** Single pass, so "&amp;lt;" decodes to "&lt;" rather than "<". */
function decodeEntities(text: string): string {
  return text.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, name: string) => ENTITIES[name]);
}

/** Strips markup and volatile date stamps so cosmetic edits don't change the hash. */
export function normalizeToS(rawText: string): string {
  if (!rawText) return "";
  // [^<>] keeps tag matching linear on inputs like "<<<<…".
  return decodeEntities(rawText.replace(/<[^<>]*>/g, " "))
    .replace(/\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s*\d{4}/gi, "")
    .replace(/\b\d{4}[-/]\d{2}[-/]\d{2}\b/g, "")
    .replace(/(?:last\s+(?:updated|modified|revised)|effective\s+(?:date|as\s+of))[\s:]*(?:\S+[\s,]*\d{0,4})?/gi, "")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

export async function hashToS(normalizedText: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalizedText));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Regex-based HTML-to-text for environments without a DOM (service worker, Deno). */
export function htmlToText(html: string): string {
  // End tags may carry whitespace/attributes (e.g. "</script\n foo>"), which browsers accept.
  const stripped = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\b[^>]*>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\b[^>]*>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript\b[^>]*>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^<>]+>/g, " ");
  return decodeEntities(stripped)
    .replace(/\s+/g, " ")
    .trim();
}
