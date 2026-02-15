const TOS_LINK_KEYWORDS = [
    'terms of service',
    'terms of use',
    'terms and conditions',
    'terms & conditions',
    'user agreement',
    'service agreement',
    'legal terms',
    'tos',
    '/terms',
    '/legal',
    '/tos',
];

/**
 * Check if a URL points to a PDF document.
 * @param {string} url
 * @returns {boolean}
 */
function isPdfUrl(url) {
    if (!url) return false;
    try {
        const urlObj = new URL(url);
        return urlObj.pathname.toLowerCase().endsWith('.pdf');
    } catch {
        return url.toLowerCase().endsWith('.pdf');
    }
}

const LEGAL_LINK_KEYWORDS = [
    'privacy policy',
    'privacy',
    'cookie policy',
    'acceptable use',
    'community guidelines',
];

function containsKeyword(text, keywords) {
    if (!text) return false;
    const lowerText = text.toLowerCase();
    return keywords.some(keyword => lowerText.includes(keyword));
}

function findTosLinks() {
    const links = document.querySelectorAll('a[href]');
    const tosLinks = [];
    const seenUrls = new Set();

    for (const link of links) {
        const href = link.href || '';
        const text = (link.textContent || '').trim();
        const title = link.title || '';
        const ariaLabel = link.getAttribute('aria-label') || '';

        const allText = `${href} ${text} ${title} ${ariaLabel}`;

        if (seenUrls.has(href)) continue;

        if (containsKeyword(allText, TOS_LINK_KEYWORDS)) {
            tosLinks.push({
                url: href,
                text: text || 'Terms of Service',
                type: 'tos',
                priority: 1,
                isPdf: isPdfUrl(href)
            });
            seenUrls.add(href);
            continue;
        }

        if (containsKeyword(allText, LEGAL_LINK_KEYWORDS)) {
            tosLinks.push({
                url: href,
                text: text || 'Legal Document',
                type: 'legal',
                priority: 2,
                isPdf: isPdfUrl(href)
            });
            seenUrls.add(href);
        }
    }

    tosLinks.sort((a, b) => a.priority - b.priority);

    return tosLinks;
}

function extractTextFromHtml(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const selectorsToRemove = [
        'script', 'style', 'noscript', 'iframe',
        'nav', 'header:not(article header)', 'footer:not(article footer)',
        '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
        '.nav', '.navbar', '.navigation', '.menu',
        '.header', '.footer', '.sidebar',
        '.cookie-banner', '.cookie-notice',
        '.social', '.share', '.comments',
        '#comments', '#sidebar', '#navigation'
    ];

    for (const selector of selectorsToRemove) {
        try {
            const elements = doc.querySelectorAll(selector);
            elements.forEach(el => el.remove());
        } catch (e) {
        }
    }

    const mainSelectors = [
        'main',
        'article',
        '[role="main"]',
        '.content', '.main-content', '.page-content',
        '#content', '#main', '#main-content',
        '.terms', '.tos', '.legal-content',
        '.terms-of-service', '.terms-and-conditions'
    ];

    let mainContent = null;
    for (const selector of mainSelectors) {
        try {
            const element = doc.querySelector(selector);
            if (element && element.textContent.trim().length > 500) {
                mainContent = element;
                break;
            }
        } catch (e) {
        }
    }

    const contentElement = mainContent || doc.body;

    if (!contentElement) {
        return '';
    }

    let text = contentElement.textContent || '';

    text = text
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n\n')
        .trim();

    return text;
}

async function fetchAndExtractText(url) {
    // PDF files must be parsed by the background script (which has pdf.js loaded)
    if (isPdfUrl(url)) {
        return {
            success: false,
            url,
            error: 'PDF document - delegating to background',
            needsBackgroundFetch: true,
            isPdf: true
        };
    }

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
            credentials: 'omit',
            mode: 'cors',
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Check if the response is actually a PDF (redirects, no .pdf extension)
        const contentType = response.headers.get('Content-Type') || '';
        if (contentType.toLowerCase().includes('application/pdf')) {
            return {
                success: false,
                url,
                error: 'PDF document - delegating to background',
                needsBackgroundFetch: true,
                isPdf: true
            };
        }

        const html = await response.text();
        const text = extractTextFromHtml(html);

        return {
            success: true,
            url,
            text,
            charCount: text.length
        };
    } catch (error) {
        return {
            success: false,
            url,
            error: error.message,
            needsBackgroundFetch: error.message.includes('CORS') ||
                error.message.includes('NetworkError') ||
                error.message.includes('Failed to fetch')
        };
    }
}

