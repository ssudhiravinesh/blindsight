/**
 * Copyright (c) 2026 Sudhir Avinesh. All rights reserved.
 * Proprietary and Confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 */
import type { Clause, AISuggestedAlternative } from '../../types';
import { getAlternatives } from '../../alternatives';
import { el } from '../renderer';
import { blockButtons, unblockButtons } from '../button-blocker';
import { t } from '../../utils/i18n';

const ORANGE_COUNTDOWN_SECONDS = 5;
const CONFIRMATION_PHRASE = 'I PROCEED';

/**
 * Setup focus trapping inside an element.
 */
function trapFocus(container: HTMLElement): () => void {
    const focusableSelector = 'a[href], input:not([disabled]), button:not([disabled]), [tabindex="0"]';
    
    const getFocusable = () => Array.from(container.querySelectorAll<HTMLElement>(focusableSelector));

    const handleKeydown = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;

        const focusable = getFocusable();
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
            if (document.activeElement === first) {
                last.focus();
                e.preventDefault();
            }
        } else {
            if (document.activeElement === last) {
                first.focus();
                e.preventDefault();
            }
        }
    };

    container.addEventListener('keydown', handleKeydown);

    // Initial focus placement
    setTimeout(() => {
        const focusable = getFocusable();
        if (focusable.length > 0) {
            focusable[0].focus();
        }
    }, 50);

    return () => {
        container.removeEventListener('keydown', handleKeydown);
    };
}

function buildClausesListDOM(clauses: Clause[], severityClass: 'orange' | 'red'): HTMLElement[] {
    return clauses.map((c) =>
        el('li', { className: `bs-clause-item ${severityClass}` }, [
            c.explanation ?? c.quote ?? 'Concerning clause'
        ])
    );
}

function buildAlternativesDOM(
    category?: string,
    hostname?: string,
    aiAlternatives?: AISuggestedAlternative[]
): HTMLElement | null {
    if (category) {
        const alts = getAlternatives(category, hostname);
        if (alts.displayName !== 'Online Service' && alts.alternatives.length) {
            const section = el('div', { className: 'bs-alt-section' }, [
                el('div', { className: 'bs-alt-title' }, [t('saferAlts', `🛡️ Safer ${alts.displayName} Alternatives`, [alts.displayName])])
            ]);
            alts.alternatives.slice(0, 3).forEach((alt) => {
                section.appendChild(
                    el('a', {
                        href: alt.url,
                        target: '_blank',
                        rel: 'noopener noreferrer',
                        className: 'bs-alt-card'
                    }, [
                        el('span', { className: 'bs-alt-icon' }, [alt.icon]),
                        el('div', { className: 'bs-alt-info' }, [
                            el('div', { className: 'bs-alt-name' }, [alt.name]),
                            el('div', { className: 'bs-alt-reason' }, [alt.reason])
                        ]),
                        el('span', { className: 'bs-alt-arrow' }, ['→'])
                    ])
                );
            });
            return section;
        }
    }

    if (aiAlternatives && aiAlternatives.length > 0) {
        const section = el('div', { className: 'bs-alt-section' }, [
            el('div', { className: 'bs-alt-title' }, [t('aiAlts', '🤖 AI-Suggested Alternatives')])
        ]);
        aiAlternatives.slice(0, 3).forEach((alt) => {
            section.appendChild(
                el('a', {
                    href: alt.url,
                    target: '_blank',
                    rel: 'noopener noreferrer',
                    className: 'bs-alt-card'
                }, [
                    el('span', { className: 'bs-alt-icon' }, ['🔗']),
                    el('div', { className: 'bs-alt-info' }, [
                        el('div', { className: 'bs-alt-name' }, [alt.name]),
                        el('div', { className: 'bs-alt-reason' }, [alt.reason])
                    ]),
                    el('span', { className: 'bs-alt-arrow' }, ['→'])
                ])
            );
        });
        section.appendChild(
            el('div', {
                style: 'font-size:10px;color:#64748b;text-align:center;margin-top:6px;'
            }, [t('aiAltWarning', 'AI-suggested — verify before visiting')])
        );
        return section;
    }

    return null;
}

