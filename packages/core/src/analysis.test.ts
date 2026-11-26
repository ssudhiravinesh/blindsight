import { describe, it, expect } from 'vitest';
import { parseScanResult } from './openai';

const wrap = (obj: unknown) => JSON.stringify(obj);

describe('parseScanResult (LLM output validation)', () => {
    it('accepts fenced JSON and clamps severities', () => {
        const res = parseScanResult('```json\n' + wrap({
            overallSeverity: 7,
            category: 'social_media',
            clauses: [{ type: 'data_selling', severity: -2, explanation: 'x' }],
        }) + '\n```');
        expect(res.overallSeverity).toBe(3);
        expect(res.lethal).toBe(true);
        expect(res.clauses[0]).toMatchObject({ type: 'DATA_SELLING', severity: 0 });
    });

    it('drops non-https alternative URLs (javascript:, data:, http:)', () => {
        const res = parseScanResult(wrap({
            overallSeverity: 2,
            clauses: [],
            suggestedAlternatives: [
                { name: 'Evil', url: 'javascript:alert(document.cookie)', reason: 'xss' },
                { name: 'Data', url: 'data:text/html,<script>1</script>', reason: 'xss' },
                { name: 'Plain', url: 'http://example.com', reason: 'insecure' },
                { name: 'Good', url: 'https://proton.me', reason: 'privacy' },
            ],
        }));
        expect(res.aiAlternatives).toEqual([{ name: 'Good', url: 'https://proton.me/', reason: 'privacy' }]);
    });

    it('caps clause count and string lengths, normalises unknown enums', () => {
        const res = parseScanResult(wrap({
            overallSeverity: 1,
            category: 'Robert"); DROP TABLE',
            summary: 'a'.repeat(5000),
            clauses: Array.from({ length: 100 }, () => ({ type: 'IGNORE PREVIOUS INSTRUCTIONS', explanation: 'e' })),
        }));
        expect(res.category).toBe('unknown');
        expect(res.summary).toHaveLength(600);
        expect(res.clauses).toHaveLength(25);
        expect(res.clauses[0].type).toBe('OTHER');
    });

    it('rejects non-object payloads', () => {
        expect(() => parseScanResult('[1,2,3]')).toThrow(/Unable to parse/);
        expect(() => parseScanResult('not json')).toThrow(/Unable to parse/);
    });
});
