/**
 * Copyright (c) 2026 Sudhir Avinesh. All rights reserved.
 * Proprietary and Confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 */

import type { ExtractionStrategy } from '../strategy';

const TOS_URL_PATTERNS = [
    'terms', 'tos', 'terms-of-service', 'terms_of_service', 'termsofservice',
    'terms-of-use', 'terms_of_use', 'user-agreement', 'user_agreement',
    'useragreement', 'legal/terms', 'policies/terms', 'about/terms',
    'eula', 'end-user-license', 'service-agreement', 'privacy-policy',
    'privacy_policy', 'privacypolicy'
];

const TOS_TITLE_PATTERNS = [
    'terms of service', 'terms and conditions', 'terms of use',
    'user agreement', 'service agreement', 'legal terms',
    'privacy policy', 'tos', 'eula'
];

const MAIN_CONTENT_SELECTORS = [
    'main', 'article', '[role="main"]', '.main-content',
    '.content', '.page-content', '.article-content',
    '.legal-content', '.terms-content', '.tos-content',
    '#content', '#main', '#main-content'
];

export class CurrentPageStrategy implements ExtractionStrategy {
    name = 'CurrentPageStrategy';
    priority = 20;

    canExtract(url: string): boolean {
        const lowerUrl = url.toLowerCase();
        const lowerTitle = document.title.toLowerCase();
        const lowerH1 = document.querySelector('h1')?.textContent?.toLowerCase() ?? '';

        const urlMatches = TOS_URL_PATTERNS.some((p) => lowerUrl.includes(p));
        const titleMatches = TOS_TITLE_PATTERNS.some((p) => lowerTitle.includes(p) || lowerH1.includes(p));

        return urlMatches || titleMatches;
    }

    async extract(): Promise<string | null> {
        // Attempt to find main content element
        for (const selector of MAIN_CONTENT_SELECTORS) {
            const el = document.querySelector(selector);
            if (el && (el.textContent?.trim().length ?? 0) > 500) {
                return el.textContent!.trim();
            }
        }

        // Fallback: clone body, remove noise, and return
        const bodyClone = document.body.cloneNode(true) as HTMLElement;
        const noiseSelectors = [
            'nav', 'header', 'footer', 'aside', '.sidebar', '.nav', '.menu',
            'script', 'style', 'noscript', 'iframe'
        ];

        noiseSelectors.forEach((selector) => {
            bodyClone.querySelectorAll(selector).forEach((el) => el.remove());
        });

        const text = bodyClone.textContent?.trim() ?? '';
        return text.length > 500 ? text : null;
    }
}
