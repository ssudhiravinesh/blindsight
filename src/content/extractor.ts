import type { ExtractionResult, TosLink } from '../lib/types';

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

        if (containsKeyword(allText, TOS_LINK_KEYWORDS) || isExactKeywordMatch(text, TOS_LINK_KEYWORDS)) {
            tosLinks.push({ url: href, text: text || 'Terms of Service', type: 'tos', priority: 1 });
            seenUrls.add(href);
            continue;
        }

        if (containsKeyword(hrefLower, ['/terms', '/tos', '/eula', '/legal/terms', '/user-agreement'])) {
            tosLinks.push({ url: href, text: text || 'Terms of Service', type: 'tos', priority: 1 });
            seenUrls.add(href);
            continue;
        }

        if (containsKeyword(allText, LEGAL_LINK_KEYWORDS) || isExactKeywordMatch(text, LEGAL_LINK_KEYWORDS)) {
            tosLinks.push({ url: href, text: text || 'Legal Document', type: 'legal', priority: 2 });
            seenUrls.add(href);
            continue;
        }

        if (containsKeyword(hrefLower, ['/privacy', '/data-policy', '/cookie-policy'])) {
            tosLinks.push({ url: href, text: text || 'Privacy Policy', type: 'legal', priority: 2 });
            seenUrls.add(href);
        }
    }

    tosLinks.sort((a, b) => a.priority - b.priority);
    return tosLinks;
}

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
        try { doc.querySelectorAll(selector).forEach((el) => el.remove()); } catch {  }
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
        } catch {  }
    }

    const contentElement = mainContent ?? doc.body;
    if (!contentElement) return '';

    return (contentElement.textContent ?? '')
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n\n')
        .trim();
}

async function fetchAndExtractText(url: string): Promise<{ success: boolean; url: string; text?: string; charCount?: number; error?: string; needsBackgroundFetch?: boolean }> {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,* }
    }
    return null;
}

function guessWellKnownUrls(): TosLink[] {
    const origin = window.location.origin;
    return WELL_KNOWN_PATHS.map((path) => ({
        url: `${origin}${path}`,
        text: path.includes('privacy') ? 'Privacy Policy' : 'Terms of Service',
        type: (path.includes('privacy') ? 'legal' : 'tos') as 'tos' | 'legal',
        priority: 3,
    }));
}

export async function extractTosText(): Promise<ExtractionResult> {
    if (checkIfTosPage()) {
        const pageContent = extractMainContent();
        if (pageContent && pageContent.length > 500) {
            return {
                success: true,
                source: 'current-page',
                text: pageContent,
                charCount: pageContent.length,
                info: 'Analyzed current page as Terms of Service',
            };
        }
    }

    const inlineText = extractInlineToS();
    if (inlineText) {
        return { success: true, source: 'inline', text: inlineText, charCount: inlineText.length };
    }

    let tosLinks = findTosLinks();

    if (tosLinks.length === 0) {
        tosLinks = guessWellKnownUrls();
    }

    if (tosLinks.length === 0) {
        return { success: false, error: 'No Terms of Service links found on this page', source: null, text: null };
    }

    const primary = tosLinks[0];
    const result = await fetchAndExtractText(primary.url);

    if (result.success && result.text) {
        return {
            success: true, source: primary.url,
            linkText: primary.text, text: result.text,
            charCount: result.charCount!, allLinks: tosLinks,
        };
    }

    return {
        success: false, needsBackgroundFetch: true,
        url: primary.url, linkText: primary.text,
        error: result.error ?? 'Content script cannot fetch this URL',
        allLinks: tosLinks,
    };
}

export function getTosLinkForBackgroundFetch(): { url: string; text: string; allLinks: TosLink[] } | null {
    const tosLinks = findTosLinks();
    if (tosLinks.length === 0) return null;
    return { url: tosLinks[0].url, text: tosLinks[0].text, allLinks: tosLinks };
}
