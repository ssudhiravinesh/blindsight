const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// ── Syndicate Server (our API gateway) ──────────────────────────
// TODO: Update SYNDICATE_SERVER_URL after deploying to Railway/Render
const SYNDICATE_SERVER_URL = 'https://your-server.railway.app/api/v1/analyze';
const SYNDICATE_API_KEY = 'blindsight_key_1';

const MAX_TOS_LENGTH = 30000;

export const SEVERITY_LEVELS = {
    STANDARD: 0,
    NOTABLE: 1,
    CAUTIONARY: 2,
    CRITICAL: 3
};

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
Truly predatory/aggressive terms - RARE, reserve for egregious cases:
- Explicit selling of data to data brokers by name
- Perpetual, irrevocable, worldwide rights to user content
- TOS changes effective immediately with NO notice
- Complete waiver of liability for gross negligence or willful misconduct
- Mandatory arbitration with NO opt-out AND class action waiver
- Government surveillance cooperation beyond legal requirements

## IMPORTANT CALIBRATION NOTES:
1. Most major tech companies (Google, Apple, Facebook, Amazon) would score Tier 1 at worst
2. Reserve Tier 3 for truly predatory terms - it should be RARE
3. Consider CONTEXT: arbitration alone is NOT critical if it has opt-out
4. Consider INDUSTRY NORMS: what's standard in that sector?
5. Consider MITIGATIONS: notice periods, opt-outs, alternatives

## SERVICE CATEGORIES (for alternative suggestions):
Identify what type of service this ToS belongs to. Choose ONE from:
- vpn (VPN/proxy services)
- email (email providers)
- cloud_storage (file storage/sync)
- social_media (social networks)
- messaging (chat/messaging apps)
- video_conferencing (video calls/meetings)
- search (search engines)
- browser (web browsers)
- password_manager (password managers)
- notes (note-taking apps)
- ai_assistant (AI/chatbot services)
- file_sharing (file transfer services)
- unknown (if unclear)

## RESPONSE FORMAT:
Respond ONLY with valid JSON:
{
  "overallSeverity": 0-3,
  "category": "vpn|email|cloud_storage|social_media|messaging|video_conferencing|search|browser|password_manager|notes|ai_assistant|file_sharing|unknown",
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
  ]
}

If terms are standard with no concerns: {"overallSeverity": 0, "category": "...", "serviceName": "...", "summary": "Standard terms...", "clauses": []}`

function truncateText(text) {
    if (text.length <= MAX_TOS_LENGTH) {
        return text;
    }
    return text.substring(0, MAX_TOS_LENGTH) + '\n\n[Text truncated due to length...]';
}

function parseResponse(responseText) {
    let jsonStr = responseText;

    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
    }

    try {
        const parsed = JSON.parse(jsonStr);

        if (typeof parsed.overallSeverity !== 'number') {
            if (typeof parsed.lethal === 'boolean') {
                parsed.overallSeverity = parsed.lethal ? 3 : 0;
            } else {
                parsed.overallSeverity = 0;
            }
        }

        parsed.overallSeverity = Math.max(0, Math.min(3, parsed.overallSeverity));

        if (!Array.isArray(parsed.clauses)) {
            parsed.clauses = [];
        }

        parsed.clauses = parsed.clauses.map(clause => ({
            ...clause,
            severity: typeof clause.severity === 'number' ? Math.max(0, Math.min(3, clause.severity)) : 1
        }));

        parsed.lethal = parsed.overallSeverity >= 3;

        return parsed;
    } catch (error) {
        console.error('Failed to parse OpenAI response:', error);
        console.error('Raw response:', responseText);

        return {
            overallSeverity: 0,
            summary: 'Unable to analyze terms',
            clauses: [],
            parseError: true,
            rawResponse: responseText,
            lethal: false
        };
    }
}

export async function analyzeTOS(apiKey, tosText) {
    if (!apiKey) {
        throw new Error('API key is required');
    }

    if (!tosText || tosText.trim().length === 0) {
        throw new Error('No ToS text provided');
    }

    const text = truncateText(tosText.trim());

    const requestBody = {
        model: 'gpt-4o-mini',
        messages: [
            {
                role: 'system',
                content: SYSTEM_PROMPT
            },
            {
                role: 'user',
                content: `Analyze the following Terms of Service text and classify by severity tier:\n\n---\n${text}\n---`
            }
        ],
        temperature: 0.1,
        max_tokens: 2048,
        response_format: { type: 'json_object' }
    };

    try {
        const response = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));

            if (response.status === 401) {
                throw new Error('Invalid API key. Please check your OpenAI API key in Settings.');
            }

            if (response.status === 429) {
                throw new Error('Rate limit exceeded. Please wait a moment and try again.');
            }

            if (response.status === 402 || response.status === 403) {
                throw new Error('API quota exceeded or access denied. Check your OpenAI billing.');
            }

            if (response.status >= 500 && response.status < 600) {
                throw new Error(`OpenAI server error (${response.status}). This is usually temporary - please try again.`);
            }

            throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
        }

        const data = await response.json();

        const responseText = data.choices?.[0]?.message?.content;

        if (!responseText) {
            throw new Error('Empty response from OpenAI API');
        }

        return parseResponse(responseText);
    } catch (error) {
        if (error.message.includes('API key') || error.message.includes('Rate limit') || error.message.includes('quota')) {
            throw error;
        }

        console.error('OpenAI API error:', error);
        throw new Error(`Failed to analyze ToS: ${error.message}`);
    }
}

/**
 * Analyze ToS via the Syndicate Server (Llama 3.3 70B on Groq).
 * No user API key needed — uses our server-side key.
 */
export async function analyzeTOSviaServer(tosText, sourceUrl) {
    if (!tosText || tosText.trim().length === 0) {
        throw new Error('No ToS text provided');
    }

    const text = truncateText(tosText.trim());

    try {
        const response = await fetch(SYNDICATE_SERVER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': SYNDICATE_API_KEY
            },
            body: JSON.stringify({
                tos_text: text,
                source_url: sourceUrl || null
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));

            if (response.status === 401 || response.status === 403) {
                throw new Error('Syndicate Server auth failed.');
            }
            if (response.status === 429) {
                throw new Error('Server rate limit exceeded. Please wait and try again.');
            }
            throw new Error(errorData.detail || `Server error: ${response.status}`);
        }

        const result = await response.json();

        // Normalize — same post-processing as OpenAI path
        result.overallSeverity = Math.max(0, Math.min(3, result.overallSeverity || 0));
        if (!Array.isArray(result.clauses)) result.clauses = [];
        result.clauses = result.clauses.map(c => ({
            ...c,
            severity: typeof c.severity === 'number' ? Math.max(0, Math.min(3, c.severity)) : 1
        }));
        result.lethal = result.overallSeverity >= 3;

        return result;
    } catch (error) {
        console.error('[Blind-Sight] Syndicate Server error:', error);
        throw new Error(`Syndicate Server: ${error.message}`);
    }
}

export function getSeverityInfo(severity) {
    const levels = {
        0: { name: 'Standard', color: '#22c55e', icon: '✓', badge: 'safe' },
        1: { name: 'Notable', color: '#eab308', icon: '⚠', badge: 'notable' },
        2: { name: 'Cautionary', color: '#f97316', icon: '⚡', badge: 'caution' },
        3: { name: 'Critical', color: '#ef4444', icon: '🚨', badge: 'danger' }
    };
    return levels[severity] || levels[0];
}