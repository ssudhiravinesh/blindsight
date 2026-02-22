import type { ScanResult, SeverityKey } from './types';
import type { ApiProvider } from './storage';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const SYNDICATE_SERVER_URL = 'http://localhost:8000/api/v1/analyze';
const SYNDICATE_API_KEY = 'blindsight_key_1';

const MAX_TOS_LENGTH = 30000;

const SYSTEM_PROMPT = `You are an expert legal document analyzer specializing in Terms of Service agreements. Your job is to analyze ToS text and classify concerning clauses by SEVERITY LEVEL.

## SEVERITY TIERS (0-3):

### TIER 0 - STANDARD (Green) ✓
DO NOT flag these - they are normal, industry-standard terms:
- Basic data collection for service functionality
- Standard cookie usage for site operation
- Age verification requirements
- Account termination for TOS violations
- Arbitration WITH an opt-out option
- Reasonable content moderation policies
- Standard service limitations

### TIER 1 - NOTABLE (Yellow) ⚠
Informational only - common but worth noting:
- Data sharing with "trusted partners" for service improvement
- Binding arbitration (standard in most US companies including Google, Apple, Meta)
- 30+ day notice for TOS changes
- Marketing communications with easy opt-out
- Content licensing for platform functionality
- Standard indemnification clauses

### TIER 2 - CAUTIONARY (Orange) ⚡
Unusual terms that deserve attention:
- Data sharing/selling to third-party advertisers (beyond service operation)
- TOS changes with less than 30 days notice
- Broad content licensing beyond platform needs
- Automatic renewal without clear cancellation process
- Binding arbitration with short opt-out window (< 30 days)
- Waiving right to jury trial with no alternatives

### TIER 3 - CRITICAL (Red) 🚨
Predatory/aggressive terms that severely compromise user rights or privacy:
- Explicit selling or sharing of data to data brokers by name or across third-party advertisers (e.g., massive cross-app tracking without opt-out)
- Collection and sharing of biometric data or highly sensitive personal info without explicit, narrow consent
- Perpetual, irrevocable, worldwide rights to user content
- TOS changes effective immediately with NO notice
- Complete waiver of liability for gross negligence or willful misconduct
- Mandatory arbitration with NO opt-out AND class action waiver
- Government surveillance cooperation beyond legal requirements

## IMPORTANT CALIBRATION NOTES:
1. DO NOT anchor scores based on name recognition. Brand-name companies can and DO have Tier 2 or Tier 3 clauses.
2. Consider the SCOPE of data collection. If an e-commerce or utility app collects and monetizes broad device, behavioral, or biometric data, it is at least Tier 2, potentially Tier 3.
3. Consider CONTEXT: arbitration alone is NOT critical if it has a reasonable opt-out window.
4. Upgrade the overall severity to Tier 3 if multiple Tier 2 aggressive clauses stack up in the same document.
5. Consider MITIGATIONS: notice periods, opt-outs, alternatives.

## SERVICE CATEGORIES (for alternative suggestions):
Identify what type of service this ToS belongs to. Choose ONE from:
- vpn, email, cloud_storage, social_media, messaging, video_conferencing, search, browser, password_manager, notes, ai_assistant, file_sharing
- streaming_video, streaming_music, ecommerce, maps_navigation, fitness_health, food_delivery, ride_sharing, gaming, dating
- finance_banking, education, dns, photo_editing, office_suite, code_hosting, news_media, calendar, productivity
- operating_system, mobile_os, domain_registrar, web_hosting, analytics, translation, video_sharing, two_factor_auth
- podcast, rss_reader, design_tools, crm, project_management, forms_surveys, link_shortener, digital_payments, remote_access, photo_storage, forum
- unknown (ONLY if none of the above fit)

## RESPONSE FORMAT:
Respond ONLY with valid JSON:
{
  "overallSeverity": 0-3,
  "category": "<one of the categories listed above>",
  "serviceName": "Name of the service (e.g., TurboVPN, Gmail)",
  "summary": "Brief 1-sentence summary of the ToS",
  "clauses": [
    {
      "type": "DATA_SELLING | ARBITRATION | TOS_CHANGES | CONTENT_RIGHTS | LIABILITY | OTHER",
      "severity": 0-3,
      "quote": "exact relevant quote (keep brief)",
      "explanation": "human-readable explanation",
      "mitigation": "any opt-out or protection available, or null"
    }
  ],
  "suggestedAlternatives": [
    {
      "name": "Alternative Service Name",
      "url": "https://alternative-url.com",
      "reason": "Why this alternative is more privacy-friendly"
    }
  ]
}

NOTE ON suggestedAlternatives:
- ONLY include this field when category is "unknown" AND overallSeverity >= 2
- Suggest 2-3 privacy-respecting alternatives specific to the type of service analyzed
- Omit this field entirely for known categories (we have our own curated database)

If terms are standard with no concerns: {"overallSeverity": 0, "category": "...", "serviceName": "...", "summary": "Standard terms...", "clauses": []}`;

function truncateText(text: string): string {
    if (text.length <= MAX_TOS_LENGTH) return text;
    return text.substring(0, MAX_TOS_LENGTH) + '\n\n[Text truncated due to length...]';
}

