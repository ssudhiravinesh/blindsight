/**
 * Copyright (c) 2026 Sudhir Avinesh. All rights reserved.
 * Proprietary and Confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 */

import * as Sentry from '@sentry/browser';
import {
    analyzeTOSWithUserKey,
    analyzeOnServer,
    ApiError,
    fetchNotifications,
    getApiKey,
    normalizeToS,
    hashToS,
    htmlToText,
    isAllowedTosFetchUrl,
    getCachedScanResult,
    registerDevice,
    setCachedScanResult,
    severityToGrade,
    trackService,
} from '@blindsight/core';
import type { DeviceCredentials, HistoryEntry, ScanResult, SeverityKey } from '@blindsight/core';

const DEVICE_STORAGE_KEY = 'deviceCredentials';
let registrationInFlight: Promise<DeviceCredentials> | null = null;

async function getDeviceCredentials(forceNew = false): Promise<DeviceCredentials> {
    if (!forceNew) {
        const data = await chrome.storage.local.get([DEVICE_STORAGE_KEY]);
        const stored = data[DEVICE_STORAGE_KEY] as DeviceCredentials | undefined;
        if (stored?.deviceId && stored?.deviceSecret) return stored;
    }
    // Deduplicate concurrent registrations (several tabs scanning at once).
    registrationInFlight ??= registerDevice()
        .then(async (creds) => {
            await chrome.storage.local.set({ [DEVICE_STORAGE_KEY]: creds });
            await chrome.storage.local.remove(['device_id', 'user_tier']); // legacy keys
            return creds;
        })
        .finally(() => { registrationInFlight = null; });
    return registrationInFlight;
}

/** Runs an authenticated call, re-registering once if the server rejects stale credentials. */
async function withDevice<T>(fn: (creds: DeviceCredentials) => Promise<T>): Promise<T> {
    try {
        return await fn(await getDeviceCredentials());
    } catch (err) {
        if (err instanceof ApiError && err.code === 'UNAUTHORIZED') {
            return fn(await getDeviceCredentials(true));
        }
        throw err;
    }
}

// Error reporting is opt-in at build time (VITE_SENTRY_DSN) and never sends
// page URLs, query strings or request bodies.
// @ts-ignore -- provided by Vite
const SENTRY_DSN: string | undefined = import.meta.env?.VITE_SENTRY_DSN;
function scrubUrl(url?: string): string | undefined {
    if (!url) return url;
    try { return new URL(url).origin; } catch { return undefined; }
}
if (SENTRY_DSN) {
    Sentry.init({
        dsn: SENTRY_DSN,
        tracesSampleRate: 0.05,
        sendDefaultPii: false,
        beforeSend(event) {
            if (event.request) {
                event.request.url = scrubUrl(event.request.url);
                delete event.request.query_string;
                delete event.request.data;
                delete event.request.cookies;
            }
            return event;
        },
        beforeBreadcrumb(crumb) {
            if (crumb.data?.url) crumb.data.url = scrubUrl(crumb.data.url as string);
            return crumb;
        },
    });
}

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


interface FetchTosResult {
    success: boolean;
    url: string;
    text?: string;
    charCount?: number;
    error?: string;
}

const MAX_TOS_FETCH_BYTES = 2 * 1024 * 1024;

/**
 * Fetches a ToS page on behalf of a content script. The URL comes from the web
 * page, so it is treated as attacker-controlled: SSRF guard, no cookies, the
 * final post-redirect URL is re-checked, and the body is size/type-bounded.
 */
