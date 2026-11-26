/**
 * Copyright (c) 2026 Sudhir Avinesh. All rights reserved.
 * Proprietary and Confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 */
import type { Clause, AISuggestedAlternative } from '../../types';
import { CLAUSE_INFO } from '../../types';
import { getAlternatives } from '../../alternatives';
import { el, icon } from '../renderer';
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
    // Inside a shadow root document.activeElement is the host, so ask the root.
    const focused = () => (container.getRootNode() as Document | ShadowRoot).activeElement;

    const handleKeydown = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;

        const focusable = getFocusable();
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
            if (focused() === first) {
                last.focus();
                e.preventDefault();
            }
        } else {
            if (focused() === last) {
                first.focus();
                e.preventDefault();
            }
        }
    };

    container.addEventListener('keydown', handleKeydown);

    // Start on the safe action so a stray Enter leaves rather than proceeds.
    setTimeout(() => {
        const safe = container.querySelector<HTMLElement>("#blind-sight-abort-btn");
        (safe ?? getFocusable()[0])?.focus();
    }, 50);

    return () => {
        container.removeEventListener('keydown', handleKeydown);
    };
}

function buildClausesListDOM(clauses: Clause[]): HTMLElement[] {
    return [...clauses]
        .sort((a, b) => (b.severity ?? 0) - (a.severity ?? 0))
        .map((c) => {
            const info = CLAUSE_INFO[c.type] ?? CLAUSE_INFO.DEFAULT;
            const level = (c.severity ?? 0) >= 3 ? 'red' : (c.severity ?? 0) >= 2 ? 'orange' : 'yellow';
            return el('li', { className: `bs-clause-item ${level}` }, [
                el('span', { className: 'bs-clause-name' }, [info.name]),
                el('span', { className: 'bs-clause-text' }, [c.explanation ?? c.quote ?? 'Concerning clause'])
            ]);
        });
}

function altCard(name: string, url: string, reason: string, badge: string): HTMLElement {
    return el('a', { href: url, target: '_blank', rel: 'noopener noreferrer', className: 'bs-alt-card' }, [
        el('span', { className: 'bs-alt-icon' }, [badge]),
        el('div', { className: 'bs-alt-info' }, [
            el('div', { className: 'bs-alt-name' }, [name]),
            el('div', { className: 'bs-alt-reason' }, [reason])
        ]),
        el('span', { className: 'bs-alt-arrow' }, [icon('arrow', 14)])
    ]);
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
                el('div', { className: 'bs-alt-title' }, [t('saferAlts', `Safer ${alts.displayName} alternatives`, [alts.displayName])])
            ]);
            alts.alternatives.slice(0, 3).forEach((alt) => section.appendChild(altCard(alt.name, alt.url, alt.reason, alt.icon)));
            return section;
        }
    }

    if (aiAlternatives && aiAlternatives.length > 0) {
        const section = el('div', { className: 'bs-alt-section' }, [
            el('div', { className: 'bs-alt-title' }, [icon('sparkles', 12), t('aiAlts', 'AI-suggested alternatives')])
        ]);
        aiAlternatives.slice(0, 3).forEach((alt) =>
            section.appendChild(altCard(alt.name, alt.url, alt.reason, alt.name.charAt(0).toUpperCase()))
        );
        section.appendChild(el('div', { className: 'bs-alt-note' }, [t('aiAltWarning', 'Suggested by AI. Verify before signing up.')]));
        return section;
    }

    return null;
}

function modalHeader(tone: 'orange' | 'red', title: string, subtitle: string): HTMLElement {
    return el('div', { className: `bs-modal-header ${tone}` }, [
        el('div', { className: 'bs-modal-icon' }, [icon(tone === 'red' ? 'octagon' : 'alert', 22)]),
        el('div', { className: 'bs-modal-heading' }, [
            el('div', { className: 'bs-modal-eyebrow' }, [tone === 'red' ? 'Grade F · Critical' : 'Grade C · Cautionary']),
            el('div', { id: 'bs-modal-title-id', className: 'bs-modal-title' }, [title]),
            el('div', { id: 'bs-modal-subtitle-id', className: 'bs-modal-subtitle' }, [subtitle])
        ])
    ]);
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
        [t('waitCountdownPrefix', 'Wait '), countdownEl, t('waitCountdownSuffix', 's to continue')]
    ) as HTMLButtonElement;

    const abortBtn = el(
        'button',
        {
            id: 'blind-sight-abort-btn',
            className: 'bs-btn bs-btn-abort',
            'aria-label': t('leavePage', 'Leave this page')
        },
        [t('leavePageBtn', 'Leave this page')]
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
            modalHeader(
                'orange',
                t('cautionaryTermsDetected', 'Cautionary terms detected'),
                t('cautionaryTermsDesc', `Blind-Sight found concerning terms in $1's agreement`, [name])
            ),
            el('div', { className: 'bs-modal-body' }, [
                el('ul', { className: 'bs-clause-list' }, buildClausesListDOM(clauses)),
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
        proceedBtn.replaceChildren();
        proceedBtn.appendChild(document.createTextNode(t('waitCountdownPrefix', 'Wait ')));
        proceedBtn.appendChild(countdownEl);
        proceedBtn.appendChild(document.createTextNode(t('waitCountdownSuffix', 's to continue')));

        if (countdown <= 0) {
            clearInterval(countdownInterval);
            proceedBtn.removeAttribute('disabled');
            proceedBtn.textContent = t('readTermsProceed', "I've read the terms, continue");
            proceedBtn.setAttribute('aria-label', t('readTermsProceed', "I've read the terms, continue"));
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
        placeholder: CONFIRMATION_PHRASE,
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
        [t('proceedRisk', 'Continue at my own risk')]
    ) as HTMLButtonElement;

    const abortBtn = el(
        'button',
        {
            id: 'blind-sight-abort-btn',
            className: 'bs-btn bs-btn-abort',
            'aria-label': t('leavePage', 'Leave this page')
        },
        [t('leavePageBtn', 'Leave this page')]
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
            modalHeader(
                'red',
                t('criticalTermsDetected', 'Critical terms: high risk'),
                t('criticalTermsDesc', `Blind-Sight detected aggressive terms in $1's agreement`, [name])
            ),
            el('div', { className: 'bs-modal-body' }, [
                el('ul', { className: 'bs-clause-list' }, buildClausesListDOM(clauses)),
                buildAlternativesDOM(options.category, options.hostname, options.aiAlternatives)
            ]),
            el('div', { className: 'bs-modal-footer' }, [
                el('div', { className: 'bs-confirm-label' }, [
                    t('typeToUnlockLabelPrefix', 'Type '),
                    el('strong', {}, [`"${CONFIRMATION_PHRASE}"`]),
                    t('typeToUnlockLabelSuffix', ' to unlock')
                ]),
                confirmInput,
                abortBtn,
                proceedBtn
            ])
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
            proceedBtn.textContent = t('proceedRisk', 'Continue at my own risk');
            proceedBtn.setAttribute('aria-label', t('proceedRisk', 'Proceed at my own risk'));
        } else {
            proceedBtn.setAttribute('disabled', 'true');
            proceedBtn.textContent = t('proceedRisk', 'Continue at my own risk');
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
