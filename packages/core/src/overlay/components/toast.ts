/**
 * Copyright (c) 2026 Sudhir Avinesh. All rights reserved.
 * Proprietary and Confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 */

import type { ScanResult, SeverityKey } from '../../types';
import { el, icon, logoMark } from '../renderer';
import { t } from '../../utils/i18n';

const RESULT_AUTO_DISMISS_MS = 8000;

const RESULT_CONFIG: Record<
    SeverityKey,
    { titleKey: string; defTitle: string; msgKey: string; defMsg: string; grade: string; cls: string }
> = {
    0: {
        titleKey: 'termsLookGood',
        defTitle: 'Terms Look Good',
        msgKey: 'termsLookGoodDesc',
        defMsg: "Standard, industry-normal terms. You're good to go!",
        grade: 'A',
        cls: 'safe'
    },
    1: {
        titleKey: 'notableTerms',
        defTitle: 'Notable Terms',
        msgKey: 'notableTermsDesc',
        defMsg: 'Some terms worth knowing about, but common practice.',
        grade: 'B',
        cls: 'notable'
    },
    2: {
        titleKey: 'proceedCaution',
        defTitle: 'Proceed with Caution',
        msgKey: 'proceedCautionDesc',
        defMsg: 'Unusual terms detected. Review before accepting.',
        grade: 'C',
        cls: 'caution'
    },
    3: {
        titleKey: 'criticalTermsOverall',
        defTitle: 'Critical Terms Detected',
        msgKey: 'criticalTermsOverallDesc',
        defMsg: 'Aggressive terms found. Proceed at your own risk.',
        grade: 'F',
        cls: 'danger'
    }
};

function clauseSeverityClass(severity: SeverityKey): string {
    return (
        ({ 0: 'green', 1: 'yellow', 2: 'orange', 3: 'red' } as Record<SeverityKey, string>)[severity] ??
        'yellow'
    );
}

export function createScanResultCard(
    result: ScanResult,
    onDismiss: () => void
): { element: HTMLElement; cleanup: () => void } {
    const severity = (result.overallSeverity ?? 0) as SeverityKey;
    const config = RESULT_CONFIG[severity];
    const title = t(config.titleKey, config.defTitle);
    const message = t(config.msgKey, config.defMsg);
    const serviceName = result.serviceName ?? t('thisService', 'this service');

    const clausesHTML = [...(result.clauses ?? [])].sort((a, b) => b.severity - a.severity).slice(0, 4).map((c) => {
        return el('li', { className: `bs-result-clause ${clauseSeverityClass(c.severity)}` }, [
            c.explanation ?? c.quote ?? 'Concerning clause'
        ]);
    });

    const closeBtn = el(
        'button', 
        { 
            className: 'bs-result-close', 
            id: 'bs-result-close',
            'aria-label': t('dismissResults', 'Dismiss results')
        }, 
        [icon('x', 14)]
    );

    const card = el(
        'div', 
        { 
            id: 'bs-result-card',
            role: 'status',
            'aria-live': 'polite',
            'aria-atomic': 'true'
        }, 
        [
            el('div', { className: 'bs-result-inner' }, [
                el('div', { className: `bs-result-header ${config.cls}` }, [
                    el('div', { className: `bs-result-grade ${config.cls}`, 'aria-label': `Grade ${config.grade}` }, [config.grade]),
                    el('div', { className: 'bs-result-info' }, [
                        el('p', { className: 'bs-result-title' }, [title]),
                        el('p', { className: 'bs-result-msg' }, [`${serviceName} · ${message}`])
                    ]),
                    closeBtn
                ]),
                clausesHTML.length > 0
                    ? el('div', { className: 'bs-result-body' }, [el('ul', { className: 'bs-result-clauses' }, clausesHTML)])
                    : null,
                el('div', { className: 'bs-result-footer' }, [logoMark(14), el('p', {}, [t('clickToDismiss', 'Blind-Sight · Click to dismiss')])])
            ])
        ]
    );

    let dismissTimeout: ReturnType<typeof setTimeout> | null = null;

    const triggerDismiss = () => {
        if (dismissTimeout) clearTimeout(dismissTimeout);
        card.style.animation = 'bs-result-fade-out 0.3s ease forwards';
        card.addEventListener('animationend', () => {
            onDismiss();
        }, { once: true });
        setTimeout(onDismiss, 400);
    };

    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        triggerDismiss();
    });

    card.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.closest('.bs-result-clause')) return;
        triggerDismiss();
    });

    dismissTimeout = setTimeout(triggerDismiss, RESULT_AUTO_DISMISS_MS);

    // Escape key dismisses toast
    const handleKeydown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            triggerDismiss();
            e.preventDefault();
        }
    };
    document.addEventListener('keydown', handleKeydown);

    return {
        element: card,
        cleanup: () => {
            if (dismissTimeout) clearTimeout(dismissTimeout);
            document.removeEventListener('keydown', handleKeydown);
        }
    };
}

export function createScanErrorCard(
    errorMessage: string,
    onDismiss: () => void
): { element: HTMLElement; cleanup: () => void } {
    const closeBtn = el(
        'button', 
        { 
            className: 'bs-result-close', 
            id: 'bs-result-close',
            'aria-label': t('dismissError', 'Dismiss error')
        }, 
        [icon('x', 14)]
    );

    const card = el(
        'div', 
        { 
            id: 'bs-result-card',
            role: 'alert',
            'aria-live': 'assertive'
        }, 
        [
            el('div', { className: 'bs-result-inner' }, [
                el('div', { className: 'bs-result-header error' }, [
                    el('span', { className: 'bs-result-icon error' }, [icon('alert', 18)]),
                    el('div', { className: 'bs-result-info' }, [
                        el('p', { className: 'bs-result-title' }, [t('scanFailed', 'Scan Failed')]),
                        el('p', { className: 'bs-result-msg' }, [errorMessage])
                    ]),
                    closeBtn
                ]),
                el('div', { className: 'bs-result-footer' }, [logoMark(14), el('p', {}, [t('clickToDismiss', 'Blind-Sight · Click to dismiss')])])
            ])
        ]
    );

    let dismissTimeout: ReturnType<typeof setTimeout> | null = null;

    const triggerDismiss = () => {
        if (dismissTimeout) clearTimeout(dismissTimeout);
        card.style.animation = 'bs-result-fade-out 0.3s ease forwards';
        card.addEventListener('animationend', () => {
            onDismiss();
        }, { once: true });
        setTimeout(onDismiss, 400);
    };

    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        triggerDismiss();
    });

    card.addEventListener('click', triggerDismiss);

    dismissTimeout = setTimeout(triggerDismiss, RESULT_AUTO_DISMISS_MS);

    const handleKeydown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            triggerDismiss();
            e.preventDefault();
        }
    };
    document.addEventListener('keydown', handleKeydown);

    return {
        element: card,
        cleanup: () => {
            if (dismissTimeout) clearTimeout(dismissTimeout);
            document.removeEventListener('keydown', handleKeydown);
        }
    };
}
