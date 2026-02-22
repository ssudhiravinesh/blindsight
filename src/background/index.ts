import { analyzeTOSWithUserKey, analyzeTOSviaServer } from '../lib/openai';
import { getApiKey } from '../lib/storage';
import type { HistoryEntry, ScanResult, SeverityKey } from '../lib/types';

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
        history = history.slice(0, 10);
        await chrome.storage.local.set({ scanHistory: history });
    } catch (error) {
        console.error('[Blind-Sight BG] Failed to save to history:', error);
    }
}

async function getHistory(): Promise<HistoryEntry[]> {
    const data = await chrome.storage.local.get(['scanHistory']);
    return (data.scanHistory as HistoryEntry[]) ?? [];
}

type BadgeStatus = 'safe' | 'notable' | 'caution' | 'danger' | 'scanning' | 'warning' | 'prompt' | 'notos' | 'error' | 'clear';

function setBadge(status: BadgeStatus, tabId?: number): void {
    const config: Record<BadgeStatus, { text: string; color: string }> = {
        safe: { text: '✓', color: '#22c55e' },
        notable: { text: '•', color: '#eab308' },
        caution: { text: '⚠', color: '#f97316' },
        danger: { text: '!', color: '#ef4444' },
        scanning: { text: '...', color: '#6366f1' },
        warning: { text: '?', color: '#f59e0b' },
        prompt: { text: '?', color: '#6366f1' },
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

function getBadgeFromSeverity(severity: SeverityKey): BadgeStatus {
    const badges: Record<SeverityKey, BadgeStatus> = { 0: 'safe', 1: 'notable', 2: 'caution', 3: 'danger' };
    return badges[severity] ?? 'safe';
}

async function handleAnalyzeTOS(
    request: { tosText: string },
    sender: chrome.runtime.MessageSender,
): Promise<ScanResult | { error: string }> {
    const tabId = sender.tab?.id;
    setBadge('scanning', tabId);

    const tosText = request.tosText;
    const startTime = Date.now();

    try {
        if (!tosText || typeof tosText !== 'string') {
            setBadge('error', tabId);
            return { error: 'Invalid or missing ToS text' };
        }
        if (tosText.trim().length === 0) {
            setBadge('notos', tabId);
            return { error: 'No Terms of Service text found to analyze.' };
        }

        let result: ScanResult | null = null;
        let serverError: string | null = null;

        try {
            result = await analyzeTOSviaServer(tosText, sender.tab?.url);
        } catch (error) {
            serverError = (error as Error).message;
            console.warn('[Blind-Sight BG] Syndicate server failed, trying OpenAI fallback:', serverError);
        }

        if (!result) {
            const apiKeyInfo = await getApiKey();
            if (apiKeyInfo) {
                try {
                    result = await analyzeTOSWithUserKey(apiKeyInfo.key, apiKeyInfo.provider, tosText);
                } catch (error) {
                    const fallbackError = (error as Error).message;
                    console.error('[Blind-Sight BG] API key fallback also failed:', fallbackError);
                    setBadge('error', tabId);
                    return { error: `Analysis server unavailable and API fallback failed: ${fallbackError}` };
                }
            } else {
                setBadge('error', tabId);
                return { error: 'Analysis server unavailable and no API key configured.' };
            }
        }

        const severity = result.overallSeverity ?? 0;
        setBadge(getBadgeFromSeverity(severity), tabId);

        if (tabId) chrome.storage.session.set({ [`result_${tabId}`]: result });
        if (sender.tab?.url) await saveToHistory(result, sender.tab.url);

        result.scanDurationMs = Date.now() - startTime;
        return result;
    } catch (error) {
        setBadge('error', tabId);
        return { error: (error as Error).message || 'Failed to analyze Terms of Service' };
    }
}

const UPDATE_CHECK_ALARM = 'tos-update-check';
const SYNDICATE_BASE_URL = 'http://localhost:8000/api/v1/tos';

async function trackTosDomain(domain: string, version: string): Promise<void> {
    const data = await chrome.storage.local.get(['trackedTos']);
    const trackedTos: Record<string, string> = data.trackedTos ?? {};

    trackedTos[domain] = version;
    await chrome.storage.local.set({ trackedTos });

}

async function checkForTosUpdates() {

    try {
        const response = await fetch(`${SYNDICATE_BASE_URL}/updates`);
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

        const latestVersions: Record<string, { version: string, url: string }> = await response.json();
        const data = await chrome.storage.local.get(['trackedTos']);
        const trackedTos: Record<string, string> = data.trackedTos ?? {};

        let updatesFound = 0;

        for (const [domain, localVersion] of Object.entries(trackedTos)) {
            const remoteData = latestVersions[domain];
            if (remoteData && remoteData.version !== localVersion) {

                const fetchResult = await fetchTosContent(remoteData.url);
                if (fetchResult.success && fetchResult.text) {
                    try {
                        const scanResult = await analyzeTOSviaServer(fetchResult.text, domain);
                        const severity = scanResult.overallSeverity ?? 0;

                        let title = 'Terms of Service Update';
                        let message = `The Terms of Service for ${domain} have changed.`;

                        if (severity >= 2) {
                            title = '⚠️ Critical ToS Update';
                            message = `${domain} has added concerning new terms to their agreement!`;
                        } else {
                            title = 'ℹ️ Minor ToS Update';
                            message = `${domain} updated their terms. No major red flags detected.`;
                        }

                        chrome.notifications.create({
                            type: 'basic',
                            iconUrl: chrome.runtime.getURL('src/assets/icon-128.png'),
                            title,
                            message,
                            priority: severity >= 2 ? 2 : 0
                        });

                        trackedTos[domain] = remoteData.version;
                        updatesFound++;
                    } catch (err) {
                        console.error(`[Blind-Sight BG] Failed to analyze updated ToS for ${domain}:`, err);
                    }
                } else {
                    console.error(`[Blind-Sight BG] Failed to fetch ToS content from ${remoteData.url}:`, fetchResult.error);
                }
            }
        }

        if (updatesFound > 0) {
            await chrome.storage.local.set({ trackedTos });
        }

    } catch (error) {
        console.error('[Blind-Sight BG] Failed to check for ToS updates:', error);
    }
}

chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create(UPDATE_CHECK_ALARM, { periodInMinutes: 5 });
    checkForTosUpdates();

    // Create context menu
    chrome.contextMenus.create({
        id: 'scan-tos-page',
        title: 'Scan this page with Blind-Sight',
        contexts: ['page']
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'scan-tos-page' && tab?.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'MANUAL_SCAN' });
    }
});