async function fetchTosContent(url: string, senderTabUrl?: string): Promise<FetchTosResult> {
    if (typeof url !== 'string' || !isAllowedTosFetchUrl(url, senderTabUrl)) {
        return { success: false, error: 'URL is not allowed by the security policy', url: String(url) };
    }
    try {
        const response = await fetch(url, {
            method: 'GET',
            credentials: 'omit',
            referrerPolicy: 'no-referrer',
            signal: AbortSignal.timeout(15_000),
            headers: { Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9' },
        });

        if (!isAllowedTosFetchUrl(response.url || url, senderTabUrl)) {
            return { success: false, error: 'Redirect target is not allowed by the security policy', url };
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const type = (response.headers.get('Content-Type') ?? '').split(';')[0].trim().toLowerCase();
        if (type && !['text/html', 'application/xhtml+xml', 'text/plain'].includes(type)) {
            throw new Error(`Unexpected content type ${type}`);
        }
        const html = await response.text();
        if (html.length > MAX_TOS_FETCH_BYTES) throw new Error('Document too large');

        const text = htmlToText(html);
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

        // 1. Local Cache Lookup
        const normalized = normalizeToS(tosText);
        const hash = await hashToS(normalized);
        const cached = await getCachedScanResult(hash);
        if (cached) {
            console.log('[Blind-Sight BG] Local LRU Cache Hit!');
            const severity = cached.overallSeverity ?? 0;
            setBadge(getBadgeFromSeverity(severity), tabId);
            if (tabId) chrome.storage.session.set({ [`result_${tabId}`]: cached });
            if (sender.tab?.url) await saveToHistory(cached, sender.tab.url);
            cached.scanDurationMs = Date.now() - startTime;
            return cached;
        }

        // 2. Analyze via the Blind-Sight backend (device-authenticated)
        let result: ScanResult | null = null;
        let serverError: string | null = null;

        try {
            result = await withDevice((creds) => analyzeOnServer(creds, tosText, sender.tab?.url));
        } catch (error) {
            serverError = (error as Error).message;
            if (error instanceof ApiError && error.code === 'RATE_LIMITED') {
                setBadge('error', tabId);
                return { error: 'RATE_LIMITED' };
            }
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

        // 3. Cache result locally
        await setCachedScanResult(hash, result);

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
// The server crawls tracked services nightly; polling a few times a day is enough.
const UPDATE_CHECK_PERIOD_MINUTES = 360;

/**
 * Pulls ToS-change notifications produced by the server-side crawler
 * (monitor-tos-changes) for services this device tracks.
 */
async function checkForTosUpdates(): Promise<void> {
    try {
        const data = await chrome.storage.local.get([DEVICE_STORAGE_KEY]);
        if (!data[DEVICE_STORAGE_KEY]) return; // nothing tracked yet

        const notifications = await withDevice(fetchNotifications);
        for (const n of notifications) {
            const service = n.service_name || n.domain;
            const newSeverity = (n.new_severity ?? 0) as SeverityKey;
            const escalated = n.old_severity !== null && newSeverity > (n.old_severity ?? 0);

            chrome.notifications.create(`tos-update-${n.id}`, {
                type: 'basic',
                iconUrl: chrome.runtime.getURL('src/assets/icon-128.png'),
                title: newSeverity >= 2 ? `⚠️ ${service} changed its terms` : `ℹ️ ${service} updated its terms`,
                message: escalated
                    ? `Grade ${severityToGrade((n.old_severity ?? 0) as SeverityKey)} → ${severityToGrade(newSeverity)}. ${n.change_summary ?? ''}`.trim()
                    : n.change_summary ?? 'Terms of Service updated.',
                priority: newSeverity >= 2 ? 2 : 0,
            });
        }
    } catch (error) {
        console.error('[Blind-Sight BG] Failed to check for ToS updates:', (error as Error).message);
    }
}

chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create(UPDATE_CHECK_ALARM, { periodInMinutes: UPDATE_CHECK_PERIOD_MINUTES });

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
    // Only accept messages from this extension's own pages and content scripts.
    if (sender.id !== chrome.runtime.id || !request || typeof request.type !== 'string') return false;
    switch (request.type) {
        case 'ANALYZE_TOS':
            handleAnalyzeTOS(request, sender)
                .then((result) => sendResponse(result))
                .catch((error) => sendResponse({ error: (error as Error).message }));
            return true;

        case 'FETCH_TOS':
            fetchTosContent(request.url, sender.tab?.url)
                .then((result) => sendResponse(result))
                .catch((error) => sendResponse({ success: false, error: (error as Error).message }));
            return true;

        case 'TRACK_TOS_AGREEMENT': {
            // The user accepted this service's terms: ask the server to watch them.
            const domain = typeof request.domain === 'string' ? request.domain : '';
            const tosUrl = typeof request.tosUrl === 'string' ? request.tosUrl : undefined;
            if (!domain) return false;
            withDevice((creds) => trackService(creds, domain, tosUrl))
                .catch((err) => console.error('[Blind-Sight BG] Failed to track service:', (err as Error).message));
            sendResponse({ success: true, tracking: true });
            return false;
        }

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
