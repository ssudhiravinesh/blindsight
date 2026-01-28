/**
 * OpenAI API Wrapper for Blind-Sight
 * Handles ToS analysis using OpenAI's GPT API with tiered severity classification
 */

// OpenAI API endpoint
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Maximum ToS text length (to avoid token limits)
const MAX_TOS_LENGTH = 30000;

/**
 * Severity levels for clause classification
 */
export const SEVERITY_LEVELS = {
    STANDARD: 0,    // Green - Normal, industry-standard terms
    NOTABLE: 1,     // Yellow - Worth knowing, but common practice
    CAUTIONARY: 2,  // Orange - Unusual terms, user should be aware
    CRITICAL: 3     // Red - Aggressive/predatory terms
};

/**
 * The system prompt for ToS analysis with tiered severity
 */
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

If terms are standard with no concerns: {"overallSeverity": 0, "category": "...", "serviceName": "...", "summary": "Standard terms...", "clauses": []}`;

/**
 * Truncate ToS text if it exceeds the maximum length
 * @param {string} text 
 * @returns {string}
 */
function truncateText(text) {
    if (text.length <= MAX_TOS_LENGTH) {
        return text;
    }
    return text.substring(0, MAX_TOS_LENGTH) + '\n\n[Text truncated due to length...]';
}

/**
 * Clean and parse the OpenAI response
 * @param {string} responseText 
 * @returns {Object}
 */
function parseResponse(responseText) {
    let jsonStr = responseText;

    // Remove markdown code blocks if present
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
    }

    try {
        const parsed = JSON.parse(jsonStr);

        // Validate response structure
        if (typeof parsed.overallSeverity !== 'number') {
            // Fallback: try to infer from old format
            if (typeof parsed.lethal === 'boolean') {
                parsed.overallSeverity = parsed.lethal ? 3 : 0;
            } else {
                parsed.overallSeverity = 0;
            }
        }

        // Ensure overallSeverity is in valid range
        parsed.overallSeverity = Math.max(0, Math.min(3, parsed.overallSeverity));

        if (!Array.isArray(parsed.clauses)) {
            parsed.clauses = [];
        }

        // Ensure each clause has severity
        parsed.clauses = parsed.clauses.map(clause => ({
            ...clause,
            severity: typeof clause.severity === 'number' ? Math.max(0, Math.min(3, clause.severity)) : 1
        }));

        // Add backward compatibility field
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

/**
 * Analyze Terms of Service text using OpenAI API
 * @param {string} apiKey - OpenAI API key
 * @param {string} tosText - Terms of Service text to analyze
 * @returns {Promise<Object>} Analysis result with tiered severity
 */
export async function analyzeTOS(apiKey, tosText) {
    if (!apiKey) {
        throw new Error('API key is required');
    }

    if (!tosText || tosText.trim().length === 0) {
        throw new Error('No ToS text provided');
    }

    // Truncate if necessary
    const text = truncateText(tosText.trim());

    // Build request body
    const requestBody = {
        model: 'gpt-4o-mini', // Cost-effective and fast
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
        temperature: 0.1, // Low temperature for consistent responses
        max_tokens: 2048,
        response_format: { type: 'json_object' } // Ensure JSON response
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

            // Server errors - OpenAI is having issues
            if (response.status >= 500 && response.status < 600) {
                throw new Error(`OpenAI server error (${response.status}). This is usually temporary - please try again.`);
            }

            throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
        }

        const data = await response.json();

        // Extract the text from OpenAI's response structure
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
 * Get severity level name and color
 * @param {number} severity 
 * @returns {Object}
 */
export function getSeverityInfo(severity) {
    const levels = {
        0: { name: 'Standard', color: '#22c55e', icon: '✓', badge: 'safe' },
        1: { name: 'Notable', color: '#eab308', icon: '⚠', badge: 'notable' },
        2: { name: 'Cautionary', color: '#f97316', icon: '⚡', badge: 'caution' },
        3: { name: 'Critical', color: '#ef4444', icon: '🚨', badge: 'danger' }
    };
    return levels[severity] || levels[0];
}
