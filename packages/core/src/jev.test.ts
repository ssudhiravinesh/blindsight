import { describe, it, expect, vi } from 'vitest';
import {
    JEV_API_URL,
    applyVerification,
    buildVerificationRequest,
    parseJevResponse,
    verifyAnalysis,
} from '../../../supabase/functions/_shared/jev';
import { sanitizeAnalysis } from '../../../supabase/functions/_shared/analysis';
import { parseScanResult } from './openai';

const TOS = 'We sell your personal data to brokers. Disputes go to binding arbitration with a 30 day opt-out.';

const analysis = sanitizeAnalysis({
    overallSeverity: 2,
    category: 'social_media',
    clauses: [
        { type: 'DATA_SELLING', severity: 2, quote: 'We sell your personal data to brokers.', explanation: 'Sells data' },
        { type: 'ARBITRATION', severity: 1, quote: 'binding arbitration', explanation: 'Arbitration' },
        { type: 'CONTENT_RIGHTS', severity: 3, quote: 'We own everything you post forever.', explanation: 'Hallucinated' },
    ],
});

const score = (s: number, confidence: number) => ({ type: 'score', score: s, confidence, probabilities: {} });
const noul = (p: number) => ({ type: 'noul', noul: p });

function jevResponse() {
    return {
        model: 'jev-1.14.0',
        answers: {
            overall: score(3, 0.8),
            clause_0_present: noul(0.98),
            clause_0_severity: score(3, 0.9),
            clause_1_present: noul(0.95),
            clause_1_severity: score(0.6, 0.3), // low confidence: keep the LLM's value
            clause_2_present: noul(0.02), // not in the document
            clause_2_severity: score(3, 0.9),
        },
    };
}

describe('Jev verification', () => {
    it('keeps the document in state and asks typed questions per clause', () => {
        const { state, questions } = buildVerificationRequest(TOS, analysis);
        expect(state).toEqual({ terms_of_service: TOS });
        expect(Object.keys(questions)).toHaveLength(1 + analysis.clauses.length * 2);
        expect(questions.overall).toMatchObject({ type: 'score' });
        expect((questions.overall as { criteria: string[] }).criteria).toHaveLength(4);
        expect(questions.clause_0_present).toMatchObject({ type: 'noul' });
        expect(JSON.stringify(questions)).not.toContain('to brokers. Disputes');
    });

    it('drops unsupported clauses and calibrates severities with confidence', () => {
        const { questions } = buildVerificationRequest(TOS, analysis);
        const out = applyVerification(analysis, parseJevResponse(questions, jevResponse()));
        expect(out.clauses.map((c) => c.type)).toEqual(['DATA_SELLING', 'ARBITRATION']);
        expect(out.clauses[0]).toMatchObject({ severity: 3, confidence: 0.9 });
        expect(out.clauses[1]).toMatchObject({ severity: 1, confidence: 0.3 });
        expect(out.overallSeverity).toBe(3);
        expect(out.verification).toEqual({ model: 'jev-1.14.0', confidence: 0.8, droppedClauses: 1 });
    });

    it('moves a grade by at most one tier and never below the worst clause', () => {
        const a = sanitizeAnalysis({ overallSeverity: 3, clauses: [{ type: 'LIABILITY', severity: 3, explanation: 'x' }] });
        const { questions } = buildVerificationRequest(TOS, a);
        const res = parseJevResponse(questions, {
            model: 'jev-1.14.0',
            answers: { overall: score(0, 1), clause_0_present: noul(0.9), clause_0_severity: score(0, 1) },
        });
        const out = applyVerification(a, res);
        expect(out.clauses[0].severity).toBe(2);
        expect(out.overallSeverity).toBe(2);
    });

    it('rejects malformed or mistyped answers', () => {
        const { questions } = buildVerificationRequest(TOS, analysis);
        const bad = jevResponse();
        (bad.answers as Record<string, unknown>).clause_0_present = score(1, 1);
        expect(() => parseJevResponse(questions, bad)).toThrow(/mistyped/);
        const outOfRange = jevResponse();
        outOfRange.answers.overall = score(7, 0.9);
        expect(() => parseJevResponse(questions, outOfRange)).toThrow(/invalid score/);
    });

    it('calls the System One endpoint and falls back to the LLM analysis on failure', async () => {
        const ok = vi.fn(async () => new Response(JSON.stringify(jevResponse()), { status: 200 }));
        const verified = await verifyAnalysis('key', TOS, analysis, { fetchImpl: ok as unknown as typeof fetch });
        expect(verified.verification?.model).toBe('jev-1.14.0');
        const [url, init] = ok.mock.calls[0] as unknown as [string, RequestInit];
        expect(url).toBe(JEV_API_URL);
        expect((init.headers as Record<string, string>).Authorization).toBe('Bearer key');
        expect(JSON.parse(init.body as string)).toMatchObject({ model: 'jev-1.14.0', state: { terms_of_service: TOS } });

        vi.spyOn(console, 'error').mockImplementation(() => {});
        const failing = vi.fn(async () => new Response('overloaded', { status: 529 }));
        expect(await verifyAnalysis('key', TOS, analysis, { fetchImpl: failing as unknown as typeof fetch })).toBe(analysis);
    });

    it('carries verification through cache sanitisation to the extension result', () => {
        const { questions } = buildVerificationRequest(TOS, analysis);
        const verified = applyVerification(analysis, parseJevResponse(questions, jevResponse()));
        const result = parseScanResult(JSON.stringify({ ...verified, verification: { ...verified.verification, confidence: 9 } }));
        expect(result.verification).toEqual({ model: 'jev-1.14.0', confidence: 1, droppedClauses: 1 });
        expect(result.clauses[0].confidence).toBe(0.9);
    });
});
