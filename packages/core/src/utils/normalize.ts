/**
 * Copyright (c) 2026 Sudhir Avinesh. All rights reserved.
 * Proprietary and Confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 */

export function normalizeToS(rawText: string): string {
    if (!rawText) return '';
    return rawText
        .replace(/<[^>]*>/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s*\d{4}/gi, '')
        .replace(/\b\d{4}[-/]\d{2}[-/]\d{2}\b/g, '')
        .replace(/(?:last\s+(?:updated|modified|revised)|effective\s+(?:date|as\s+of))[\s:]*(?:\S+[\s,]*\d{0,4})?/gi, '')
        .replace(/\s+/g, ' ')
        .toLowerCase()
        .trim();
}
