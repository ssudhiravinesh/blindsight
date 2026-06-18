/**
 * Copyright (c) 2026 Sudhir Avinesh. All rights reserved.
 * Proprietary and Confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 */

import { el } from '../renderer';
import { t } from '../../utils/i18n';

export function createPreScanPrompt(
    onScan: () => void,
    onDismiss: () => void
): { element: HTMLElement; cleanup: () => void } {
    const activeElement = document.activeElement as HTMLElement;

    const scanBtn = el(
        'button', 
        { 
            id: 'bs-prompt-scan', 
            className: 'bs-prompt-scan-btn',
            'aria-label': t('scanTermsBanner', 'Scan terms of service now')
        }, 
        [t('scanTerms', 'Scan Terms')]
    ) as HTMLButtonElement;

    const dismissBtn = el(
        'button', 
        { 
            id: 'bs-prompt-dismiss', 
            className: 'bs-prompt-dismiss-btn',
            'aria-label': t('dismissScanPrompt', 'Dismiss scan prompt')
        }, 
        ['✕']
    ) as HTMLButtonElement;

    const banner = el(
        'div', 
        { 
            id: 'blind-sight-prompt-banner',
            role: 'dialog',
            'aria-modal': 'false',
            'aria-labelledby': 'bs-prompt-title-id',
            'aria-describedby': 'bs-prompt-sub-id'
        }, 
        [
            el('div', { className: 'bs-prompt-inner' }, [
                el('span', { className: 'bs-prompt-icon', 'aria-hidden': 'true' }, ['🛡️']),
                el('div', { className: 'bs-prompt-text' }, [
                    el('p', { id: 'bs-prompt-title-id', className: 'bs-prompt-title' }, [t('signupPageDetected', 'Sign-up page detected')]),
                    el('p', { id: 'bs-prompt-sub-id', className: 'bs-prompt-subtitle' }, [
                        t('signupPageBannerDesc', 'Would you like Blind-Sight to scan the Terms of Service before you continue?')
                    ])
                ]),
                el('div', { className: 'bs-prompt-actions' }, [scanBtn, dismissBtn])
            ])
        ]
    );

    const triggerDismiss = (action: 'scan' | 'dismiss') => {
        banner.style.animation = 'bs-banner-slide-out 0.3s ease forwards';
        banner.addEventListener('animationend', () => {
            if (action === 'scan') onScan();
            else onDismiss();
        }, { once: true });
        setTimeout(() => {
            if (action === 'scan') onScan();
            else onDismiss();
        }, 400);
    };

    scanBtn.addEventListener('click', () => triggerDismiss('scan'));
    dismissBtn.addEventListener('click', () => triggerDismiss('dismiss'));

    const handleKeydown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            triggerDismiss('dismiss');
            e.preventDefault();
        } else if (e.key === 'Tab') {
            const focusable = [scanBtn, dismissBtn];
            if (document.activeElement === focusable[0] && e.shiftKey) {
                focusable[1].focus();
                e.preventDefault();
            } else if (document.activeElement === focusable[1] && !e.shiftKey) {
                focusable[0].focus();
                e.preventDefault();
            }
        }
    };
    document.addEventListener('keydown', handleKeydown);

    // Initial focus on scan button
    setTimeout(() => {
        scanBtn.focus();
    }, 50);

    return {
        element: banner,
        cleanup: () => {
            document.removeEventListener('keydown', handleKeydown);
            if (activeElement && typeof activeElement.focus === 'function') {
                activeElement.focus();
            }
        }
    };
}

export function createScanningBanner(): HTMLElement {
    return el(
        'div', 
        { 
            id: 'bs-scanning-banner',
            role: 'status',
            'aria-live': 'polite'
        }, 
        [
            el('div', { className: 'bs-scanning-inner' }, [
                el('div', { className: 'bs-scanning-spinner', 'aria-hidden': 'true' }),
                el('span', { className: 'bs-scanning-text' }, [t('analyzingTosBanner', 'Analyzing Terms of Service...')]),
                el('span', { className: 'bs-scanning-sub' }, [t('fewSecondsBanner', 'This may take a few seconds')])
            ])
        ]
    );
}

export function animateDismissBanner(banner: HTMLElement, onDone: () => void): void {
    banner.style.animation = 'bs-banner-slide-out 0.3s ease forwards';
    banner.addEventListener('animationend', onDone, { once: true });
    setTimeout(onDone, 400);
}