chrome.commands.onCommand.addListener((command, tab) => {
    if (command === 'scan-current-page' && tab?.id) {
        // Synchronous call is required in MV3 to preserve the user gesture token
        const openPromise = tab.windowId
            ? chrome.action.openPopup({ windowId: tab.windowId })
            : chrome.action.openPopup();

        // Set state asynchronously in background
        chrome.storage.session.set({ autoScan: true }).catch(console.error);

        openPromise.catch((err) => {
            console.warn('[Blind-Sight BG] Failed to open popup, falling back to background scan:', err);
            chrome.tabs.sendMessage(tab.id as number, { type: 'MANUAL_SCAN' });
        });
    }
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === UPDATE_CHECK_ALARM) {
        checkForTosUpdates();
    }
});

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

        case 'TRACK_TOS_AGREEMENT':
            if (request.domain) {
                fetch(`${SYNDICATE_BASE_URL}/version?domain=${encodeURIComponent(request.domain)}`)
                    .then((res) => res.json())
                    .then((data) => {
                        if (data.version) {
                            trackTosDomain(request.domain, data.version);
                        }
                    })
                    .catch((err) => console.error('[Blind-Sight BG] Failed to fetch current ToS version:', err));

                sendResponse({ success: true, tracking: true });
                return false;
            }
            return false;

        case 'TRACK_TOS':
            if (request.domain && request.version) {
                trackTosDomain(request.domain, request.version)
                    .then(() => sendResponse({ success: true }))
                    .catch((error) => sendResponse({ success: false, error: (error as Error).message }));
                return true;
            }
            return false;

        case 'TEST_ALARM':
            checkForTosUpdates();
            sendResponse({ success: true });
            return false;

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

if (import.meta.env?.MODE === 'development') {
    (globalThis as any).testUpdateCheck = () => {
        console.log('[Blind-Sight BG] Manually triggering ToS update check...');
        checkForTosUpdates();
    };
}
