import { analyzeTOS, analyzeTOSviaServer } from '../lib/openai.js';
import { isPdfUrl, isPdfContentType, fetchAndExtractPdf, extractTextFromPdf } from '../lib/pdf-parser.js';

async function getApiKey() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['openaiApiKey'], (result) => {
            resolve(result.openaiApiKey || null);
        });
    });
}

async function saveToHistory(result, url) {
    try {
        const hostname = new URL(url).hostname.replace('www.', '');
        const historyEntry = {
            id: Date.now(),
            hostname,
            url,
            timestamp: Date.now(),
            severity: result.overallSeverity || 0,
            summary: result.summary || 'No summary available',
            clauseCount: result.clauses?.length || 0,
            category: result.category || 'unknown',
            serviceName: result.serviceName || hostname
        };

        const data = await chrome.storage.local.get(['scanHistory']);
        let history = data.scanHistory || [];

        history.unshift(historyEntry);
        history = history.slice(0, 3);

        await chrome.storage.local.set({ scanHistory: history });
    } catch (error) {
        console.error('[Blind-Sight BG] Failed to save to history:', error);
    }
}

async function getHistory() {
    const data = await chrome.storage.local.get(['scanHistory']);
    return data.scanHistory || [];
}

function setBadge(status, tabId = null) {
    const config = {
        safe: { text: '✓', color: '#22c55e' },
        notable: { text: '•', color: '#eab308' },
        caution: { text: '⚠', color: '#f97316' },
        danger: { text: '!', color: '#ef4444' },
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

function extractTextFromHTML(html) {
    let text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();

    return text;
}

async function fetchTosContent(url) {
    try {
        // Check if URL looks like a PDF before fetching
        if (isPdfUrl(url)) {
            return await fetchAndExtractPdf(url);
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        // Check Content-Type header - might be a PDF even without .pdf extension
        const contentType = response.headers.get('Content-Type') || '';
        if (isPdfContentType(contentType)) {
            const arrayBuffer = await response.arrayBuffer();
            const pdfResult = await extractTextFromPdf(arrayBuffer);
            return { ...pdfResult, url };
        }

        const html = await response.text();
        const text = extractTextFromHTML(html);

        return {
            success: true,
            url,
            text,
            charCount: text.length
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            url
        };
    }
}

function getBadgeFromSeverity(severity) {
    const badges = {
        0: 'safe',
        1: 'notable',
        2: 'caution',
        3: 'danger'
    };
    return badges[severity] || 'safe';
}

async function handleAnalyzeTOS(request, sender) {
    const tabId = sender.tab?.id;
    setBadge('scanning', tabId);

    try {
        const tosText = request.tosText;

        if (!tosText || tosText.trim().length === 0) {
            setBadge('notos', tabId);
            return { error: 'No Terms of Service text found to analyze.' };
        }

        let result;
        const sourceUrl = sender.tab?.url || null;
        const apiKey = await getApiKey();

        if (apiKey) {
            // User has a BYOK key — use it as primary
            try {
                result = await analyzeTOS(apiKey, tosText);
                console.log('[Blind-Sight BG] Analysis via user API key succeeded.');
            } catch (keyError) {
                console.warn('[Blind-Sight BG] User API key failed:', keyError.message);
                // Do NOT silently fall back to our paid server.
                // Surface the error so the user knows their key failed.
                throw new Error(`Your API key failed: ${keyError.message}. You can remove your key in Settings to use Blind-Sight's built-in server instead.`);
            }
        } else {
            // No user key — use Syndicate Server (default, free for user)
            try {
                result = await analyzeTOSviaServer(tosText, sourceUrl);
                console.log('[Blind-Sight BG] Analysis via Syndicate Server succeeded.');
            } catch (serverError) {
                console.error('[Blind-Sight BG] Syndicate Server failed:', serverError.message);
                throw new Error('Analysis server is temporarily unavailable. Please try again later, or add your own OpenAI API key in Settings.');
            }
        }

        const severity = result.overallSeverity || 0;
        const badgeType = getBadgeFromSeverity(severity);
        setBadge(badgeType, tabId);

        if (tabId) {
            chrome.storage.session.set({ [`result_${tabId}`]: result });
        }

        if (sender.tab?.url) {
            await saveToHistory(result, sender.tab.url);
        }

        return result;
    } catch (error) {
        setBadge('error', tabId);
        return { error: error.message || 'Failed to analyze Terms of Service' };
    }
}

async function getLastResult(sender) {
    const tabId = sender.tab?.id;
    if (!tabId) return null;

    return new Promise((resolve) => {
        chrome.storage.session.get([`result_${tabId}`], (result) => {
            resolve(result[`result_${tabId}`] || null);
        });
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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

        case 'FETCH_PDF_TOS':
            fetchAndExtractPdf(request.url)
                .then(result => sendResponse(result))
                .catch(error => sendResponse({ success: false, error: error.message }));
            return true;

        case 'GET_LAST_RESULT':
            getLastResult(sender)
                .then(result => sendResponse(result))
                .catch(() => sendResponse(null));
            return true;

        case 'PAGE_DETECTED':
            if (request.isSignup && sender.tab?.id) {
                chrome.storage.session.set({ [`detected_${sender.tab.id}`]: true });
            }
            return false;

        case 'AUTO_SCAN_COMPLETE':
            return false;

        case 'GET_HISTORY':
            getHistory()
                .then(history => sendResponse(history))
                .catch(() => sendResponse([]));
            return true;

        default:
            return false;
    }
});

chrome.tabs.onRemoved.addListener((tabId) => {
    chrome.storage.session.remove([`result_${tabId}`, `detected_${tabId}`]);
});
