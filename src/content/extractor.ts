import type { ExtractionResult, TosLink } from '../lib/types';

// ─── Keywords ───────────────────────────────────────────
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

// Well-known ToS/Privacy URL patterns to try as last resort
const WELL_KNOWN_PATHS = [
    '/terms', '/tos', '/terms-of-service', '/terms-of-use',
    '/legal/terms', '/about/tos', '/about/terms',
    '/policies/terms', '/support/tos',
    '/privacy', '/privacy-policy', '/legal/privacy',
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

// ─── Find Links ─────────────────────────────────────────
export function findTosLinks(): TosLink[] {
    const links = document.querySelectorAll<HTMLAnchorElement>('a[href]');
    const tosLinks: TosLink[] = [];
    const seenUrls = new Set<string>();

    for (const link of links) {
        const href = link.href ?? '';
        if (!href || href === '#' || href.startsWith('javascript:')) continue;

        const text = (link.textContent ?? '').trim();
        const title = link.title ?? '';
        const ariaLabel = link.getAttribute('aria-label') ?? '';
        const hrefLower = href.toLowerCase();
        const allText = `${text} ${title} ${ariaLabel}`.toLowerCase();

        if (seenUrls.has(href)) continue;

        // Priority 1: Text-based ToS matches
        if (containsKeyword(allText, TOS_LINK_KEYWORDS) || isExactKeywordMatch(text, TOS_LINK_KEYWORDS)) {
            tosLinks.push({ url: href, text: text || 'Terms of Service', type: 'tos', priority: 1 });
            seenUrls.add(href);
            continue;
        }

        // Priority 1b: URL-path-based ToS matches (href contains /terms, /tos, etc.)
        if (containsKeyword(hrefLower, ['/terms', '/tos', '/eula', '/legal/terms', '/user-agreement'])) {
            tosLinks.push({ url: href, text: text || 'Terms of Service', type: 'tos', priority: 1 });
            seenUrls.add(href);
            continue;
        }

        // Priority 2: Legal/privacy matches
        if (containsKeyword(allText, LEGAL_LINK_KEYWORDS) || isExactKeywordMatch(text, LEGAL_LINK_KEYWORDS)) {
            tosLinks.push({ url: href, text: text || 'Legal Document', type: 'legal', priority: 2 });
            seenUrls.add(href);
            continue;
        }

        // Priority 2b: URL-path-based privacy matches
        if (containsKeyword(hrefLower, ['/privacy', '/data-policy', '/cookie-policy'])) {
            tosLinks.push({ url: href, text: text || 'Privacy Policy', type: 'legal', priority: 2 });
            seenUrls.add(href);
        }
    }

    tosLinks.sort((a, b) => a.priority - b.priority);
    return tosLinks;
}

// ─── HTML → Text ────────────────────────────────────────
export function extractTextFromHtml(html: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const removeSelectors = [
        'script', 'style', 'noscript', 'iframe',
        'nav', 'header:not(article header)', 'footer:not(article footer)',
        '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
        '.nav', '.navbar', '.navigation', '.menu',
        '.header', '.footer', '.sidebar',
        '.cookie-banner', '.cookie-notice',
        '.social', '.share', '.comments',
        '#comments', '#sidebar', '#navigation',
    ];

    for (const selector of removeSelectors) {
        try { doc.querySelectorAll(selector).forEach((el) => el.remove()); } catch { /* skip invalid */ }
    }

    const mainSelectors = [
        'main', 'article', '[role="main"]',
        '.content', '.main-content', '.page-content',
        '#content', '#main', '#main-content',
        '.terms', '.tos', '.legal-content',
        '.terms-of-service', '.terms-and-conditions',
    ];

    let mainContent: Element | null = null;
    for (const selector of mainSelectors) {
        try {
            const el = doc.querySelector(selector);
            if (el && (el.textContent?.trim().length ?? 0) > 500) {
                mainContent = el;
                break;
            }
        } catch { /* skip */ }
    }

    const contentElement = mainContent ?? doc.body;
    if (!contentElement) return '';

    return (contentElement.textContent ?? '')
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n\n')
        .trim();
}

// ─── Fetch & Extract (content script — often blocked by CORS) ─────
async function fetchAndExtractText(url: string): Promise<{ success: boolean; url: string; text?: string; charCount?: number; error?: string; needsBackgroundFetch?: boolean }> {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
            credentials: 'omit',
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

        const html = await response.text();
        const text = extractTextFromHtml(html);

        if (text.length < 200) {
            return { success: false, url, error: 'Extracted text too short', needsBackgroundFetch: true };
        }

        return { success: true, url, text, charCount: text.length };
    } catch {
        // Content script fetches almost always fail cross-origin — always fallback
        return { success: false, url, error: 'Content script fetch blocked', needsBackgroundFetch: true };
    }
}
