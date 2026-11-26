import { describe, it, expect } from 'vitest';
import { el, isSafeLinkUrl } from './renderer';

describe('overlay renderer', () => {
    it('only treats http(s) URLs as safe links', () => {
        expect(isSafeLinkUrl('https://proton.me')).toBe(true);
        expect(isSafeLinkUrl('javascript:alert(1)')).toBe(false);
        expect(isSafeLinkUrl('JaVaScRiPt:alert(1)')).toBe(false);
        expect(isSafeLinkUrl('data:text/html,<b>x</b>')).toBe(false);
        expect(isSafeLinkUrl(undefined)).toBe(false);
    });

    it('drops unsafe href attributes and renders text as text', () => {
        const a = el('a', { href: 'javascript:alert(1)' }, ['<img src=x onerror=alert(1)>']);
        expect(a.hasAttribute('href')).toBe(false);
        expect(a.children).toHaveLength(0);
        expect(a.textContent).toBe('<img src=x onerror=alert(1)>');
    });
});
