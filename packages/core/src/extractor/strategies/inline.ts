/**
 * Copyright (c) 2026 Sudhir Avinesh. All rights reserved.
 * Proprietary and Confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 */

import type { ExtractionStrategy } from '../strategy';
import { traverseDOM } from '../../utils/dom';

const INLINE_SELECTORS = [
    '[data-tos]', '[data-tos="true"]', '[data-terms]', '[data-terms-of-service]',
    '.terms-content', '.tos-content', '.legal-text', '.terms-of-service',
    '.terms-and-conditions', '.legal-content', '.legal-terms',
    '#terms-text', '#tos-text', '#terms', '#tos',
    '#terms-of-service', '#terms-and-conditions', '#legal-content', '#legal-terms',
    '.terms-modal', '.tos-modal', '.terms-container', '.tos-container'
];

export class InlineStrategy implements ExtractionStrategy {
    name = 'InlineStrategy';
    priority = 10;

    canExtract(): boolean {
        return true;
    }

    async extract(): Promise<string | null> {
        let bestText: string | null = null;
        let maxLength = 0;

        traverseDOM(document.body, (el) => {
            const matchesSelector = INLINE_SELECTORS.some((sel) => {
                try {
                    return el.matches(sel);
                } catch {
                    return false;
                }
            });

            if (matchesSelector) {
                const text = (el.textContent ?? '').trim();
                if (text.length > 200 && text.length > maxLength) {
                    bestText = text;
                    maxLength = text.length;
                }
            }
        });

        return bestText;
    }
}
