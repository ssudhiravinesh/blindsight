/**
 * Blind-Sight Background Service Worker
 * Handles message passing and OpenAI API communication
 */

import { analyzeTOS } from '../lib/openai.js';

/**
 * Get API key from storage
 * @returns {Promise<string|null>}
 */
async function getApiKey() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['openaiApiKey'], (result) => {
            resolve(result.openaiApiKey || null);
        });
    });
}

/**
 * Set extension badge
 * @param {'safe' | 'danger' | 'scanning' | 'warning' | 'clear'} status 
 * @param {number} tabId - Optional tab ID for tab-specific badge
 */
function setBadge(status, tabId = null) {
    const config = {
        safe: { text: '✓', color: '#22c55e' },       // Green - Standard
        notable: { text: '•', color: '#eab308' },    // Yellow - Notable
        caution: { text: '⚠', color: '#f97316' },    // Orange - Cautionary
        danger: { text: '!', color: '#ef4444' },     // Red - Critical
        scanning: { text: '...', color: '#6366f1' },
        warning: { text: '?', color: '#f59e0b' },
        notos: { text: '—', color: '#9ca3af' },
        error: { text: '✕', color: '#ef4444' },
        clear: { text: '', color: '#6366f1' }
    };

    const { text, color } = config[status] || config.clear;

    const badgeOptions = tabId ? { text, tabId } : { text };
    const colorOptions = tabId ? { color, tabId } : { color };

    chrome.action.setBadgeText(badgeOptions);
    chrome.action.setBadgeBackgroundColor(colorOptions);
}

/**
 * Extract text content from HTML
 * @param {string} html 
 * @returns {string}
 */
function extractTextFromHTML(html) {
    // Simple regex-based text extraction (service worker doesn't have DOMParser)
    let text = html
        // Remove scripts and styles
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        // Remove HTML tags
        .replace(/<[^>]+>/g, ' ')
        // Decode HTML entities
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        // Clean up whitespace
        .replace(/\s+/g, ' ')
        .trim();

    return text;
}

/**
 * Fetch ToS content from URL (for CORS workaround)
 * @param {string} url 
 * @returns {Promise<Object>}
 */
async function fetchTosContent(url) {
    try {
        console.log('[Blind-Sight BG] Fetching ToS from:', url);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const html = await response.text();
        const text = extractTextFromHTML(html);

        console.log('[Blind-Sight BG] Extracted text length:', text.length);

        return {
            success: true,
            url,
            text,
            charCount: text.length
        };
    } catch (error) {
        console.error('[Blind-Sight BG] Fetch error:', error);
        return {
            success: false,
            error: error.message,
            url
        };
    }
}

/**
 * Get badge type from severity level
 * @param {number} severity 
 * @returns {string}
 */
function getBadgeFromSeverity(severity) {
    const badges = {
        0: 'safe',      // Green - Standard
        1: 'notable',   // Yellow - Notable
        2: 'caution',   // Orange - Cautionary
        3: 'danger'     // Red - Critical
    };
    return badges[severity] || 'safe';
}

/**
 * Handle ANALYZE_TOS message
 * @param {Object} request 
 * @param {chrome.runtime.MessageSender} sender 
 * @returns {Promise<Object>}
 */
async function handleAnalyzeTOS(request, sender) {
    const apiKey = await getApiKey();

    if (!apiKey) {
        return { error: 'OpenAI API key not configured. Please add your API key in Settings.' };
    }

    const tabId = sender.tab?.id;
    setBadge('scanning', tabId);

    try {
        const tosText = request.tosText;

        if (!tosText || tosText.trim().length === 0) {
            setBadge('notos', tabId);
            return { error: 'No Terms of Service text found to analyze.' };
        }

        console.log(`[Blind-Sight BG] ========================================`);
        console.log(`[Blind-Sight BG] 🔑 USING: OpenAI (gpt-4o-mini)`);
        console.log(`[Blind-Sight BG] 📝 ToS text length: ${tosText.length} characters`);
        console.log(`[Blind-Sight BG] ========================================`);

        const result = await analyzeTOS(apiKey, tosText);

        // Set badge based on severity level
        const severity = result.overallSeverity || 0;
        const badgeType = getBadgeFromSeverity(severity);
        setBadge(badgeType, tabId);

        console.log(`[Blind-Sight BG] Analysis complete: Severity ${severity} (${badgeType})`);
        if (result.summary) {
            console.log(`[Blind-Sight BG] Summary: ${result.summary}`);
        }

        // Store result for this tab
        if (tabId) {
            chrome.storage.session.set({ [`result_${tabId}`]: result });
        }

        return result;
    } catch (error) {
        console.error('[Blind-Sight BG] Analysis error:', error);
        setBadge('error', tabId);
        return { error: error.message || 'Failed to analyze Terms of Service' };
    }
}

/**
 * Handle GET_LAST_RESULT message
 * @param {chrome.runtime.MessageSender} sender 
 * @returns {Promise<Object|null>}
 */
async function getLastResult(sender) {
    const tabId = sender.tab?.id;
    if (!tabId) return null;

    return new Promise((resolve) => {
        chrome.storage.session.get([`result_${tabId}`], (result) => {
            resolve(result[`result_${tabId}`] || null);
        });
    });
}

/**
 * Message listener
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[Blind-Sight BG] Received message:', request.type);

    switch (request.type) {
        case 'ANALYZE_TOS':
            handleAnalyzeTOS(request, sender)
                .then(result => sendResponse(result))
                .catch(error => sendResponse({ error: error.message }));
            return true;

        case 'FETCH_TOS':
            fetchTosContent(request.url)
                .then(result => sendResponse(result))
                .catch(error => sendResponse({ success: false, error: error.message }));
            return true;

        case 'GET_LAST_RESULT':
            getLastResult(sender)
                .then(result => sendResponse(result))
                .catch(() => sendResponse(null));
            return true;

        case 'PAGE_DETECTED':
            console.log('[Blind-Sight BG] Signup page detected:', request.url);
            if (request.isSignup && sender.tab?.id) {
                chrome.storage.session.set({ [`detected_${sender.tab.id}`]: true });
            }
            return false;

        case 'AUTO_SCAN_COMPLETE':
            console.log('[Blind-Sight BG] Auto-scan complete:', request.result);
            return false;

        default:
            console.log('[Blind-Sight BG] Unknown message type:', request.type);
            return false;
    }
});

// Clean up session storage when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
    chrome.storage.session.remove([`result_${tabId}`, `detected_${tabId}`]);
});

console.log('[Blind-Sight] Service worker initialized');
