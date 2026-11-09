import { useCallback, useEffect, useState } from 'react';
import type { HistoryEntry, ScanResponse, ScanResult } from '@blindsight/core';
import { isScanError, t } from '@blindsight/core';

import Header from './components/Header';
import ScanPanel from './components/ScanPanel';
import ResultCard from './components/ResultCard';
import ErrorCard from './components/ErrorCard';
import HistorySection from './components/HistorySection';

type ViewState =
    | { kind: 'idle' }
    | { kind: 'scanning' }
    | { kind: 'result'; result: ScanResult }
    | { kind: 'error'; title: string; message: string; rateLimited: boolean };

interface PageStatus {
    isSignup?: boolean;
    lastScanResult?: ScanResponse | null;
    scanInProgress?: boolean;
}

const RESTRICTED_PREFIXES = ['chrome://', 'edge://', 'about:', 'chrome-extension://', 'https://chrome.google.com/webstore', 'https://chromewebstore.google.com'];

async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
}

function hostnameOf(url?: string): string | null {
    if (!url) return null;
    try {
        const { hostname, protocol } = new URL(url);
        return protocol.startsWith('http') ? hostname.replace(/^www\./, '') : null;
    } catch {
        return null;
    }
}

function sendToContentScript<T>(message: Record<string, unknown>): Promise<T> {
    return new Promise((resolve, reject) => {
        getActiveTab().then((tab) => {
            if (!tab?.id || !tab.url) {
                reject(new Error(t('restrictedPageError', 'No active tab')));
                return;
            }
            if (RESTRICTED_PREFIXES.some((p) => tab.url!.startsWith(p))) {
                reject(new Error(t('restrictedPageError', 'Cannot scan this type of page. Please try on a regular website.')));
                return;
            }
            chrome.tabs.sendMessage(tab.id, message, (response) => {
                const err = chrome.runtime.lastError?.message;
                if (err) {
                    reject(new Error(
                        err.includes('Receiving end does not exist')
                            ? t('refreshPageError', 'Refresh this page and try again. The extension was just installed or updated.')
                            : err,
                    ));
                } else {
                    resolve(response as T);
                }
            });
        }, reject);
    });
}

function loadHistory(): Promise<HistoryEntry[]> {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'GET_HISTORY' }, (response) => {
            resolve(Array.isArray(response) ? (response as HistoryEntry[]) : []);
        });
    });
}

function errorState(message: string): ViewState {
    if (message.includes('RATE_LIMITED')) {
        return {
            kind: 'error',
            rateLimited: true,
            title: t('rateLimitedTitle', 'Slow down'),
            message: t('rateLimitedDesc', 'Too many scans in a short period. Please wait a minute and try again.'),
        };
    }
    return {
        kind: 'error',
        rateLimited: false,
        title: t('scanFailed', 'Scan failed'),
        message: message || t('generalError', 'An unexpected error occurred.'),
    };
}

export default function App() {
    const [view, setView] = useState<ViewState>({ kind: 'idle' });
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [hostname, setHostname] = useState<string | null>(null);
    const [isSignupPage, setIsSignupPage] = useState(false);
    const [version, setVersion] = useState('');

    const handleScan = useCallback(async () => {
        setView({ kind: 'scanning' });
        try {
            const response = await sendToContentScript<ScanResponse>({ type: 'MANUAL_SCAN' });
            if (isScanError(response)) {
                setView(errorState(response.error));
            } else {
                const result = { ...response, hostname: hostnameOf((await getActiveTab())?.url) ?? response.hostname };
                setView({ kind: 'result', result });

                if (result.overallSeverity >= 2) {
                    sendToContentScript({
                        type: 'SHOW_WARNING',
                        clauses: result.clauses,
                        severity: result.overallSeverity,
                        category: result.category,
                        serviceName: result.serviceName,
                        hostname: result.hostname,
                        aiAlternatives: result.aiAlternatives,
                    }).catch(() => undefined);
                }
            }
        } catch (error) {
            setView(errorState((error as Error).message));
        } finally {
            setHistory(await loadHistory());
        }
    }, []);

    useEffect(() => {
        setVersion(chrome.runtime.getManifest?.().version ?? '');
        void (async () => {
            const tab = await getActiveTab();
            setHostname(hostnameOf(tab?.url));
            setHistory(await loadHistory());

            const session = await chrome.storage.session.get(['autoScan']);
            if (session.autoScan) {
                await chrome.storage.session.remove(['autoScan']);
                void handleScan();
                return;
            }

            // Restore the last result for this tab so reopening the popup doesn't lose it.
            try {
                const status = await sendToContentScript<PageStatus>({ type: 'GET_PAGE_STATUS' });
                setIsSignupPage(Boolean(status?.isSignup));
                if (status?.lastScanResult && !isScanError(status.lastScanResult)) {
                    setView({ kind: 'result', result: { ...status.lastScanResult, hostname: hostnameOf(tab?.url) ?? undefined } });
                } else if (status?.scanInProgress) {
                    setView({ kind: 'scanning' });
                }
            } catch {
                // Restricted page or content script not injected yet: stay idle.
            }
        })();
    }, [handleScan]);

    return (
        <div className="flex min-h-[520px] flex-col">
            <Header hostname={hostname} isSignupPage={isSignupPage} />

            <main className="flex flex-1 flex-col gap-4 p-4">
                {view.kind === 'result' ? (
                    <ResultCard result={view.result} onRescan={handleScan} />
                ) : view.kind === 'error' ? (
                    <ErrorCard title={view.title} message={view.message} rateLimited={view.rateLimited} onRetry={handleScan} />
                ) : (
                    <ScanPanel scanning={view.kind === 'scanning'} onScan={handleScan} />
                )}

                <HistorySection entries={history} />
            </main>

            <footer className="flex items-center justify-between border-t border-line px-4 py-2.5 text-2xs text-fg-subtle">
                <span>Free · No account · No tracking</span>
                {version && <span className="font-mono">v{version}</span>}
            </footer>
        </div>
    );
}