export function createOrangeModal(
    clauses: Clause[],
    options: { category?: string; serviceName?: string; hostname?: string; aiAlternatives?: AISuggestedAlternative[] },
    onProceed: () => void,
    onAbort: () => void
): { element: HTMLElement; cleanup: () => void } {
    blockButtons(2);

    const activeElement = document.activeElement as HTMLElement;
    const name = options.serviceName ?? t('thisService', 'this service');
    const countdownEl = el('span', { id: 'blind-sight-countdown' }, [String(ORANGE_COUNTDOWN_SECONDS)]);
    const proceedBtn = el(
        'button',
        {
            id: 'blind-sight-proceed-btn',
            className: 'bs-btn bs-btn-proceed',
            disabled: 'true',
            'aria-label': t('waitCountdownLabel', `Wait ${ORANGE_COUNTDOWN_SECONDS} seconds to proceed`, [ORANGE_COUNTDOWN_SECONDS])
        },
        [t('waitCountdownPrefix', '⏳ Wait '), countdownEl, t('waitCountdownSuffix', ' seconds...')]
    ) as HTMLButtonElement;

    const abortBtn = el(
        'button',
        {
            id: 'blind-sight-abort-btn',
            className: 'bs-btn bs-btn-abort',
            'aria-label': t('leavePage', 'Leave this page')
        },
        [t('leavePageBtn', '✕ Leave This Page')]
    );

    const modal = el(
        'div',
        {
            id: 'blind-sight-modal',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-labelledby': 'bs-modal-title-id',
            'aria-describedby': 'bs-modal-subtitle-id'
        },
        [
            el('div', { className: 'bs-modal-header orange' }, [
                el('div', { id: 'bs-modal-title-id', className: 'bs-modal-title' }, [t('cautionaryTermsDetected', '⚠️ Cautionary Terms Detected')]),
                el('div', { id: 'bs-modal-subtitle-id', className: 'bs-modal-subtitle' }, [
                    t('cautionaryTermsDesc', `Blind-Sight found concerning terms in $1's agreement`, [name])
                ])
            ]),
            el('div', { className: 'bs-modal-body' }, [
                el('ul', { className: 'bs-clause-list' }, buildClausesListDOM(clauses, 'orange')),
                buildAlternativesDOM(options.category, options.hostname, options.aiAlternatives)
            ]),
            el('div', { className: 'bs-modal-footer' }, [abortBtn, proceedBtn])
        ]
    );

    const overlay = el('div', { id: 'blind-sight-overlay' }, [modal]);

    let countdown = ORANGE_COUNTDOWN_SECONDS;
    const countdownInterval = setInterval(() => {
        countdown--;
        countdownEl.textContent = String(countdown);
        proceedBtn.setAttribute('aria-label', t('waitCountdownLabel', `Wait ${countdown} seconds to proceed`, [countdown]));
        // Re-construct countdown content for translation compatibility if needed
        proceedBtn.innerHTML = '';
        proceedBtn.appendChild(document.createTextNode(t('waitCountdownPrefix', '⏳ Wait ')));
        proceedBtn.appendChild(countdownEl);
        proceedBtn.appendChild(document.createTextNode(t('waitCountdownSuffix', ' seconds...')));

        if (countdown <= 0) {
            clearInterval(countdownInterval);
            proceedBtn.removeAttribute('disabled');
            proceedBtn.textContent = t('readTermsProceed', "✓ I've Read the Terms - Proceed");
            proceedBtn.setAttribute('aria-label', t('readTermsProceed', "✓ I've Read the Terms - Proceed"));
        }
    }, 1000);

    const proceedHandler = () => {
        clearInterval(countdownInterval);
        unblockButtons();
        onProceed();
    };

    const abortHandler = () => {
        clearInterval(countdownInterval);
        onAbort();
    };

    proceedBtn.addEventListener('click', proceedHandler);
    abortBtn.addEventListener('click', abortHandler);

    // Escape and general keyboard event listeners
    const handleGlobalKeys = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            abortHandler();
        }
    };
    document.addEventListener('keydown', handleGlobalKeys);

    const focusCleanup = trapFocus(modal);

    return {
        element: overlay,
        cleanup: () => {
            clearInterval(countdownInterval);
            document.removeEventListener('keydown', handleGlobalKeys);
            focusCleanup();
            if (activeElement && typeof activeElement.focus === 'function') {
                activeElement.focus();
            }
        }
    };
}

