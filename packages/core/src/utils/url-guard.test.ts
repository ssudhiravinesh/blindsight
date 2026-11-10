import { describe, it, expect } from 'vitest';
import { checkPublicHttpUrl, isAllowedTosFetchUrl, isBlockedHostname, isNonPublicIp, siteOf } from './url-guard';

describe('isNonPublicIp', () => {
    it.each([
        '127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254',
        '100.64.0.1', '0.0.0.0', '224.0.0.1', '255.255.255.255',
        '::1', '::', 'fc00::1', 'fd12:3456::1', 'fe80::1', '::ffff:127.0.0.1', '::ffff:7f00:1',
        '64:ff9b::a9fe:a9fe', '[::1]',
    ])('blocks %s', (ip) => {
        expect(isNonPublicIp(ip)).toBe(true);
    });

    it.each(['8.8.8.8', '172.32.0.1', '1.1.1.1', '2606:4700:4700::1111', '::ffff:8.8.8.8'])('allows %s', (ip) => {
        expect(isNonPublicIp(ip)).toBe(false);
    });
});

describe('isBlockedHostname', () => {
    it.each(['localhost', 'foo.localhost', 'printer.local', 'db.internal', 'intranet', '127.0.0.1', '[::1]'])(
        'blocks %s', (h) => expect(isBlockedHostname(h)).toBe(true),
    );
    it.each(['example.com', 'sub.example.co.uk', '8.8.8.8'])('allows %s', (h) => expect(isBlockedHostname(h)).toBe(false));
});

describe('checkPublicHttpUrl', () => {
    it('rejects non-http schemes, credentials and odd ports', () => {
        expect(checkPublicHttpUrl('file:///etc/passwd').ok).toBe(false);
        expect(checkPublicHttpUrl('javascript:alert(1)').ok).toBe(false);
        expect(checkPublicHttpUrl('https://user:pw@example.com/terms').ok).toBe(false);
        expect(checkPublicHttpUrl('http://example.com:8080/terms').ok).toBe(false);
        expect(checkPublicHttpUrl('http://169.254.169.254/latest/meta-data').ok).toBe(false);
        expect(checkPublicHttpUrl('http://2130706433/').ok).toBe(false); // decimal 127.0.0.1 normalised by URL
    });

    it('accepts public https URLs', () => {
        expect(checkPublicHttpUrl('https://example.com/terms').ok).toBe(true);
    });
});

describe('siteOf', () => {
    it('handles common two-level ccTLDs', () => {
        expect(siteOf('accounts.example.co.uk')).toBe('example.co.uk');
        expect(siteOf('www.example.com')).toBe('example.com');
    });
});

describe('isAllowedTosFetchUrl', () => {
    const tab = 'https://signup.example.com/register';

    it('allows same-site URLs', () => {
        expect(isAllowedTosFetchUrl('https://www.example.com/anything', tab)).toBe(true);
    });

    it('allows hosted policy providers and legal paths', () => {
        expect(isAllowedTosFetchUrl('https://www.termsfeed.com/live/abc', tab)).toBe(true);
        expect(isAllowedTosFetchUrl('https://other.org/legal/terms', tab)).toBe(true);
    });

    it('rejects unrelated non-legal URLs and private targets', () => {
        expect(isAllowedTosFetchUrl('https://tracker.evil/collect', tab)).toBe(false);
        expect(isAllowedTosFetchUrl('http://192.168.0.1/terms', tab)).toBe(false);
        expect(isAllowedTosFetchUrl('http://localhost/terms', 'http://localhost/')).toBe(false);
    });
});
