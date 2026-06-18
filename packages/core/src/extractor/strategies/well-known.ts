/**
 * Copyright (c) 2026 Sudhir Avinesh. All rights reserved.
 * Proprietary and Confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 */

import type { ExtractionStrategy } from '../strategy';
import type { TosLink } from '../../types';
import { extractTextFromHtml } from '../html-parser';

const WELL_KNOWN_PATHS = [
    '/terms', '/tos', '/terms-of-service', '/terms-of-use',
    '/legal/terms', '/about/tos', '/about/terms',
    '/policies/terms', '/support/tos',
    '/privacy', '/privacy-policy', '/legal/privacy'
];

export class WellKnownStrategy implements ExtractionStrategy {
    name = 'WellKnownStrategy';
    priority = 40;

    canExtract(): boolean {
        return true;
    }

    getWellKnownLinks(): TosLink[] {
        const origin = window.location.origin;
        return WELL_KNOWN_PATHS.map((path) => ({
            url: `${origin}${path}`,
            text: path.includes('privacy') ? 'Privacy Policy' : 'Terms of Service',
            type: path.includes('privacy') ? 'legal' : 'tos',
            priority: 3
        }));
    }

    async extract(): Promise<string | null> {
        const links = this.getWellKnownLinks();
        
        // We probe the first 3 paths in sequence
        for (const link of links.slice(0, 3)) {
            try {
                const response = await fetch(link.url, {
                    method: 'GET',
                    headers: { Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
                    credentials: 'omit'
                });

                if (response.ok) {
                    const html = await response.text();
                    const text = extractTextFromHtml(html);
                    if (text.length >= 200) {
                        return text;
                    }
                }
            } catch {
                // Ignore fetch error, continue probe
            }
        }
        return null;
    }
}
