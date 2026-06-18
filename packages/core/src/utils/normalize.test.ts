import { describe, it, expect } from 'vitest';
import { normalizeToS } from './normalize';
import { hashToS } from './hash';

describe('normalizeToS', () => {
  it('should strip HTML tags', () => {
    const raw = '<div class="tos">Welcome to our <strong>Terms</strong></div>';
    expect(normalizeToS(raw)).toBe('welcome to our terms');
  });

  it('should decode HTML entities', () => {
    const raw = 'Terms &amp; Conditions &lt; Rules &gt; &quot;Guidelines&quot;';
    expect(normalizeToS(raw)).toBe('terms & conditions < rules > "guidelines"');
  });

  it('should remove "Last updated" and date strings', () => {
    const raw1 = 'Last Updated: January 15, 2026. These are the terms.';
    expect(normalizeToS(raw1)).toBe('these are the terms.');

    const raw2 = 'Effective date: 2026-01-15. Welcome.';
    expect(normalizeToS(raw2)).toBe('welcome.');
  });

  it('should collapse multiple spaces and trim', () => {
    const raw = '  Some   very    spaced   out   text  ';
    expect(normalizeToS(raw)).toBe('some very spaced out text');
  });

  it('should convert text to lowercase', () => {
    const raw = 'TERMS OF SERVICE';
    expect(normalizeToS(raw)).toBe('terms of service');
  });
});

describe('hashToS', () => {
  it('should generate a consistent SHA-256 hash', async () => {
    const text1 = 'hello world';
    const text2 = 'hello world';
    const hash1 = await hashToS(text1);
    const hash2 = await hashToS(text2);
    
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 hex length
    // 'hello world' SHA-256 is b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9
    expect(hash1).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
  });
});
