/**
 * Copyright (c) 2026 Sudhir Avinesh. All rights reserved.
 * Proprietary and Confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 */

import type { Clause, ScanResult, SeverityKey } from './types';
import type { ApiProvider } from './storage';
import { SYSTEM_PROMPT } from '../../../supabase/functions/_shared/prompt';
import { sanitizeAnalysis, extractJson } from '../../../supabase/functions/_shared/analysis';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
/** Matches the backend limit (analyze rejects longer bodies). */
export const MAX_TOS_LENGTH = 30000;
const TRUNCATION_NOTE = '\n\n[Text truncated due to length...]';


export function truncateText(text: string): string {
    if (text.length <= MAX_TOS_LENGTH) return text;
    return text.substring(0, MAX_TOS_LENGTH - TRUNCATION_NOTE.length) + TRUNCATION_NOTE;
}

/**
 * Parses model output (or a server-side analysis) into a ScanResult. All
 * fields go through the shared validator: LLM output is untrusted, and e.g.
 * a `javascript:` alternative URL must never reach the UI.
 */
export function parseScanResult(responseText: string): ScanResult {
    let analysis;
    try {
        analysis = sanitizeAnalysis(extractJson(responseText));
    } catch (error) {
        console.error('Failed to parse analysis response:', error);
        throw new Error('Analysis Failed: Unable to parse LLM response JSON.', { cause: error });
    }

    const overallSeverity = analysis.overallSeverity as SeverityKey;
    return {
        overallSeverity,
        category: analysis.category as ScanResult['category'],
        serviceName: analysis.serviceName,
        summary: analysis.summary,
        clauses: analysis.clauses.map((c) => ({
            type: c.type as Clause['type'],
            severity: c.severity as SeverityKey,
            quote: c.quote,
            explanation: c.explanation,
            mitigation: c.mitigation,
        })),
        lethal: overallSeverity >= 3,
        ...(analysis.suggestedAlternatives.length > 0 ? { aiAlternatives: analysis.suggestedAlternatives } : {}),
    };
}


export async function analyzeTOS(apiKey: string, tosText: string): Promise<ScanResult> {
    if (!apiKey) throw new Error('API key is required');
    if (!tosText || tosText.trim().length === 0) throw new Error('No ToS text provided');

    const text = truncateText(tosText.trim());

    const requestBody = {
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            {
                role: 'user',
                content: `Analyze the following Terms of Service text and classify by severity tier:\n\n---\n${text}\n---`,
            },
        ],
        temperature: 0.1,
        max_tokens: 2048,
        response_format: { type: 'json_object' },
    };

    try {
        const response = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({})) as Record<string, unknown>;

            if (response.status === 401) throw new Error('Invalid API key. Please check your OpenAI API key in Settings.');
            if (response.status === 429) throw new Error('Rate limit exceeded. Please wait a moment and try again.');
            if (response.status === 402 || response.status === 403) throw new Error('API quota exceeded or access denied. Check your OpenAI billing.');
            if (response.status >= 500) throw new Error(`OpenAI server error (${response.status}). This is usually temporary - please try again.`);

            const errMsg = (errorData.error as Record<string, string>)?.message;
            throw new Error(errMsg ?? `API request failed with status ${response.status}`);
        }

        const data = await response.json() as { choices?: { message?: { content?: string } }[] };
        const responseText = data.choices?.[0]?.message?.content;

        if (!responseText) throw new Error('Empty response from OpenAI API');
        return parseScanResult(responseText);
    } catch (error) {
        const msg = (error as Error).message;
        if (msg.includes('API key') || msg.includes('Rate limit') || msg.includes('quota')) throw error;
        console.error('OpenAI API error:', error);
        throw new Error(`Failed to analyze ToS: ${msg}`, { cause: error });
    }
}

export interface SeverityInfo {
    name: string;
    color: string;
    icon: string;
    badge: string;
}

export function getSeverityInfo(severity: SeverityKey): SeverityInfo {
    const levels: Record<SeverityKey, SeverityInfo> = {
        0: { name: 'Standard', color: '#22c55e', icon: '✓', badge: 'safe' },
        1: { name: 'Notable', color: '#eab308', icon: '⚠', badge: 'notable' },
        2: { name: 'Cautionary', color: '#f97316', icon: '⚡', badge: 'caution' },
        3: { name: 'Critical', color: '#ef4444', icon: '🚨', badge: 'danger' },
    };
    return levels[severity] ?? levels[0];
}

async function analyzeTOSviaGemini(apiKey: string, tosText: string): Promise<ScanResult> {
    if (!apiKey) throw new Error('Gemini API key is required');
    if (!tosText || tosText.trim().length === 0) throw new Error('No ToS text provided');

    const text = truncateText(tosText.trim());

    const requestBody = {
        systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT }],
        },
        contents: [
            {
                role: 'user',
                parts: [
                    {
                        text: `Analyze the following Terms of Service text and classify by severity tier:\n\n---\n${text}\n---`,
                    },
                ],
            },
        ],
        generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048,
            responseMimeType: 'application/json',
        },
    };

    try {
        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({})) as Record<string, unknown>;

            if (response.status === 400) throw new Error('Invalid Gemini API key or request. Check your key in Settings.');
            if (response.status === 403) throw new Error('Gemini API key lacks permission. Check your API key.');
            if (response.status === 429) throw new Error('Gemini rate limit exceeded. Please wait a moment and try again.');
            if (response.status >= 500) throw new Error(`Gemini server error (${response.status}). Please try again.`);

            const errMsg = (errorData.error as Record<string, string>)?.message;
            throw new Error(errMsg ?? `Gemini API request failed with status ${response.status}`);
        }

        const data = await response.json() as {
            candidates?: { content?: { parts?: { text?: string }[] } }[];
        };
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!responseText) throw new Error('Empty response from Gemini API');
        return parseScanResult(responseText);
    } catch (error) {
        const msg = (error as Error).message;
        if (msg.includes('API key') || msg.includes('Rate limit') || msg.includes('permission')) throw error;
        console.error('Gemini API error:', error);
        throw new Error(`Failed to analyze ToS via Gemini: ${msg}`, { cause: error });
    }
}

export async function analyzeTOSWithUserKey(
    apiKey: string,
    provider: ApiProvider,
    tosText: string,
): Promise<ScanResult> {
    if (provider === 'gemini') {
        return analyzeTOSviaGemini(apiKey, tosText);
    }
    return analyzeTOS(apiKey, tosText);
}
