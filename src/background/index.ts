import { analyzeTOS, analyzeTOSviaServer } from '../lib/openai';
import { getApiKey } from '../lib/storage';
import type { HistoryEntry, ScanResult, SeverityKey } from '../lib/types';

// ─── History ────────────────────────────────────────────
async function saveToHistory(result: ScanResult, url: string): Promise<void> {
    try {
        const hostname = new URL(url).hostname.replace('www.', '');
        const entry: HistoryEntry = {
            id: Date.now(),
            hostname,
            url,
            timestamp: Date.now(),
            severity: result.overallSeverity ?? 0,
            summary: result.summary ?? 'No summary available',
            clauseCount: result.clauses?.length ?? 0,
            category: result.category ?? 'unknown',
            serviceName: result.serviceName ?? hostname,
        };

        const data = await chrome.storage.local.get(['scanHistory']);
        let history: HistoryEntry[] = data.scanHistory ?? [];
        history.unshift(entry);
        history = history.slice(0, 3);
        await chrome.storage.local.set({ scanHistory: history });
    } catch (error) {
        console.error('[Blind-Sight BG] Failed to save to history:', error);
    }
}

async function getHistory(): Promise<HistoryEntry[]> {
    const data = await chrome.storage.local.get(['scanHistory']);
    return (data.scanHistory as HistoryEntry[]) ?? [];
}

// ─── Badge ──────────────────────────────────────────────
type BadgeStatus = 'safe' | 'notable' | 'caution' | 'danger' | 'scanning' | 'warning' | 'notos' | 'error' | 'clear';

function setBadge(status: BadgeStatus, tabId?: number): void {
    const config: Record<BadgeStatus, { text: string; color: string }> = {
        safe: { text: '✓', color: '#22c55e' },
        notable: { text: '•', color: '#eab308' },
        caution: { text: '⚠', color: '#f97316' },
        danger: { text: '!', color: '#ef4444' },
        scanning: { text: '...', color: '#6366f1' },
        warning: { text: '?', color: '#f59e0b' },
        notos: { text: '—', color: '#9ca3af' },
        error: { text: '✕', color: '#ef4444' },
        clear: { text: '', color: '#6366f1' },
    };

    const { text, color } = config[status] ?? config.clear;
    const badgeOptions = tabId ? { text, tabId } : { text };
    const colorOptions = tabId ? { color, tabId } : { color };

    chrome.action.setBadgeText(badgeOptions);
    chrome.action.setBadgeBackgroundColor(colorOptions);
}

// ─── HTML → Text ────────────────────────────────────────
function extractTextFromHTML(html: string): string {
    return html
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
}

// ─── FETCH ToS ──────────────────────────────────────────
interface FetchTosResult {
    success: boolean;
    url: string;
    text?: string;
    charCount?: number;
    error?: string;
}

async function fetchTosContent(url: string): Promise<FetchTosResult> {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const html = await response.text();
        const text = extractTextFromHTML(html);
        return { success: true, url, text, charCount: text.length };
    } catch (error) {
        return { success: false, error: (error as Error).message, url };
    }
}

// ─── Severity → Badge ───────────────────────────────────
function getBadgeFromSeverity(severity: SeverityKey): BadgeStatus {
    const badges: Record<SeverityKey, BadgeStatus> = { 0: 'safe', 1: 'notable', 2: 'caution', 3: 'danger' };
    return badges[severity] ?? 'safe';
}

// ─── ANALYZE handler ────────────────────────────────────
async function handleAnalyzeTOS(
    request: { tosText: string },
    sender: chrome.runtime.MessageSender,
): Promise<ScanResult | { error: string }> {
    const tabId = sender.tab?.id;
    setBadge('scanning', tabId);

    try {
        const tosText = request.tosText;
        if (!tosText || tosText.trim().length === 0) {
            setBadge('notos', tabId);
            return { error: 'No Terms of Service text found to analyze.' };
        }

        // Strategy: server-first, OpenAI-fallback
        let result: ScanResult | null = null;
        let serverError: string | null = null;

        // 1. Try Syndicate Server first
        try {
            result = await analyzeTOSviaServer(tosText, sender.tab?.url);
        } catch (error) {
            serverError = (error as Error).message;
            console.warn('[Blind-Sight BG] Syndicate server failed, trying OpenAI fallback:', serverError);
        }

        // 2. Fallback to OpenAI if server failed
        if (!result) {
            const apiKey = await getApiKey();
            if (apiKey) {
                try {
                    result = await analyzeTOS(apiKey, tosText);
                } catch (error) {
                    const openaiError = (error as Error).message;
                    console.error('[Blind-Sight BG] OpenAI fallback also failed:', openaiError);
                    setBadge('error', tabId);
                    return { error: `Analysis server unavailable and OpenAI fallback failed: ${openaiError}` };
                }
            } else {
                // No API key configured and server failed
                setBadge('error', tabId);
                return { error: 'Analysis server unavailable and no OpenAI API key configured.' };
            }
        }

        const severity = result.overallSeverity ?? 0;
        setBadge(getBadgeFromSeverity(severity), tabId);

        if (tabId) chrome.storage.session.set({ [`result_${tabId}`]: result });
        if (sender.tab?.url) await saveToHistory(result, sender.tab.url);

        return result;
    } catch (error) {
        setBadge('error', tabId);
        return { error: (error as Error).message || 'Failed to analyze Terms of Service' };
    }
}

// ─── Message Router ─────────────────────────────────────
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.type) {
        case 'ANALYZE_TOS':
            handleAnalyzeTOS(request, sender)
                .then((result) => sendResponse(result))
                .catch((error) => sendResponse({ error: (error as Error).message }));
            return true;

        case 'FETCH_TOS':
            fetchTosContent(request.url)
                .then((result) => sendResponse(result))
                .catch((error) => sendResponse({ success: false, error: (error as Error).message }));
            return true;

        case 'GET_LAST_RESULT': {
            const tabId = sender.tab?.id;
            if (!tabId) { sendResponse(null); return false; }
            chrome.storage.session.get([`result_${tabId}`], (result) => {
                sendResponse(result[`result_${tabId}`] ?? null);
            });
            return true;
        }

        case 'PAGE_DETECTED':
            if (request.isSignup && sender.tab?.id) {
                chrome.storage.session.set({ [`detected_${sender.tab.id}`]: true });
            }
            return false;

        case 'AUTO_SCAN_COMPLETE':
            return false;

        case 'GET_HISTORY':
            getHistory()
                .then((history) => sendResponse(history))
                .catch(() => sendResponse([]));
            return true;

        default:
            return false;
    }
});

chrome.tabs.onRemoved.addListener((tabId) => {
    chrome.storage.session.remove([`result_${tabId}`, `detected_${tabId}`]);
});
