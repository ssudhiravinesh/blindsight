/**
 * Copyright (c) 2026 Sudhir Avinesh. All rights reserved.
 * Proprietary and Confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 */

import type { SeverityKey } from '../types';

const BLOCKED_ATTR = 'data-blind-sight-blocked';
let blockedButtons: HTMLElement[] = [];

export function findTargetButtons(): HTMLElement[] {
    const buttons: HTMLElement[] = [];
    const selectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:not([type="button"])',
        '[role="button"]',
        '.btn-primary',
        '.signup-btn',
        '.register-btn',
        '.submit-btn',
    ];

    for (const sel of selectors) {
        document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
            const text = (el.textContent ?? '').toLowerCase();
            const value = ((el as HTMLInputElement).value ?? '').toLowerCase();
            const combined = `${text} ${value}`;

            const keywords = [
                'sign up', 'signup', 'register', 'create account', 'join', 'agree',
                'accept', 'submit', 'continue', 'get started', 'start',
            ];

            if (keywords.some((kw) => combined.includes(kw))) {
                buttons.push(el);
            }
        });
    }

    const unique = Array.from(new Set(buttons));
    return unique.slice(0, 5);
}

export function blockButtons(severity: SeverityKey): void {
    const buttons = findTargetButtons();
    if (buttons.length === 0) return;

    blockedButtons = buttons;
    for (const btn of buttons) {
        btn.setAttribute(BLOCKED_ATTR, String(severity));
        btn.style.pointerEvents = 'none';
        btn.style.opacity = '0.5';
        btn.style.filter = 'grayscale(100%)';
        btn.style.cursor = 'not-allowed';
    }
}

export function unblockButtons(): void {
    for (const btn of blockedButtons) {
        btn.removeAttribute(BLOCKED_ATTR);
        btn.style.pointerEvents = '';
        btn.style.opacity = '';
        btn.style.filter = '';
        btn.style.cursor = '';
    }
    blockedButtons = [];
}

export function attachAgreementListeners(callback: () => void): void {
    const buttons = findTargetButtons();
    for (const btn of buttons) {
        if (btn.hasAttribute('data-bs-listening')) continue;
        btn.setAttribute('data-bs-listening', 'true');

        btn.addEventListener('click', () => {
            if (!btn.hasAttribute(BLOCKED_ATTR)) {
                callback();
            }
        });
    }
}