function checkIfTosPage() {
    const url = window.location.href.toLowerCase();
    const title = document.title.toLowerCase();
    const h1 = document.querySelector('h1')?.textContent?.toLowerCase() || '';

    // Check if this is a PDF page with ToS-related name
    if (isPdfUrl(url)) {
        const tosPatterns = ['terms', 'tos', 'legal', 'privacy', 'eula', 'agreement'];
        if (tosPatterns.some(p => url.includes(p))) {
            return true;
        }
    }

    const tosPatterns = [
        'terms', 'tos', 'terms-of-service', 'terms_of_service',
        'termsofservice', 'terms-of-use', 'terms_of_use',
        'user-agreement', 'user_agreement', 'useragreement',
        'legal/terms', 'policies/terms', 'about/terms',
        'eula', 'end-user-license', 'service-agreement',
        'privacy-policy', 'privacy_policy', 'privacypolicy'
    ];

    for (const pattern of tosPatterns) {
        if (url.includes(pattern)) {
            return true;
        }
    }

    const titlePatterns = [
        'terms of service', 'terms and conditions', 'terms of use',
        'user agreement', 'service agreement', 'legal terms',
        'privacy policy', 'tos', 'eula'
    ];

    for (const pattern of titlePatterns) {
        if (title.includes(pattern) || h1.includes(pattern)) {
            return true;
        }
    }

    return false;
}

function extractMainContent() {
    const contentSelectors = [
        'main', 'article', '[role="main"]', '.main-content',
        '.content', '.page-content', '.article-content',
        '.legal-content', '.terms-content', '.tos-content',
        '#content', '#main', '#main-content'
    ];

    for (const selector of contentSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim().length > 500) {
            return element.textContent.trim();
        }
    }

    const body = document.body.cloneNode(true);
    const excludeSelectors = ['nav', 'header', 'footer', 'aside', '.sidebar', '.nav', '.menu', 'script', 'style'];
    excludeSelectors.forEach(sel => {
        body.querySelectorAll(sel).forEach(el => el.remove());
    });

    const text = body.textContent.trim();
    if (text.length > 500) {
        return text;
    }

    return null;
}

function extractInlineToS() {
    const inlineSelectors = [
        '[data-tos]', '[data-tos="true"]',
        '[data-terms]', '[data-terms-of-service]',
        '.terms-content', '.tos-content', '.legal-text',
        '.terms-of-service', '.terms-and-conditions',
        '.legal-content', '.legal-terms',
        '#terms-text', '#tos-text', '#terms', '#tos',
        '#terms-of-service', '#terms-and-conditions',
        '#legal-content', '#legal-terms',
        '.terms-modal', '.tos-modal',
        '.terms-container', '.tos-container'
    ];

    for (const selector of inlineSelectors) {
        try {
            const element = document.querySelector(selector);
            if (element && element.textContent.trim().length > 200) {
                return element.textContent.trim();
            }
        } catch (e) {
        }
    }

    return null;
}

async function extractTosText() {
    const isOnTosPage = checkIfTosPage();
    if (isOnTosPage) {
        const pageContent = extractMainContent();
        if (pageContent && pageContent.length > 500) {
            return {
                success: true,
                source: 'current-page',
                text: pageContent,
                charCount: pageContent.length,
                info: 'Analyzed current page as Terms of Service'
            };
        }
    }

    const inlineText = extractInlineToS();
    if (inlineText) {
        return {
            success: true,
            source: 'inline',
            text: inlineText,
            charCount: inlineText.length
        };
    }

    const tosLinks = findTosLinks();

    if (tosLinks.length === 0) {
        return {
            success: false,
            error: 'No Terms of Service links found on this page',
            source: null,
            text: null
        };
    }

    const primaryLink = tosLinks[0];
    const result = await fetchAndExtractText(primaryLink.url);

    if (result.success) {
        return {
            success: true,
            source: primaryLink.url,
            linkText: primaryLink.text,
            text: result.text,
            charCount: result.charCount,
            allLinks: tosLinks
        };
    }

    if (result.needsBackgroundFetch) {
        return {
            success: false,
            needsBackgroundFetch: true,
            url: primaryLink.url,
            linkText: primaryLink.text,
            error: result.error,
            allLinks: tosLinks
        };
    }

    return {
        success: false,
        error: result.error,
        source: primaryLink.url,
        allLinks: tosLinks
    };
}

function getTosLinkForBackgroundFetch() {
    const tosLinks = findTosLinks();
    if (tosLinks.length === 0) return null;

    return {
        url: tosLinks[0].url,
        text: tosLinks[0].text,
        allLinks: tosLinks
    };
}

window.BlindSightExtractor = {
    findTosLinks,
    extractTosText,
    extractInlineToS,
    fetchAndExtractText,
    getTosLinkForBackgroundFetch,
    extractTextFromHtml
};