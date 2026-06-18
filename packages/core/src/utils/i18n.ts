/**
 * Copyright (c) 2026 Sudhir Avinesh. All rights reserved.
 * Proprietary and Confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 */

/**
 * Translates a key using chrome.i18n.getMessage, falling back to a default value if unavailable.
 * Supports placeholder substitution (e.g., $1, $2) in the fallback value.
 */
export function t(
    key: string,
    defaultValue: string,
    placeholders?: (string | number)[]
): string {
    if (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getMessage) {
        // chrome.i18n expects string placeholders
        const strPlaceholders = placeholders?.map(p => String(p));
        const message = chrome.i18n.getMessage(key, strPlaceholders);
        if (message) return message;
    }

    if (placeholders && placeholders.length > 0) {
        let formatted = defaultValue;
        placeholders.forEach((p, i) => {
            formatted = formatted.replace(new RegExp(`\\$${i + 1}`, 'g'), String(p));
        });
        return formatted;
    }

    return defaultValue;
}
