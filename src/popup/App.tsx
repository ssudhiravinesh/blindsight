import { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import StatusIndicator from './components/StatusIndicator';
import ScanButton from './components/ScanButton';
import ResultCard from './components/ResultCard';
import HistorySection from './components/HistorySection';
import type { ScanResponse, ScanResult, HistoryEntry, SeverityKey } from '../lib/types';
import { isScanError, SEVERITY_CONFIG } from '../lib/types';

type Status = 'idle' | 'scanning' | 'safe' | 'notable' | 'caution' | 'danger' | 'error';

function sendToContentScript(message: Record<string, unknown>): Promise<ScanResponse> {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0];
            if (!tab?.id) { reject(new Error('No active tab')); return; }

            chrome.tabs.sendMessage(tab.id, message, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
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
    const [statusMessage, setStatusMessage] = useState('Ready to scan');
    const [scanning, setScanning] = useState(false);
    const [result, setResult] = useState<ScanResult | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [history, setHistory] = useState<HistoryEntry[]>([]);

    useEffect(() => {
        (async () => {
            const h = await loadHistory();
            setHistory(h);
        })();
    }, []);

    const handleScan = useCallback(async () => {
        setStatus('scanning');
        setStatusMessage('Analyzing Terms of Service...');
        setScanning(true);
        setResult(null);
        setErrorMessage(null);

        try {
            const response = await sendToContentScript({ type: 'MANUAL_SCAN' });

            if (isScanError(response)) {
                setStatus('error');
                setStatusMessage('Scan failed');
                setErrorMessage(response.error);
            } else {
                const scanResult = response as ScanResult;
                const severity = scanResult.overallSeverity ?? 0;
                const config = SEVERITY_CONFIG[severity as SeverityKey];

                setResult(scanResult);
                setStatus(config.status as Status);
                setStatusMessage(config.name);

                if (severity >= 2) {
                    sendToContentScript({
                        type: 'SHOW_WARNING',
                        clauses: scanResult.clauses,
                        severity: severity,
                        category: scanResult.category,
                        serviceName: scanResult.serviceName
                    }).catch(console.error);
                }
            }

            const h = await loadHistory();
            setHistory(h);
        } catch (error) {
            setStatus('error');
            setStatusMessage('Scan failed');
            setErrorMessage((error as Error).message || 'An unexpected error occurred.');
        } finally {
            setScanning(false);
        }
    }, []);

    return (
        <div className="flex flex-col min-h-[500px]">
            <Header />

            <div className="flex-1 p-4 flex flex-col gap-4">
                <StatusIndicator status={status} message={statusMessage} />

                <ScanButton onClick={handleScan} scanning={scanning} disabled={scanning} />

                {result && <ResultCard result={result} />}

                {errorMessage && !result && (
                    <div className="bs-glass bs-gradient-danger p-4 animate-slide-in">
                        <div className="flex items-start gap-3">
                            <span className="text-lg">❌</span>
                            <div>
                                <h3 className="font-bold text-sm text-bs-danger mb-1">Error</h3>
                                <p className="text-xs text-bs-text-secondary">{errorMessage}</p>
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
