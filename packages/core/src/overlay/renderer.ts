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

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Stroke icons (24×24, lucide-style) used by the in-page overlays. */
const ICON_PATHS = {
    alert: ['M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z', 'M12 9v4', 'M12 17h.01'],
    octagon: ['M7.9 2h8.2L22 7.9v8.2L16.1 22H7.9L2 16.1V7.9Z', 'M12 8v4', 'M12 16h.01'],
    check: ['M20 6 9 17l-5-5'],
    x: ['M18 6 6 18', 'M6 6l12 12'],
    arrow: ['M7 17 17 7', 'M7 7h10v10'],
    lock: ['M5 11h14v10H5z', 'M8 11V7a4 4 0 0 1 8 0v4'],
    sparkles: ['M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9Z'],
} as const;

export type IconName = keyof typeof ICON_PATHS;

export function icon(name: IconName, size = 16, className = ''): SVGSVGElement {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    if (className) svg.setAttribute('class', className);
    for (const d of ICON_PATHS[name]) {
        const path = document.createElementNS(SVG_NS, 'path');
        path.setAttribute('d', d);
        svg.appendChild(path);
    }
    return svg;
}

/** The Blind-Sight mark (shield + eye on a gradient tile). */
export function logoMark(size = 28): SVGSVGElement {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));
    svg.setAttribute('viewBox', '0 0 32 32');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('class', 'bs-logo');

    const defs = document.createElementNS(SVG_NS, 'defs');
    const grad = document.createElementNS(SVG_NS, 'linearGradient');
    grad.setAttribute('id', 'bs-logo-gradient');
    grad.setAttribute('x1', '4');
    grad.setAttribute('y1', '2');
    grad.setAttribute('x2', '28');
    grad.setAttribute('y2', '30');
    grad.setAttribute('gradientUnits', 'userSpaceOnUse');
    for (const [offset, color] of [['0', '#A99DFF'], ['0.55', '#7262FF'], ['1', '#5B8CFF']]) {
        const stop = document.createElementNS(SVG_NS, 'stop');
        stop.setAttribute('offset', offset);
        stop.setAttribute('stop-color', color);
        grad.appendChild(stop);
    }
    defs.appendChild(grad);
    svg.appendChild(defs);

    const parts: Array<[string, Record<string, string>]> = [
        ['rect', { width: '32', height: '32', rx: '9', fill: 'url(#bs-logo-gradient)' }],
        ['path', { d: 'M16 6.5 9 9.2v5.6c0 4.6 3 8.6 7 10.2 4-1.6 7-5.6 7-10.2V9.2L16 6.5Z', fill: 'rgba(255,255,255,0.14)', stroke: 'white', 'stroke-width': '1.6', 'stroke-linejoin': 'round' }],
        ['path', { d: 'M11.8 15.4c2.4-2.6 6-2.6 8.4 0', stroke: 'white', 'stroke-width': '1.6', 'stroke-linecap': 'round' }],
        ['circle', { cx: '16', cy: '16.4', r: '1.9', fill: 'white' }],
    ];
    for (const [tag, attrs] of parts) {
        const node = document.createElementNS(SVG_NS, tag);
        for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
        svg.appendChild(node);
    }
    return svg;
}