function parseResponse(responseText: string): ScanResult {
    let jsonStr = responseText;

    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
    }

    try {
        const parsed = JSON.parse(jsonStr) as Record<string, unknown>;

        let overallSeverity: SeverityKey = 0;
        if (typeof parsed.overallSeverity === 'number') {
            overallSeverity = Math.max(0, Math.min(3, parsed.overallSeverity)) as SeverityKey;
        } else if (typeof parsed.lethal === 'boolean') {
            overallSeverity = parsed.lethal ? 3 : 0;
        }

        const rawClauses = Array.isArray(parsed.clauses) ? parsed.clauses : [];
        const clauses = rawClauses.map((clause: Record<string, unknown>) => ({
            type: (clause.type as string) ?? 'OTHER',
            severity: (typeof clause.severity === 'number'
                ? Math.max(0, Math.min(3, clause.severity))
                : 1) as SeverityKey,
            quote: clause.quote as string | undefined,
            explanation: (clause.explanation as string) ?? 'No explanation provided',
            mitigation: (clause.mitigation as string | null) ?? null,
        }));

        const rawAiAlts = Array.isArray(parsed.suggestedAlternatives) ? parsed.suggestedAlternatives : [];
        const aiAlternatives = rawAiAlts
            .filter((a: Record<string, unknown>) => a.name && a.url && a.reason)
            .map((a: Record<string, unknown>) => ({
                name: a.name as string,
                url: a.url as string,
                reason: a.reason as string,
            }));

        return {
            overallSeverity,
            category: (parsed.category as string) ?? 'unknown',
            serviceName: parsed.serviceName as string | undefined,
            summary: parsed.summary as string | undefined,
            clauses,
            lethal: overallSeverity >= 3,
            ...(aiAlternatives.length > 0 ? { aiAlternatives } : {}),
        } as ScanResult;
    } catch (error) {
        console.error('Failed to parse OpenAI response:', error);
        return {
            overallSeverity: 0,
            summary: 'Unable to analyze terms',
            clauses: [],
            parseError: true,
            rawResponse: responseText,
            lethal: false,
        };
    }
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

export async function analyzeTOSviaServer(tosText: string, sourceUrl?: string): Promise<ScanResult> {
    if (!tosText || tosText.trim().length === 0) throw new Error('No ToS text provided');

    const text = truncateText(tosText.trim());
    const MAX_RETRIES = 2;
    const TIMEOUT_MS = 45000; // 45s to handle Railway cold starts + LLM response time

    const fetchOptions: RequestInit = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': SYNDICATE_API_KEY,
        },
        body: JSON.stringify({
            tos_text: text,
            source_url: sourceUrl ?? '',
        }),
    };

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const response = await fetchWithTimeout(SYNDICATE_SERVER_URL, fetchOptions, TIMEOUT_MS);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({})) as Record<string, unknown>;

                if (response.status === 401 || response.status === 403) throw new Error('Syndicate server authentication failed.');
                if (response.status === 429) throw new Error('Syndicate server rate limit exceeded. Please wait and try again.');
                if (response.status >= 500) {
                    // Retry on 5xx (Railway cold start may cause these)
                    if (attempt < MAX_RETRIES) {
                        console.warn(`[Blind-Sight] Server returned ${response.status}, retrying (${attempt}/${MAX_RETRIES})...`);
                        await new Promise(r => setTimeout(r, 3000));
                        continue;
                    }
                    throw new Error(`Syndicate server error (${response.status}). Please try again later.`);
                }

                const errMsg = (errorData as Record<string, string>)?.detail;
                throw new Error(errMsg ?? `Syndicate server request failed with status ${response.status}`);
            }

            const data = await response.json() as Record<string, unknown>;
            return parseResponse(JSON.stringify(data));
        } catch (error) {
            const msg = (error as Error).message;
            // Don't retry on auth/rate-limit errors
            if (msg.includes('Syndicate server authentication') || msg.includes('rate limit')) throw error;

            if (attempt < MAX_RETRIES) {
                console.warn(`[Blind-Sight] Server request failed (attempt ${attempt}/${MAX_RETRIES}): ${msg}. Retrying...`);
                await new Promise(r => setTimeout(r, 3000));
                continue;
            }

            if (msg.includes('Syndicate server')) throw error;
            console.error('Syndicate server error:', error);
            throw new Error(`Syndicate server unavailable: ${msg}`);
        }
    }

    throw new Error('Syndicate server unavailable: all retries exhausted');
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
        return parseResponse(responseText);
    } catch (error) {
        const msg = (error as Error).message;
        if (msg.includes('API key') || msg.includes('Rate limit') || msg.includes('quota')) throw error;
        console.error('OpenAI API error:', error);
        throw new Error(`Failed to analyze ToS: ${msg}`);
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
        const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
        return parseResponse(responseText);
    } catch (error) {
        const msg = (error as Error).message;
        if (msg.includes('API key') || msg.includes('Rate limit') || msg.includes('permission')) throw error;
        console.error('Gemini API error:', error);
        throw new Error(`Failed to analyze ToS via Gemini: ${msg}`);
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
