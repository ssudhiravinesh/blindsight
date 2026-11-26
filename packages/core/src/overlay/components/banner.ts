/**
 * Copyright (c) 2026 Sudhir Avinesh. All rights reserved.
 * Proprietary and Confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 */

import { el, icon, logoMark } from '../renderer';
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
            type: 'button',
            className: 'bs-prompt-scan-btn',
            'aria-label': t('scanTermsBanner', 'Scan terms of service now')
        },
        [t('scanTerms', 'Scan terms')]
    ) as HTMLButtonElement;

    const laterBtn = el(
        'button',
        { id: 'bs-prompt-later', type: 'button', className: 'bs-prompt-later-btn' },
        [t('notNow', 'Not now')]
    ) as HTMLButtonElement;

    const dismissBtn = el(
        'button',
        {
            id: 'bs-prompt-dismiss',
            type: 'button',
            className: 'bs-prompt-dismiss-btn',
            'aria-label': t('dismissScanPrompt', 'Dismiss scan prompt')
        },
        [icon('x', 14)]
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
                el('span', { className: 'bs-prompt-icon' }, [logoMark(32)]),
                el('div', { className: 'bs-prompt-text' }, [
                    el('p', { id: 'bs-prompt-title-id', className: 'bs-prompt-title' }, [t('signupPageDetected', 'Sign-up page detected')]),
                    el('p', { id: 'bs-prompt-sub-id', className: 'bs-prompt-subtitle' }, [
                        t('signupPageBannerDesc', 'Check the Terms of Service before you create an account?')
                    ]),
                    el('div', { className: 'bs-prompt-actions' }, [scanBtn, laterBtn])
                ]),
                dismissBtn
            ])
        ]
    );

    const triggerDismiss = (action: 'scan' | 'dismiss') => {
        banner.style.animation = 'bs-banner-slide-out 0.25s ease forwards';
        let done = false;
        const finish = () => {
            if (done) return;
            done = true;
            if (action === 'scan') onScan();
            else onDismiss();
        };
        banner.addEventListener('animationend', finish, { once: true });
        setTimeout(finish, 350);
    };

    scanBtn.addEventListener('click', () => triggerDismiss('scan'));
    laterBtn.addEventListener('click', () => triggerDismiss('dismiss'));
    dismissBtn.addEventListener('click', () => triggerDismiss('dismiss'));

    const focusable = [scanBtn, laterBtn, dismissBtn];
    // Inside a shadow root document.activeElement is the host, so ask the root.
    const focused = () => (banner.getRootNode() as Document | ShadowRoot).activeElement;
    const handleKeydown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            triggerDismiss('dismiss');
            e.preventDefault();
        } else if (e.key === 'Tab') {
            const idx = focusable.indexOf(focused() as HTMLButtonElement);
            if (idx === -1) return;
            focusable[(idx + (e.shiftKey ? focusable.length - 1 : 1)) % focusable.length].focus();
            e.preventDefault();
        }
    };
    document.addEventListener('keydown', handleKeydown);

    setTimeout(() => scanBtn.focus(), 50);

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
                el('div', { className: 'bs-scanning-copy' }, [
                    el('span', { className: 'bs-scanning-text' }, [t('analyzingTosBanner', 'Reading the fine print…')]),
                    el('span', { className: 'bs-scanning-sub' }, [t('fewSecondsBanner', 'This usually takes a few seconds')])
                ])
            ])
        ]
    );
}

export function animateDismissBanner(banner: HTMLElement, onDone: () => void): void {
    let done = false;
    const finish = () => {
        if (done) return;
        done = true;
        onDone();
    };
    banner.style.animation = 'bs-banner-slide-out 0.25s ease forwards';
    banner.addEventListener('animationend', finish, { once: true });
    setTimeout(finish, 350);
}
