import { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import StatusIndicator from './components/StatusIndicator';
import ScanButton from './components/ScanButton';
import ResultCard from './components/ResultCard';
import ScanSkeleton from './components/ScanSkeleton';
import HistorySection from './components/HistorySection';

import type { ScanResponse, ScanResult, HistoryEntry, SeverityKey } from '@blindsight/core';
import { isScanError, SEVERITY_CONFIG, t } from '@blindsight/core';


type Status = 'idle' | 'scanning' | 'safe' | 'notable' | 'caution' | 'danger' | 'error' | 'nokey';

function sendToContentScript(message: Record<string, unknown>): Promise<ScanResponse> {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0];
            if (!tab?.id || !tab?.url) { reject(new Error(t('restrictedPageError', 'No active tab'))); return; }

            // Guard against restricted pages
            if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('https://chrome.google.com/webstore')) {
                reject(new Error(t('restrictedPageError', 'Cannot scan this type of page. Please try on a regular website.')));
                return;
            }

            chrome.tabs.sendMessage(tab.id, message, (response) => {
                if (chrome.runtime.lastError) {
                    const errorMsg = chrome.runtime.lastError.message || '';
                    if (errorMsg.includes('Receiving end does not exist')) {
                        reject(new Error(t('refreshPageError', 'Please refresh this page before scanning. The extension was just installed or updated.')));
                    } else {
                        reject(new Error(errorMsg));
                    }
                } else {
                    resolve(response as ScanResponse);
                }
            });
        });
    });
}

function loadHistory(): Promise<HistoryEntry[]> {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'GET_HISTORY' }, (response) => {
            resolve((response as HistoryEntry[]) ?? []);
        });
    });
}

