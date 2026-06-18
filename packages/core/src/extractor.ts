/**
 * Copyright (c) 2026 Sudhir Avinesh. All rights reserved.
 * Proprietary and Confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 */

import type { ExtractionResult, TosLink } from './types';
import { extractTextFromHtml as htmlParserExtract } from './extractor/html-parser';
import { InlineStrategy } from './extractor/strategies/inline';
import { CurrentPageStrategy } from './extractor/strategies/current-page';
import { LinkDiscoveryStrategy } from './extractor/strategies/link-discovery';
import { WellKnownStrategy } from './extractor/strategies/well-known';

// Re-export parser function for backwards compatibility
export function extractTextFromHtml(html: string): string {
    return htmlParserExtract(html);
}

export function findTosLinks(): TosLink[] {
    const strategy = new LinkDiscoveryStrategy();
    return strategy.findLinks();
}

export async function extractTosText(): Promise<ExtractionResult> {
    const inlineStrat = new InlineStrategy();
    const currentPageStrat = new CurrentPageStrategy();
    const linkDiscoveryStrat = new LinkDiscoveryStrategy();
    const wellKnownStrat = new WellKnownStrategy();

    // 1. Current Page Strategy (highest priority if we are actually on terms page)
    if (currentPageStrat.canExtract(window.location.href)) {
        const pageContent = await currentPageStrat.extract();
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

    // 2. Inline Strategy
    const inlineText = await inlineStrat.extract();
    if (inlineText && inlineText.length > 500) {
        return {
            success: true,
            source: 'inline',
            text: inlineText,
            charCount: inlineText.length,
        };
    }

    // Populate all links using LinkDiscovery
    const discoveredLinks = linkDiscoveryStrat.findLinks();
    
    // 3. Link Discovery Strategy (attempting local fetch first)
    if (discoveredLinks.length > 0) {
        const text = await linkDiscoveryStrat.extract();
        if (text) {
            return {
                success: true,
                source: discoveredLinks[0].url,
                linkText: discoveredLinks[0].text,
                text,
                charCount: text.length,
                allLinks: discoveredLinks,
            };
        }
    }

    // 4. Well Known Strategy (attempting local fetch of guessed paths)
    const wellKnownLinks = wellKnownStrat.getWellKnownLinks();
    const wellKnownText = await wellKnownStrat.extract();
    if (wellKnownText) {
        return {
            success: true,
            source: wellKnownLinks[0].url,
            linkText: wellKnownLinks[0].text,
            text: wellKnownText,
            charCount: wellKnownText.length,
            allLinks: [...discoveredLinks, ...wellKnownLinks],
        };
    }

    // Fallback: Needs Background Fetch for CORS bypass
    if (discoveredLinks.length > 0) {
        const primary = discoveredLinks[0];
        return {
            success: false,
            needsBackgroundFetch: true,
            url: primary.url,
            linkText: primary.text,
            error: 'CORS or fetch blocked locally; trying background fetch',
            allLinks: discoveredLinks,
        };
    }

    return {
        success: false,
        error: 'No Terms of Service links found on this page',
        source: null,
        text: null,
    };
}

export function getTosLinkForBackgroundFetch(): { url: string; text: string; allLinks: TosLink[] } | null {
    const links = findTosLinks();
    if (links.length === 0) return null;
    return {
        url: links[0].url,
        text: links[0].text,
        allLinks: links,
    };
}
