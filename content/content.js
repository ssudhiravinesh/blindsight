(function () {
    'use strict';

    const CONFIG = {
        SIGNUP_THRESHOLD: 50,
        AUTO_SCAN_ENABLED: true,
        SCAN_DELAY_MS: 1000,
        MAX_TOS_LENGTH: 30000,
    };

    let scanInProgress = false;
    let lastScanResult = null;

    function areDependenciesLoaded() {
        return typeof window.BlindSightDetector !== 'undefined' &&
            typeof window.BlindSightExtractor !== 'undefined' &&
            typeof window.BlindSightBlocker !== 'undefined';
    }

    function waitForDependencies(timeout = 5000) {
        return new Promise((resolve, reject) => {
            if (areDependenciesLoaded()) {
                resolve();
                return;
            }

            const startTime = Date.now();
            const checkInterval = setInterval(() => {
                if (areDependenciesLoaded()) {
                    clearInterval(checkInterval);
                    resolve();
                } else if (Date.now() - startTime > timeout) {
                    clearInterval(checkInterval);
                    reject(new Error('Dependencies failed to load'));
                }
            }, 100);
        });
    }

    function truncateText(text) {
        if (!text || text.length <= CONFIG.MAX_TOS_LENGTH) {
            return text;
        }
        return text.substring(0, CONFIG.MAX_TOS_LENGTH) + '\n\n[Text truncated due to length...]';
    }

    function sendToBackground(message) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(message, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        });
    }

    async function performTosAnalysis() {
        if (scanInProgress) {
            return { error: 'Scan already in progress' };
        }

        scanInProgress = true;

        try {
            const extraction = await window.BlindSightExtractor.extractTosText();

            if (!extraction.success) {
                if (extraction.needsBackgroundFetch) {

                    // Use PDF-specific handler if the link is a PDF
                    const messageType = extraction.isPdf ? 'FETCH_PDF_TOS' : 'FETCH_TOS';
                    const backgroundResult = await sendToBackground({
                        type: messageType,
                        url: extraction.url
                    });

                    if (!backgroundResult || !backgroundResult.success || backgroundResult.error) {
                        const errorMsg = backgroundResult?.error || 'Failed to fetch Terms of Service';
                        lastScanResult = {
                            error: errorMsg,
                            fetchFailed: true,
                            url: extraction.url
                        };
                        return lastScanResult;
                    }

                    if (!backgroundResult.text || backgroundResult.text.trim().length < 100) {
                        lastScanResult = {
                            error: 'Terms of Service content could not be retrieved',
                            fetchFailed: true,
                            url: extraction.url
                        };
                        return lastScanResult;
                    }

                    const analysisResult = await sendToBackground({
                        type: 'ANALYZE_TOS',
                        tosText: truncateText(backgroundResult.text),
                        source: extraction.url
                    });

                    lastScanResult = analysisResult;

                    handleAnalysisResult(analysisResult);

                    return analysisResult;
                }

                lastScanResult = { error: extraction.error };
                return lastScanResult;
            }

            const analysisResult = await sendToBackground({
                type: 'ANALYZE_TOS',
                tosText: truncateText(extraction.text),
                source: extraction.source
            });

            lastScanResult = analysisResult;

            handleAnalysisResult(analysisResult);

            return analysisResult;

        } catch (error) {
            lastScanResult = { error: error.message };
            return lastScanResult;
        } finally {
            scanInProgress = false;
        }
    }

    function handleAnalysisResult(result) {
        if (!result) {
            return;
        }

        if (result.error) {
            return;
        }

        const severity = result.overallSeverity ?? 0;
        const severityNames = ['Standard', 'Notable', 'Cautionary', 'Critical'];

        if (severity >= 2 && result.clauses && result.clauses.length > 0) {
            const modalType = severity >= 3 ? 'RED (type to proceed)' : 'ORANGE (10s countdown)';

            const relevantClauses = result.clauses.filter(c => (c.severity || 0) >= 2);
            const clausesToShow = relevantClauses.length > 0 ? relevantClauses : result.clauses;

            window.BlindSightBlocker.showWarningModal(clausesToShow, severity, {
                category: result.category,
                serviceName: result.serviceName
            });
        } else {
            window.BlindSightBlocker.unblockButtons();
            window.BlindSightBlocker.hideWarningModal();
        }
    }

    async function handleAutoScan() {
        if (!CONFIG.AUTO_SCAN_ENABLED) {
            return;
        }

        const isSignup = window.BlindSightDetector.isSignupPage(CONFIG.SIGNUP_THRESHOLD);

        if (!isSignup) {
            return;
        }

        await sendToBackground({
            type: 'PAGE_DETECTED',
            isSignup: true,
            url: window.location.href,
            detection: window.BlindSightDetector.getSignupDetectionResult(CONFIG.SIGNUP_THRESHOLD)
        });

        const result = await performTosAnalysis();

        await sendToBackground({
            type: 'AUTO_SCAN_COMPLETE',
            result,
            url: window.location.href
        });
    }

    function handleManualScan() {
        return performTosAnalysis();
    }

    function getPageStatus() {
        return {
            isSignup: window.BlindSightDetector.isSignupPage(CONFIG.SIGNUP_THRESHOLD),
            detection: window.BlindSightDetector.getSignupDetectionResult(CONFIG.SIGNUP_THRESHOLD),
            tosLinks: window.BlindSightExtractor.findTosLinks(),
            lastScanResult,
            scanInProgress
        };
    }

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

        switch (request.type) {
            case 'MANUAL_SCAN':
                handleManualScan()
                    .then(result => sendResponse(result))
                    .catch(error => sendResponse({ error: error.message }));
                return true;

            case 'GET_PAGE_STATUS':
                sendResponse(getPageStatus());
                return false;

            case 'GET_TOS_LINKS':
                sendResponse({
                    links: window.BlindSightExtractor.findTosLinks()
                });
                return false;

            case 'CHECK_SIGNUP':
                sendResponse({
                    isSignup: window.BlindSightDetector.isSignupPage(CONFIG.SIGNUP_THRESHOLD),
                    detection: window.BlindSightDetector.getSignupDetectionResult(CONFIG.SIGNUP_THRESHOLD)
                });
                return false;

            case 'ANALYSIS_RESULT':
                handleAnalysisResult(request.result);
                sendResponse({ received: true });
                return false;

            case 'SHOW_WARNING':
                if (request.clauses && request.clauses.length > 0) {
                    window.BlindSightBlocker.showWarningModal(request.clauses);
                }
                sendResponse({ shown: true });
                return false;

            case 'UNBLOCK_BUTTONS':
                window.BlindSightBlocker.unblockButtons();
                window.BlindSightBlocker.hideWarningModal();
                sendResponse({ unblocked: true });
                return false;

            default:
                return false;
        }
    });

    async function initialize() {
        try {
            await waitForDependencies();

            setTimeout(() => {
                handleAutoScan().catch(error => {
                    console.error('[Blind-Sight] Auto-scan error:', error);
                });
            }, CONFIG.SCAN_DELAY_MS);

        } catch (error) {
            console.error('[Blind-Sight] Initialization error:', error);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})();