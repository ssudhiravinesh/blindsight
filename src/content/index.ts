/**
 * Blind-Sight Content Script — Main Orchestrator
 * Detects signup pages, extracts ToS, and triggers analysis.
 */
import { getSignupDetectionResult, isSignupPage } from './detector';
import { extractTosText, findTosLinks, getTosLinkForBackgroundFetch } from './extractor';
import { showWarningModal, isModalVisible, attachAgreementListeners, showPreScanPrompt, showScanResultCard, showScanningBanner, hideScanningBanner, showScanErrorCard } from './blocker';
import type { ScanResult, ScanResponse, SeverityKey } from '../lib/types';

// ─── State ──────────────────────────────────────────────
let lastScanResult: ScanResponse | null = null;
let scanInProgress = false;
const SIGNUP_THRESHOLD = 50;
const AUTO_SCAN_DELAY = 1500;

// ─── Chrome messaging (generic) ─────────────────────────
function sendMessage<T>(message: Record<string, unknown>): Promise<T> {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
            } else {
                resolve(response as T);
            }
        });
    });
}

// ─── Background fetch helper ────────────────────────────
interface FetchTosResult {
    success: boolean;
    url: string;
    text?: string;
    charCount?: number;
    error?: string;
}

async function fetchTosViaBackground(url: string): Promise<FetchTosResult> {
    return sendMessage<FetchTosResult>({ type: 'FETCH_TOS', url });
}

async function analyzeTosViaBackground(tosText: string): Promise<ScanResponse> {
    return sendMessage<ScanResponse>({ type: 'ANALYZE_TOS', tosText });
}

// ─── Perform Scan ───────────────────────────────────────
async function performScan(): Promise<ScanResponse> {
    if (scanInProgress) {
        return { error: 'Scan already in progress' };
    }

    scanInProgress = true;

    try {
        // Step 1: Try extracting from the page directly
        const extraction = await extractTosText();

        if (extraction.success) {
            const result = await analyzeTosViaBackground(extraction.text);
            lastScanResult = result;
            return result;
        }

        // Step 2: If extraction says we need a background fetch, try it
        if (extraction.needsBackgroundFetch && extraction.url) {
            const fetchResult = await fetchTosViaBackground(extraction.url);

            if (fetchResult.success && fetchResult.text && fetchResult.text.length > 200) {
                const result = await analyzeTosViaBackground(fetchResult.text);
                lastScanResult = result;
                return result;
            }
        }

        // Step 3: Try ALL discovered links via background fetch
        const allLinks = extraction.allLinks ?? findTosLinks();
        for (const link of allLinks) {
            if (link.url === extraction.url) continue; // already tried this one

            try {
                const fetchResult = await fetchTosViaBackground(link.url);
                if (fetchResult.success && fetchResult.text && fetchResult.text.length > 200) {
                    const result = await analyzeTosViaBackground(fetchResult.text);
                    lastScanResult = result;
                    return result;
                }
            } catch {
                // try next link
            }
        }

        return { error: extraction.error ?? 'Could not extract Terms of Service' };
    } catch (error) {
        return { error: (error as Error).message || 'Scan failed' };
    } finally {
        scanInProgress = false;
    }
}

// ─── Prompt-first scan ──────────────────────────────────
async function promptAndScanIfSignup(): Promise<void> {
    const detection = getSignupDetectionResult(SIGNUP_THRESHOLD);

    chrome.runtime.sendMessage({
        type: 'PAGE_DETECTED',
        isSignup: detection.isSignup ?? false,
        url: window.location.href,
        detection,
    });

    if (!detection.isSignup) return;

    // Always track agreement buttons on signup pages
    attachAgreementListeners();

    const tosLink = getTosLinkForBackgroundFetch();
    if (!tosLink) return;

    // Show the consent banner instead of auto-scanning
    console.log('[Blind-Sight] Signup page detected, showing pre-scan prompt...');
    const userWantsScan = await showPreScanPrompt();

    if (!userWantsScan) {
        console.log('[Blind-Sight] User dismissed scan prompt.');
        return;
    }

    console.log('[Blind-Sight] User requested scan, scanning...');
    showScanningBanner();

    try {
        const result = await performScan();
        hideScanningBanner();

        if ('error' in result) {
            console.log('[Blind-Sight] Scan error:', result.error);
            showScanErrorCard((result as { error: string }).error);
            return;
        }

        const scanResult = result as ScanResult;

        // Always show the in-page result card for all tiers
        showScanResultCard(scanResult);

        // Additionally show the full blocking modal for orange/red
        if (scanResult.overallSeverity >= 2) {
            showWarningModal(scanResult.clauses, scanResult.overallSeverity as SeverityKey, {
                category: scanResult.category,
                serviceName: scanResult.serviceName,
                hostname: window.location.hostname,
                aiAlternatives: scanResult.aiAlternatives,
            });
        }

        chrome.runtime.sendMessage({
            type: 'AUTO_SCAN_COMPLETE',
            result,
            url: window.location.href,
        });
    } catch (error) {
        hideScanningBanner();
        console.error('[Blind-Sight] Scan failed:', error);
        showScanErrorCard((error as Error).message || 'An unexpected error occurred');
    }
}

// ─── Message listener (from popup / background) ─────────
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    switch (request.type) {
        case 'MANUAL_SCAN':
            performScan()
                .then((result) => sendResponse(result))
                .catch((error) => sendResponse({ error: (error as Error).message }));
            return true;

        case 'GET_PAGE_STATUS': {
            const detection = getSignupDetectionResult(SIGNUP_THRESHOLD);
            sendResponse({
                isSignup: detection.isSignup,
                detection,
                tosLinks: getTosLinkForBackgroundFetch()?.allLinks ?? [],
                lastScanResult,
                scanInProgress,
            });
            return false;
        }

        case 'SHOW_WARNING':
            if (request.clauses && !isModalVisible()) {
                showWarningModal(request.clauses, request.severity ?? 3, {
                    category: request.category,
                    serviceName: request.serviceName,
                    hostname: window.location.hostname,
                    aiAlternatives: request.aiAlternatives,
                });
            }
            return false;

        default:
            return false;
    }
});

// ─── Init ───────────────────────────────────────────────
function init(): void {
    if (window.location.protocol === 'chrome-extension:' || window.location.protocol === 'chrome:') return;

    setTimeout(() => {
        if (isSignupPage(SIGNUP_THRESHOLD)) {
            promptAndScanIfSignup();
        }
    }, AUTO_SCAN_DELAY);
}

init();