export default function App() {
    const [status, setStatus] = useState<Status>('idle');
    const [statusMessage, setStatusMessage] = useState(t('readyToScan', 'Ready to scan'));
    const [scanning, setScanning] = useState(false);
    const [result, setResult] = useState<ScanResult | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [quota, setQuota] = useState<{ scans_today: number; limit: number; tier: string } | null>(null);
    const [upgrading, setUpgrading] = useState(false);

    const fetchQuota = useCallback(() => {
        chrome.runtime.sendMessage({ type: 'GET_QUOTA' }, (response) => {
            if (response && !response.error) {
                setQuota(response);
            }
        });
    }, []);

    const handleUpgrade = async () => {
        setUpgrading(true);
        chrome.runtime.sendMessage({ type: 'UPGRADE_PRO' }, (response) => {
            setUpgrading(false);
            if (response && response.success) {
                fetchQuota();
            }
        });
    };

    const handleScan = useCallback(async () => {
        setStatus('scanning');
        setStatusMessage(t('scanning', 'Analyzing Terms of Service...'));
        setScanning(true);
        setResult(null);
        setErrorMessage(null);

        try {
            const response = await sendToContentScript({ type: 'MANUAL_SCAN' });

            if (isScanError(response)) {
                if (response.error === 'QUOTA_LIMIT_REACHED') {
                    setStatus('nokey');
                    setStatusMessage(t('quotaReachedTitle', 'Quota Reached'));
                    setErrorMessage(t('quotaReachedDesc', 'You have reached your limit of 5 free scans for today. Upgrade to Pro for unlimited instant scans!'));
                } else {
                    setStatus('error');
                    setStatusMessage(t('scanFailed', 'Scan failed'));
                    setErrorMessage(response.error);
                }
            } else {
                const scanResult = response as ScanResult;
                const severity = scanResult.overallSeverity ?? 0;
                const config = SEVERITY_CONFIG[severity as SeverityKey];

                // Attach hostname so ResultCard can resolve domain-based alternatives
                const tabs = await new Promise<chrome.tabs.Tab[]>((resolve) =>
                    chrome.tabs.query({ active: true, currentWindow: true }, resolve)
                );
                const activeTab = tabs[0];
                if (activeTab?.url) {
                    try { scanResult.hostname = new URL(activeTab.url).hostname.replace(/^www\./, ''); } catch { }
                }

                setResult(scanResult);
                setStatus(config.status as Status);
                setStatusMessage(t(config.titleKey || 'readyToScan', config.name));

                if (severity >= 2) {
                    sendToContentScript({
                        type: 'SHOW_WARNING',
                        clauses: scanResult.clauses,
                        severity: severity,
                        category: scanResult.category,
                        serviceName: scanResult.serviceName,
                        hostname: scanResult.hostname,
                        aiAlternatives: scanResult.aiAlternatives,
                    }).catch(console.error);
                }
            }

            const h = await loadHistory();
            setHistory(h);
            fetchQuota();
        } catch (error) {
            const errStr = (error as Error).message || '';
            if (errStr.includes('QUOTA_LIMIT_REACHED')) {
                setStatus('nokey');
                setStatusMessage(t('quotaReachedTitle', 'Quota Reached'));
                setErrorMessage(t('quotaReachedDesc', 'You have reached your limit of 5 free scans for today. Upgrade to Pro for unlimited instant scans!'));
            } else {
                setStatus('error');
                setStatusMessage(t('scanFailed', 'Scan failed'));
                setErrorMessage(errStr || t('generalError', 'An unexpected error occurred.'));
            }
        } finally {
            setScanning(false);
        }
    }, [fetchQuota]);

    useEffect(() => {
        (async () => {
            const h = await loadHistory();
            setHistory(h);
            fetchQuota();

            const sessionData = await chrome.storage.session.get(['autoScan']);
            if (sessionData.autoScan) {
                await chrome.storage.session.remove(['autoScan']);
                handleScan();
            }
        })();
    }, [handleScan, fetchQuota]);

    return (
        <div className="flex flex-col min-h-[500px]">
            <Header tier={quota?.tier} />

            <div className="flex-1 p-4 flex flex-col gap-4">
                <StatusIndicator status={status} message={statusMessage} />

                <ScanButton onClick={handleScan} scanning={scanning} disabled={scanning} />

                {quota && quota.tier === 'free' && (
                    <div className="bg-bs-bg-secondary border border-bs-border rounded-xl p-3.5 flex flex-col gap-2.5 animate-slide-in mt-[-4px]">
                        <div className="flex justify-between items-center text-xs font-semibold text-bs-text-secondary">
                            <span>{t('scansToday', `Scans today: $1 / $2`, [quota.scans_today, quota.limit])}</span>
                            <button
                                onClick={handleUpgrade}
                                disabled={upgrading}
                                className="text-bs-accent hover:text-bs-accent-hover font-bold text-xs flex items-center gap-1 transition-colors duration-200"
                            >
                                {upgrading ? 'Upgrading...' : t('upgradeToPro', 'Upgrade to Pro 👑')}
                            </button>
                        </div>
                        <div className="w-full bg-bs-bg-tertiary h-1.5 rounded-full overflow-hidden">
                            <div
                                className="bg-bs-accent h-full rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${Math.min(100, (quota.scans_today / quota.limit) * 100)}%` }}
                            />
                        </div>
                    </div>
                )}

                {scanning && <div className="animate-fade-in"><ScanSkeleton /></div>}

                {!scanning && result && <ResultCard result={result} />}

                {errorMessage && !result && (
                    <div className="border border-bs-danger bg-[#D73A4A10] rounded-lg p-3 animate-slide-in">
                        <div className="flex items-start gap-3">
                            <span className="text-lg">❌</span>
                            <div>
                                <h3 className="font-bold text-sm text-bs-danger mb-0.5 tracking-wide">{status === 'nokey' ? t('quotaReachedTitle', 'Quota Reached') : t('scanFailed', 'Scan Failed')}</h3>
                                <p className="text-xs text-bs-danger/80">{errorMessage}</p>
                            </div>
                        </div>
                    </div>
                )}

                <HistorySection entries={history} />
            </div>

            <footer className="p-3 text-center border-t border-bs-border">
                <p className="text-[10px] text-bs-text-muted">
                    Blind-Sight v4.0 — Your Legal Firewall
                </p>
            </footer>
        </div>
    );
}
