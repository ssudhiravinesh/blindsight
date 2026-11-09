import { afterEach, describe, expect, it, vi } from 'vitest';
import { hideWarningModal, showPreScanPrompt, showWarningModal } from './manager';

const shadow = () => document.getElementById('blind-sight-shadow-host')!.shadowRoot!;

afterEach(() => {
    hideWarningModal();
    document.body.innerHTML = '';
    vi.useRealTimers();
});

describe('warning modal', () => {
    it('lists findings by name, most severe first, without emoji icons', () => {
        showWarningModal(
            [
                { type: 'TOS_CHANGES', severity: 1, explanation: 'May change terms.' },
                { type: 'DATA_SELLING', severity: 3, explanation: 'Sells data.' },
            ],
            3,
            { serviceName: 'InstaFeed' },
        );
        const items = Array.from(shadow().querySelectorAll('.bs-clause-item'));
        expect(items.map((li) => li.querySelector('.bs-clause-name')?.textContent)).toEqual([
            'Data Selling/Sharing',
            'Terms Changes',
        ]);
        expect(items[0].classList.contains('red')).toBe(true);
        expect(items[1].className).toBe('bs-clause-item yellow');
        expect(shadow().querySelector('.bs-modal-header svg')).not.toBeNull();
        expect(shadow().querySelector('.bs-modal-title')?.textContent).toBe('Critical terms: high risk');
    });

    it('starts on the safe action and keeps Tab focus inside the shadow-root modal', async () => {
        vi.useFakeTimers();
        showWarningModal([{ type: 'OTHER', severity: 2, explanation: 'x' }], 2, {});
        vi.advanceTimersByTime(60);

        const modal = shadow().getElementById('blind-sight-modal')!;
        expect(shadow().activeElement?.id).toBe('blind-sight-abort-btn');
        const focusable = Array.from(modal.querySelectorAll<HTMLElement>('button:not([disabled]), input, a[href]'));
        const last = focusable[focusable.length - 1];
        last.focus();
        expect(shadow().activeElement).toBe(last);

        modal.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
        expect(shadow().activeElement).toBe(focusable[0]);
    });
});

describe('sign-up prompt', () => {
    it('resolves exactly once when scanning is chosen', async () => {
        const promise = showPreScanPrompt();
        const scan = shadow().getElementById('bs-prompt-scan') as HTMLButtonElement;
        expect(shadow().getElementById('bs-prompt-later')).not.toBeNull();
        scan.click();
        await expect(promise).resolves.toBe(true);
    });
});