export function createRedModal(
    clauses: Clause[],
    options: { category?: string; serviceName?: string; hostname?: string; aiAlternatives?: AISuggestedAlternative[] },
    onProceed: () => void,
    onAbort: () => void
): { element: HTMLElement; cleanup: () => void } {
    blockButtons(3);

    const activeElement = document.activeElement as HTMLElement;
    const name = options.serviceName ?? t('thisService', 'this service');
    const confirmInput = el('input', {
        id: 'blind-sight-confirm-input',
        className: 'bs-confirm-input',
        type: 'text',
        placeholder: t('typeToUnlock', `Type "${CONFIRMATION_PHRASE}"...`, [CONFIRMATION_PHRASE]),
        autocomplete: 'off',
        'aria-label': t('typeToUnlock', `Type "${CONFIRMATION_PHRASE}" to unlock proceed button`, [CONFIRMATION_PHRASE])
    }) as HTMLInputElement;

    const proceedBtn = el(
        'button',
        {
            id: 'blind-sight-proceed-btn',
            className: 'bs-btn bs-btn-proceed',
            disabled: 'true',
            'aria-label': t('typeToUnlock', `Type "${CONFIRMATION_PHRASE}" to unlock proceed button`, [CONFIRMATION_PHRASE])
        },
        [t('typeToUnlock', `🔒 Type "${CONFIRMATION_PHRASE}" to Unlock`, [CONFIRMATION_PHRASE])]
    ) as HTMLButtonElement;

    const abortBtn = el(
        'button',
        {
            id: 'blind-sight-abort-btn',
            className: 'bs-btn bs-btn-abort',
            'aria-label': t('leavePage', 'Leave this page')
        },
        [t('leavePageBtn', '✕ Leave This Page')]
    );

    const modal = el(
        'div',
        {
            id: 'blind-sight-modal',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-labelledby': 'bs-modal-title-id',
            'aria-describedby': 'bs-modal-subtitle-id'
        },
        [
            el('div', { className: 'bs-modal-header red' }, [
                el('div', { id: 'bs-modal-title-id', className: 'bs-modal-title' }, [t('criticalTermsDetected', '🚨 Critical Terms — High Risk')]),
                el('div', { id: 'bs-modal-subtitle-id', className: 'bs-modal-subtitle' }, [
                    t('criticalTermsDesc', `Blind-Sight detected aggressive terms in $1's agreement`, [name])
                ])
            ]),
            el('div', { className: 'bs-modal-body' }, [
                el('ul', { className: 'bs-clause-list' }, buildClausesListDOM(clauses, 'red')),
                buildAlternativesDOM(options.category, options.hostname, options.aiAlternatives),
                el('div', { className: 'bs-confirm-label' }, [
                    t('typeToUnlockLabelPrefix', 'Type '),
                    el('strong', {}, [`"${CONFIRMATION_PHRASE}"`]),
                    t('typeToUnlockLabelSuffix', ' to unlock')
                ]),
                confirmInput
            ]),
            el('div', { className: 'bs-modal-footer' }, [abortBtn, proceedBtn])
        ]
    );

    const overlay = el('div', { id: 'blind-sight-overlay' }, [modal]);

    const inputListener = (e: Event) => {
        const value = (e.target as HTMLInputElement).value.toUpperCase().trim();
        const isValid = value === CONFIRMATION_PHRASE;

        confirmInput.classList.remove('valid', 'invalid');
        if (isValid) {
            confirmInput.classList.add('valid');
            proceedBtn.removeAttribute('disabled');
            proceedBtn.textContent = t('proceedRisk', '🔓 Proceed at My Own Risk');
            proceedBtn.setAttribute('aria-label', t('proceedRisk', 'Proceed at my own risk'));
        } else {
            proceedBtn.setAttribute('disabled', 'true');
            proceedBtn.textContent = t('typeToUnlock', `🔒 Type "${CONFIRMATION_PHRASE}" to Unlock`, [CONFIRMATION_PHRASE]);
            proceedBtn.setAttribute('aria-label', t('typeToUnlock', `Type "${CONFIRMATION_PHRASE}" to unlock`, [CONFIRMATION_PHRASE]));
        }
    };

    confirmInput.addEventListener('input', inputListener);

    const keydownListener = (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
            if (confirmInput.value.toUpperCase().trim() === CONFIRMATION_PHRASE) {
                unblockButtons();
                onProceed();
            } else {
                confirmInput.classList.add('invalid');
                setTimeout(() => confirmInput.classList.remove('invalid'), 300);
            }
        }
    };

    confirmInput.addEventListener('keydown', keydownListener);

    const proceedHandler = () => {
        if (confirmInput.value.toUpperCase().trim() === CONFIRMATION_PHRASE) {
            unblockButtons();
            onProceed();
        }
    };

    const abortHandler = () => {
        onAbort();
    };

    proceedBtn.addEventListener('click', proceedHandler);
    abortBtn.addEventListener('click', abortHandler);

    // Escape and general keyboard event listeners
    const handleGlobalKeys = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            abortHandler();
        }
    };
    document.addEventListener('keydown', handleGlobalKeys);

    const focusCleanup = trapFocus(modal);

    return {
        element: overlay,
        cleanup: () => {
            confirmInput.removeEventListener('input', inputListener);
            confirmInput.removeEventListener('keydown', keydownListener);
            document.removeEventListener('keydown', handleGlobalKeys);
            focusCleanup();
            if (activeElement && typeof activeElement.focus === 'function') {
                activeElement.focus();
            }
        }
    };
}
