/**
 * Copyright (c) 2026 Sudhir Avinesh. All rights reserved.
 * Proprietary and Confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 */

/**
 * Traverses the DOM recursively, including open Shadow DOM roots.
 */
export function traverseDOM(node: Node, callback: (el: Element) => void): void {
    if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        // Skip our own overlay to prevent self-triggering mutations or matching our own UI elements
        if (el.id === 'blind-sight-shadow-host' || el.id.startsWith('blind-sight')) {
            return;
        }
        callback(el);
        if (el.shadowRoot) {
            traverseDOM(el.shadowRoot, callback);
        }
    }
    let child = node.firstChild;
    while (child) {
        traverseDOM(child, callback);
        child = child.nextSibling;
    }
}
