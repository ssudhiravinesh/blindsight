/**
 * Copyright (c) 2026 Sudhir Avinesh. All rights reserved.
 * Proprietary and Confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 */

/**
 * Secure helper to build DOM elements using standard DOM APIs.
 * Avoids innerHTML to prevent XSS.
 */
export function isSafeLinkUrl(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    try {
        const { protocol } = new URL(value);
        return protocol === 'https:' || protocol === 'http:';
    } catch {
        return false;
    }
}

export function el(
    tag: string,
    attrs: Record<string, any> = {},
    children: (Node | string | null | undefined)[] = []
): HTMLElement {
    const element = document.createElement(tag);
    
    for (const [key, val] of Object.entries(attrs)) {
        if (key === 'className') {
            element.className = val;
        } else if (key === 'style') {
            element.style.cssText = val;
        } else if (key.startsWith('on') && typeof val === 'function') {
            const eventName = key.slice(2).toLowerCase();
            element.addEventListener(eventName, val);
        } else if ((key === 'href' || key === 'src') && !isSafeLinkUrl(val)) {
            // Defence in depth: never emit javascript:/data: URLs into the host page.
            continue;
        } else if (val !== undefined && val !== null) {
            element.setAttribute(key, String(val));
        }
    }
    
    for (const child of children) {
        if (child === null || child === undefined) continue;
        if (typeof child === 'string') {
            element.appendChild(document.createTextNode(child));
        } else {
            element.appendChild(child);
        }
    }
    
    return element;
}
