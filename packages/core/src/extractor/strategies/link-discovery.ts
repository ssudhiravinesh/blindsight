/**
 * Copyright (c) 2026 Sudhir Avinesh. All rights reserved.
 * Proprietary and Confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 */

import type { ExtractionStrategy } from '../strategy';
import type { TosLink } from '../../types';
import { traverseDOM } from '../../utils/dom';
import { extractTextFromHtml } from '../html-parser';

const TOS_LINK_KEYWORDS = [
    'terms of service', 'terms of use', 'terms and conditions', 'terms & conditions',
    'user agreement', 'service agreement', 'legal terms',
    'terms', 'tos',
    '/terms', '/legal', '/tos', '/eula',
];

const LEGAL_LINK_KEYWORDS = [
    'privacy policy', 'privacy', 'cookie policy', 'acceptable use',
    'community guidelines', 'data policy',
];

function containsKeyword(text: string, keywords: string[]): boolean {
    if (!text) return false;
    const lower = text.toLowerCase().trim();
    return keywords.some((kw) => lower.includes(kw));
}

function isExactKeywordMatch(text: string, keywords: string[]): boolean {
    if (!text) return false;
    const lower = text.toLowerCase().trim();
    return keywords.some((kw) => lower === kw);
}

export class LinkDiscoveryStrategy implements ExtractionStrategy {
    name = 'LinkDiscoveryStrategy';
    priority = 30;
    
    // Store discovered links so the orchestrator can inspect or fallback
    discoveredLinks: TosLink[] = [];

    canExtract(): boolean {
        return true;
    }

    findLinks(): TosLink[] {
        const tosLinks: TosLink[] = [];
        const seenUrls = new Set<string>();

        traverseDOM(document.body, (el) => {
            if (el.tagName !== 'A') return;
            const link = el as HTMLAnchorElement;
            const href = link.href ?? '';
            if (!href || href === '#' || href.startsWith('javascript:')) return;

            const text = (link.textContent ?? '').trim();
            const title = link.title ?? '';
            const ariaLabel = link.getAttribute('aria-label') ?? '';
            const hrefLower = href.toLowerCase();
            const allText = `${text} ${title} ${ariaLabel}`.toLowerCase();

            if (seenUrls.has(href)) return;

            if (containsKeyword(allText, TOS_LINK_KEYWORDS) || isExactKeywordMatch(text, TOS_LINK_KEYWORDS)) {
                tosLinks.push({ url: href, text: text || 'Terms of Service', type: 'tos', priority: 1 });
                seenUrls.add(href);
                return;
            }

            if (containsKeyword(hrefLower, ['/terms', '/tos', '/eula', '/legal/terms', '/user-agreement'])) {
                tosLinks.push({ url: href, text: text || 'Terms of Service', type: 'tos', priority: 1 });
                seenUrls.add(href);
                return;
            }

            if (containsKeyword(allText, LEGAL_LINK_KEYWORDS) || isExactKeywordMatch(text, LEGAL_LINK_KEYWORDS)) {
                tosLinks.push({ url: href, text: text || 'Legal Document', type: 'legal', priority: 2 });
                seenUrls.add(href);
                return;
            }

            if (containsKeyword(hrefLower, ['/privacy', '/data-policy', '/cookie-policy'])) {
                tosLinks.push({ url: href, text: text || 'Privacy Policy', type: 'legal', priority: 2 });
                seenUrls.add(href);
            }
        });

        tosLinks.sort((a, b) => a.priority - b.priority);
        this.discoveredLinks = tosLinks;
        return tosLinks;
    }

    async extract(): Promise<string | null> {
        const links = this.findLinks();
        if (links.length === 0) return null;

        const primary = links[0];
        try {
            const response = await fetch(primary.url, {
                method: 'GET',
                headers: { Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
                credentials: 'omit',
            });

            if (!response.ok) return null;

            const html = await response.text();
            const text = extractTextFromHtml(html);
            return text.length >= 200 ? text : null;
        } catch {
            // CORS blocking or network issue; will fallback
            return null;
        }
    }
}
