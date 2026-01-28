/**
 * Blind-Sight ToS Extractor
 * Finds Terms of Service links and extracts their text content
 */

/**
 * Keywords that indicate a Terms of Service link
 */
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
 * Additional keywords for related legal documents
 */
const LEGAL_LINK_KEYWORDS = [
    'privacy policy',
    'privacy',
    'cookie policy',
    'acceptable use',
    'community guidelines',
];

/**
 * Check if a string contains any of the keywords
 * @param {string} text 
 * @param {string[]} keywords 
 * @returns {boolean}
 */
function containsKeyword(text, keywords) {
    if (!text) return false;
    const lowerText = text.toLowerCase();
    return keywords.some(keyword => lowerText.includes(keyword));
}

/**
 * Find all ToS-related links on the page
 * @returns {Object[]} Array of link objects with url, text, and type
 */
function findTosLinks() {
    const links = document.querySelectorAll('a[href]');
    const tosLinks = [];
    const seenUrls = new Set();

    for (const link of links) {
        const href = link.href || '';
        const text = (link.textContent || '').trim();
        const title = link.title || '';
        const ariaLabel = link.getAttribute('aria-label') || '';

        // Combine all text sources for matching
        const allText = `${href} ${text} ${title} ${ariaLabel}`;

        // Skip if already seen this URL
        if (seenUrls.has(href)) continue;

        // Check for ToS keywords
        if (containsKeyword(allText, TOS_LINK_KEYWORDS)) {
            tosLinks.push({
                url: href,
                text: text || 'Terms of Service',
                type: 'tos',
                priority: 1 // Primary target
            });
            seenUrls.add(href);
            continue;
        }

        // Check for other legal keywords (lower priority)
        if (containsKeyword(allText, LEGAL_LINK_KEYWORDS)) {
            tosLinks.push({
                url: href,
                text: text || 'Legal Document',
                type: 'legal',
                priority: 2 // Secondary target
            });
            seenUrls.add(href);
        }
    }

    // Sort by priority (ToS first, then other legal documents)
    tosLinks.sort((a, b) => a.priority - b.priority);

    console.log('[Blind-Sight] Found ToS links:', tosLinks);
    return tosLinks;
}

/**
 * Extract main text content from HTML, removing navigation, scripts, etc.
 * @param {string} html - HTML content
 * @returns {string} Cleaned text content
 */
function extractTextFromHtml(html) {
    // Create a temporary DOM to parse HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Remove elements that typically don't contain ToS content
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
            // Ignore invalid selectors
        }
    }

    // Try to find main content areas
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
            // Ignore invalid selectors
        }
    }

    // Use main content or fall back to body
    const contentElement = mainContent || doc.body;

    if (!contentElement) {
        return '';
    }

    // Get text content and clean it up
    let text = contentElement.textContent || '';

    // Normalize whitespace
    text = text
        .replace(/\s+/g, ' ')  // Collapse multiple spaces
        .replace(/\n\s*\n/g, '\n\n')  // Normalize paragraph breaks
        .trim();

    return text;
}

/**
 * Fetch a URL and extract its text content
 * @param {string} url - URL to fetch
 * @returns {Promise<Object>} Result with text and metadata
 */
async function fetchAndExtractText(url) {
    try {
        console.log('[Blind-Sight] Fetching ToS from:', url);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
            credentials: 'omit', // Don't send cookies to avoid auth issues
            mode: 'cors', // Try CORS first
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const html = await response.text();
        const text = extractTextFromHtml(html);

        console.log('[Blind-Sight] Extracted text length:', text.length);

        return {
            success: true,
            url,
            text,
            charCount: text.length
        };
    } catch (error) {
        console.error('[Blind-Sight] Failed to fetch ToS:', error);

        // If CORS fails, we may need to fetch via background script
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

/**
 * Check if the current page is a Terms of Service page
 * @returns {boolean}
 */
function checkIfTosPage() {
    const url = window.location.href.toLowerCase();
    const title = document.title.toLowerCase();
    const h1 = document.querySelector('h1')?.textContent?.toLowerCase() || '';

    // Patterns that indicate a ToS page
    const tosPatterns = [
        'terms', 'tos', 'terms-of-service', 'terms_of_service',
        'termsofservice', 'terms-of-use', 'terms_of_use',
        'user-agreement', 'user_agreement', 'useragreement',
        'legal/terms', 'policies/terms', 'about/terms',
        'eula', 'end-user-license', 'service-agreement',
        'privacy-policy', 'privacy_policy', 'privacypolicy'
    ];

    // Check URL
    for (const pattern of tosPatterns) {
        if (url.includes(pattern)) {
            return true;
        }
    }

    // Check title
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

/**
 * Extract main content from the page body
 * @returns {string|null}
 */
function extractMainContent() {
    // Try to find the main content area
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

    // Fallback: get body content, excluding nav, header, footer
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

/**
 * Extract ToS text from the current page (for inline ToS)
 * Useful when the ToS is embedded directly on the signup page
 * @returns {string|null}
 */
function extractInlineToS() {
    // Look for ToS content directly on the page
    const inlineSelectors = [
        // Data attributes
        '[data-tos]', '[data-tos="true"]',
        '[data-terms]', '[data-terms-of-service]',
        // Class-based selectors
        '.terms-content', '.tos-content', '.legal-text',
        '.terms-of-service', '.terms-and-conditions',
        '.legal-content', '.legal-terms',
        // ID-based selectors
        '#terms-text', '#tos-text', '#terms', '#tos',
        '#terms-of-service', '#terms-and-conditions',
        '#legal-content', '#legal-terms',
        // Modal/container selectors
        '.terms-modal', '.tos-modal',
        '.terms-container', '.tos-container'
    ];

    for (const selector of inlineSelectors) {
        try {
            const element = document.querySelector(selector);
            if (element && element.textContent.trim().length > 200) {
                console.log('[Blind-Sight] Found inline ToS content with selector:', selector);
                return element.textContent.trim();
            }
        } catch (e) {
            // Ignore
        }
    }

    return null;
}

/**
 * Main extraction function - finds and extracts ToS text
 * @returns {Promise<Object>} Extraction result
 */
async function extractTosText() {
    // FIRST: Check if we're ON a ToS page directly
    const isOnTosPage = checkIfTosPage();
    if (isOnTosPage) {
        console.log('[Blind-Sight] Detected we are ON a ToS page, extracting body content');
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

    // Second, check for inline ToS
    const inlineText = extractInlineToS();
    if (inlineText) {
        return {
            success: true,
            source: 'inline',
            text: inlineText,
            charCount: inlineText.length
        };
    }

    // Find ToS links
    const tosLinks = findTosLinks();

    if (tosLinks.length === 0) {
        return {
            success: false,
            error: 'No Terms of Service links found on this page',
            source: null,
            text: null
        };
    }

    // Try to fetch the first ToS link
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

    // If fetch failed and needs background fetch, return info for content.js to handle
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

/**
 * Get URL for ToS link that needs background fetching
 * @returns {Object|null}
 */
function getTosLinkForBackgroundFetch() {
    const tosLinks = findTosLinks();
    if (tosLinks.length === 0) return null;

    return {
        url: tosLinks[0].url,
        text: tosLinks[0].text,
        allLinks: tosLinks
    };
}

// Export for use in content.js
window.BlindSightExtractor = {
    findTosLinks,
    extractTosText,
    extractInlineToS,
    fetchAndExtractText,
    getTosLinkForBackgroundFetch,
    extractTextFromHtml
};
