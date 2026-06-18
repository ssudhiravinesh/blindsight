/**
 * Copyright (c) 2026 Sudhir Avinesh. All rights reserved.
 * Proprietary and Confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 */

export function extractTextFromHtml(html: string): string {
    if (!html) return '';
    
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
        try { 
            doc.querySelectorAll(selector).forEach((el) => el.remove()); 
        } catch { }
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
        } catch { }
    }

    const contentElement = mainContent ?? doc.body;
    if (!contentElement) return '';

    return (contentElement.textContent ?? '')
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n\n')
        .trim();
}
