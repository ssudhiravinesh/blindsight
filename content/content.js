/**
 * Blind-Sight Main Content Script
 * Orchestrates signup detection, ToS extraction, and communication with background
 */

// Wait for detector and extractor to load
(function () {
    'use strict';

    // Configuration
    const CONFIG = {
        SIGNUP_THRESHOLD: 50,           // Confidence threshold for signup detection
        AUTO_SCAN_ENABLED: true,        // Enable auto-scan on signup pages
        SCAN_DELAY_MS: 1000,            // Delay before auto-scanning (let page load)
        MAX_TOS_LENGTH: 30000,          // Max ToS text length to send
    };

    // State
    let scanInProgress = false;
    let lastScanResult = null;

    /**
     * Check if detector and extractor are loaded
     */
    function areDependenciesLoaded() {
        return typeof window.BlindSightDetector !== 'undefined' &&
            typeof window.BlindSightExtractor !== 'undefined' &&
            typeof window.BlindSightBlocker !== 'undefined';
    }

    /**
     * Wait for dependencies to load
     */
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

    /**
     * Truncate text if it exceeds max length
     */
    function truncateText(text) {
        if (!text || text.length <= CONFIG.MAX_TOS_LENGTH) {
            return text;
        }
        return text.substring(0, CONFIG.MAX_TOS_LENGTH) + '\n\n[Text truncated due to length...]';
    }

    /**
     * Send message to background script and get response
     */
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

    /**
     * Perform ToS extraction and analysis
     */
    async function performTosAnalysis() {
        if (scanInProgress) {
            console.log('[Blind-Sight] Scan already in progress');
            return { error: 'Scan already in progress' };
        }

        scanInProgress = true;
        console.log('[Blind-Sight] Starting ToS analysis...');

        try {
            // Extract ToS text
            const extraction = await window.BlindSightExtractor.extractTosText();

            if (!extraction.success) {
                // Check if we need background fetch (CORS issue)
                if (extraction.needsBackgroundFetch) {
                    console.log('[Blind-Sight] Need background fetch for:', extraction.url);

                    // Request background script to fetch the ToS
                    const backgroundResult = await sendToBackground({
                        type: 'FETCH_TOS',
                        url: extraction.url
                    });

                    // Check for failure - FAIL CLOSED (error, not green)
                    if (!backgroundResult || !backgroundResult.success || backgroundResult.error) {
                        const errorMsg = backgroundResult?.error || 'Failed to fetch Terms of Service';
                        console.error('[Blind-Sight] Background fetch failed:', errorMsg);
                        lastScanResult = {
                            error: errorMsg,
                            fetchFailed: true,
                            url: extraction.url
                        };
                        return lastScanResult;
                    }

                    // Verify we got content
                    if (!backgroundResult.text || backgroundResult.text.trim().length < 100) {
                        console.error('[Blind-Sight] Background fetch returned insufficient content');
                        lastScanResult = {
                            error: 'Terms of Service content could not be retrieved',
                            fetchFailed: true,
                            url: extraction.url
                        };
                        return lastScanResult;
                    }

                    // Now analyze the fetched text
                    const analysisResult = await sendToBackground({
                        type: 'ANALYZE_TOS',
                        tosText: truncateText(backgroundResult.text),
                        source: extraction.url
                    });

                    lastScanResult = analysisResult;

                    // Handle the result
                    handleAnalysisResult(analysisResult);

                    return analysisResult;
                }

                // No ToS found
                lastScanResult = { error: extraction.error };
                return lastScanResult;
            }

            // Send ToS text to background for analysis
            const analysisResult = await sendToBackground({
                type: 'ANALYZE_TOS',
                tosText: truncateText(extraction.text),
                source: extraction.source
            });

            lastScanResult = analysisResult;
            console.log('[Blind-Sight] Analysis result:', analysisResult);

            // Handle the result (block buttons if lethal)
            handleAnalysisResult(analysisResult);

            return analysisResult;

        } catch (error) {
            console.error('[Blind-Sight] Analysis error:', error);
            lastScanResult = { error: error.message };
            return lastScanResult;
        } finally {
            scanInProgress = false;
        }
    }

    /**
     * Handle analysis result - trigger appropriate warning modal based on severity
     * Tier 0: Standard - no action
     * Tier 1: Notable - no action (info only in popup)
     * Tier 2: Cautionary - show ORANGE modal (10-second countdown)
     * Tier 3: Critical - show RED modal (type "I PROCEED" to continue)
     */
    function handleAnalysisResult(result) {
        if (!result) {
            console.log('[Blind-Sight] No result to handle');
            return;
        }

        if (result.error) {
            console.log('[Blind-Sight] Analysis had error:', result.error);
            return;
        }

        const severity = result.overallSeverity ?? 0;
        const severityNames = ['Standard', 'Notable', 'Cautionary', 'Critical'];
        console.log(`[Blind-Sight] Analysis result: Severity ${severity} (${severityNames[severity]})`);

        // Show modal for Cautionary (2) and Critical (3)
        if (severity >= 2 && result.clauses && result.clauses.length > 0) {
            const modalType = severity >= 3 ? 'RED (type to proceed)' : 'ORANGE (10s countdown)';
            console.log(`[Blind-Sight] Showing ${modalType} warning modal...`);

            // Filter to relevant severity clauses for the modal
            const relevantClauses = result.clauses.filter(c => (c.severity || 0) >= 2);
            const clausesToShow = relevantClauses.length > 0 ? relevantClauses : result.clauses;

            // Pass full result for alternatives suggestions
            window.BlindSightBlocker.showWarningModal(clausesToShow, severity, {
                category: result.category,
                serviceName: result.serviceName
            });
        } else {
            console.log(`[Blind-Sight] Severity ${severity} - no blocking action needed`);
            // Make sure buttons are not blocked for low severity results
            window.BlindSightBlocker.unblockButtons();
            window.BlindSightBlocker.hideWarningModal();
        }
    }

    /**
     * Handle auto-scan for signup pages
     */
    async function handleAutoScan() {
        if (!CONFIG.AUTO_SCAN_ENABLED) {
            console.log('[Blind-Sight] Auto-scan disabled');
            return;
        }

        // Check if this is a signup page
        const isSignup = window.BlindSightDetector.isSignupPage(CONFIG.SIGNUP_THRESHOLD);

        if (!isSignup) {
            console.log('[Blind-Sight] Not a signup page, skipping auto-scan');
            return;
        }

        console.log('[Blind-Sight] Signup page detected! Starting auto-scan...');

        // Notify background about detection
        await sendToBackground({
            type: 'PAGE_DETECTED',
            isSignup: true,
            url: window.location.href,
            detection: window.BlindSightDetector.getSignupDetectionResult(CONFIG.SIGNUP_THRESHOLD)
        });

        // Perform analysis
        const result = await performTosAnalysis();

        // Notify background of result
        await sendToBackground({
            type: 'AUTO_SCAN_COMPLETE',
            result,
            url: window.location.href
        });
    }

    /**
     * Handle manual scan request from popup
     */
    function handleManualScan() {
        console.log('[Blind-Sight] Manual scan triggered');
        return performTosAnalysis();
    }

    /**
     * Get current page detection status
     */
    function getPageStatus() {
        return {
            isSignup: window.BlindSightDetector.isSignupPage(CONFIG.SIGNUP_THRESHOLD),
            detection: window.BlindSightDetector.getSignupDetectionResult(CONFIG.SIGNUP_THRESHOLD),
            tosLinks: window.BlindSightExtractor.findTosLinks(),
            lastScanResult,
            scanInProgress
        };
    }

    /**
     * Listen for messages from popup or background
     */
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('[Blind-Sight] Content script received message:', request.type);

        switch (request.type) {
            case 'MANUAL_SCAN':
                handleManualScan()
                    .then(result => sendResponse(result))
                    .catch(error => sendResponse({ error: error.message }));
                return true; // Keep channel open for async response

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
                // Receive analysis result from background (e.g., after popup trigger)
                handleAnalysisResult(request.result);
                sendResponse({ received: true });
                return false;

            case 'SHOW_WARNING':
                // Directly show warning modal with provided clauses
                if (request.clauses && request.clauses.length > 0) {
                    window.BlindSightBlocker.showWarningModal(request.clauses);
                }
                sendResponse({ shown: true });
                return false;

            case 'UNBLOCK_BUTTONS':
                // Unblock buttons (called from popup or background)
                window.BlindSightBlocker.unblockButtons();
                window.BlindSightBlocker.hideWarningModal();
                sendResponse({ unblocked: true });
                return false;

            default:
                return false;
        }
    });

    /**
     * Initialize content script
     */
    async function initialize() {
        console.log('[Blind-Sight] Content script initializing...');

        try {
            // Wait for dependencies
            await waitForDependencies();
            console.log('[Blind-Sight] Dependencies loaded');

            // Wait a bit for page to fully load
            setTimeout(() => {
                handleAutoScan().catch(error => {
                    console.error('[Blind-Sight] Auto-scan error:', error);
                });
            }, CONFIG.SCAN_DELAY_MS);

            console.log('[Blind-Sight] Content script initialized');
        } catch (error) {
            console.error('[Blind-Sight] Initialization error:', error);
        }
    }

    // Start initialization
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})();
