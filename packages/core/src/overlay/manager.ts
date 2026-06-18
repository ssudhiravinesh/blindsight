/**
 * Copyright (c) 2026 Sudhir Avinesh. All rights reserved.
 * Proprietary and Confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 */

import type { Clause, ScanResult, SeverityKey } from '../types';
import styles from './styles.css?inline';
import { createOrangeModal, createRedModal } from './components/modal';
import { createScanResultCard, createScanErrorCard } from './components/toast';
import { createPreScanPrompt, createScanningBanner, animateDismissBanner } from './components/banner';
import { attachAgreementListeners as buttonAttachListeners, unblockButtons } from './button-blocker';

const SHADOW_HOST_ID = 'blind-sight-shadow-host';

let activeModalCleanup: (() => void) | null = null;
let activeToastCleanup: (() => void) | null = null;
let activePromptCleanup: (() => void) | null = null;
let activeScanningBanner: HTMLElement | null = null;

function getShadowRoot(): ShadowRoot {
    let host = document.getElementById(SHADOW_HOST_ID);
    if (!host) {
        host = document.createElement('div');
        host.id = SHADOW_HOST_ID;
        host.style.cssText = 'position:absolute;width:0;height:0;z-index:2147483647;';
        document.body.appendChild(host);
    }
    let shadow = host.shadowRoot;
    if (!shadow) {
        shadow = host.attachShadow({ mode: 'open' });
        const stylesEl = document.createElement('style');
        stylesEl.id = 'blind-sight-blocker-styles';
        stylesEl.textContent = styles;
        shadow.appendChild(stylesEl);
    }
    return shadow;
}

export function showWarningModal(
    clauses: Clause[],
    severity: SeverityKey = 3,
    options: { category?: string; serviceName?: string; hostname?: string; aiAlternatives?: any[] } = {}
): void {
    const shadow = getShadowRoot();
    hideWarningModal();

    const onProceed = () => {
        hideWarningModal();
    };

    const onAbort = () => {
        window.close();
        setTimeout(() => window.history.back(), 100);
    };

    let modalObj;
    if (severity >= 3) {
        modalObj = createRedModal(clauses, options, onProceed, onAbort);
    } else {
        modalObj = createOrangeModal(clauses, options, onProceed, onAbort);
    }

    shadow.appendChild(modalObj.element);
    activeModalCleanup = modalObj.cleanup;
}

export function hideWarningModal(): void {
    const shadow = getShadowRoot();
    const overlay = shadow.getElementById('blind-sight-overlay');
    if (overlay) {
        overlay.remove();
    }
    if (activeModalCleanup) {
        activeModalCleanup();
        activeModalCleanup = null;
    }
    unblockButtons();
}

export function isModalVisible(): boolean {
    const shadow = getShadowRoot();
    return shadow.getElementById('blind-sight-modal') !== null;
}

export function attachAgreementListeners(callback: () => void): void {
    buttonAttachListeners(callback);
}

export function showPreScanPrompt(): Promise<boolean> {
    return new Promise((resolve) => {
        const shadow = getShadowRoot();
        hidePreScanPrompt();

        const onScan = () => {
            hidePreScanPrompt();
            resolve(true);
        };

        const onDismiss = () => {
            hidePreScanPrompt();
            resolve(false);
        };

        const promptObj = createPreScanPrompt(onScan, onDismiss);
        shadow.appendChild(promptObj.element);
        activePromptCleanup = promptObj.cleanup;
    });
}

export function hidePreScanPrompt(): void {
    const shadow = getShadowRoot();
    const banner = shadow.getElementById('blind-sight-prompt-banner');
    if (banner) {
        animateDismissBanner(banner, () => {
            banner.remove();
        });
    }
    if (activePromptCleanup) {
        activePromptCleanup();
        activePromptCleanup = null;
    }
}

export function showScanResultCard(result: ScanResult): void {
    const shadow = getShadowRoot();
    hideResultCard();

    const onDismiss = () => {
        hideResultCard();
    };

    const toastObj = createScanResultCard(result, onDismiss);
    shadow.appendChild(toastObj.element);
    activeToastCleanup = toastObj.cleanup;
}

export function hideResultCard(): void {
    const shadow = getShadowRoot();
    const card = shadow.getElementById('bs-result-card');
    if (card) {
        card.remove();
    }
    if (activeToastCleanup) {
        activeToastCleanup();
        activeToastCleanup = null;
    }
}

export function showScanningBanner(): void {
    const shadow = getShadowRoot();
    hideScanningBanner();

    const banner = createScanningBanner();
    shadow.appendChild(banner);
    activeScanningBanner = banner;
}

export function hideScanningBanner(): void {
    if (activeScanningBanner) {
        const banner = activeScanningBanner;
        activeScanningBanner = null;
        animateDismissBanner(banner, () => {
            banner.remove();
        });
    }
}

export function showScanErrorCard(errorMessage: string): void {
    const shadow = getShadowRoot();
    hideResultCard();

    const onDismiss = () => {
        hideResultCard();
    };

    const toastObj = createScanErrorCard(errorMessage, onDismiss);
    shadow.appendChild(toastObj.element);
    activeToastCleanup = toastObj.cleanup;
}
