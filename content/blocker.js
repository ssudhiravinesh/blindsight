(function () {
    'use strict';

    const blockedButtons = [];
    const MODAL_ID = 'blind-sight-warning-modal';
    const OVERLAY_ID = 'blind-sight-overlay';

    const ORANGE_COUNTDOWN_SECONDS = 10;
    const CONFIRMATION_PHRASE = 'I PROCEED';

    const ALTERNATIVES_DB = {
        vpn: {
            displayName: 'VPN Service',
            alternatives: [
                { name: 'ProtonVPN', url: 'https://protonvpn.com', reason: 'Swiss-based, no-logs, open source', icon: '🛡️' },
                { name: 'Mullvad VPN', url: 'https://mullvad.net', reason: 'Anonymous, no email required', icon: '🔐' },
                { name: 'IVPN', url: 'https://ivpn.net', reason: 'Transparent, multi-hop, privacy-focused', icon: '🌐' }
            ]
        },
        email: {
            displayName: 'Email Service',
            alternatives: [
                { name: 'ProtonMail', url: 'https://proton.me/mail', reason: 'End-to-end encrypted, Swiss privacy', icon: '📧' },
                { name: 'Tutanota', url: 'https://tutanota.com', reason: 'Encrypted, open source', icon: '🔒' }
            ]
        },
        cloud_storage: {
            displayName: 'Cloud Storage',
            alternatives: [
                { name: 'Proton Drive', url: 'https://proton.me/drive', reason: 'Zero-knowledge encryption', icon: '☁️' },
                { name: 'Tresorit', url: 'https://tresorit.com', reason: 'E2E encrypted, GDPR compliant', icon: '🔐' }
            ]
        },
        social_media: {
            displayName: 'Social Platform',
            alternatives: [
                { name: 'Mastodon', url: 'https://joinmastodon.org', reason: 'Decentralized, no ads, no tracking', icon: '🐘' },
                { name: 'Bluesky', url: 'https://bsky.app', reason: 'Decentralized, user-controlled', icon: '🦋' }
            ]
        },
        messaging: {
            displayName: 'Messaging App',
            alternatives: [
                { name: 'Signal', url: 'https://signal.org', reason: 'Gold standard encryption, minimal metadata', icon: '💬' },
                { name: 'Element', url: 'https://element.io', reason: 'Decentralized, E2E encrypted', icon: '🔷' }
            ]
        },
        video_conferencing: {
            displayName: 'Video Conferencing',
            alternatives: [
                { name: 'Jitsi Meet', url: 'https://meet.jit.si', reason: 'Open source, no account needed', icon: '📹' }
            ]
        },
        search: {
            displayName: 'Search Engine',
            alternatives: [
                { name: 'DuckDuckGo', url: 'https://duckduckgo.com', reason: 'No tracking, private by default', icon: '🦆' },
                { name: 'Brave Search', url: 'https://search.brave.com', reason: 'Independent index, no tracking', icon: '🦁' }
            ]
        },
        ai_assistant: {
            displayName: 'AI Assistant',
            alternatives: [
                { name: 'DuckDuckGo AI', url: 'https://duckduckgo.com/?q=DuckDuckGo+AI+Chat', reason: 'Anonymous, no account needed', icon: '🤖' },
                { name: 'Perplexity', url: 'https://perplexity.ai', reason: 'Transparent sources', icon: '🔮' }
            ]
        },
        unknown: {
            displayName: 'Online Service',
            alternatives: [
                { name: 'Privacy Guides', url: 'https://privacyguides.org', reason: 'Find privacy-respecting alternatives', icon: '📚' }
            ]
        }
    };

    function getAlternatives(category) {
        const normalized = (category || 'unknown').toLowerCase().replace(/[\\s-]/g, '_');
        return ALTERNATIVES_DB[normalized] || ALTERNATIVES_DB.unknown;
    }

    const BUTTON_PATTERNS = [
        /accept/i,
        /i agree/i,
        /agree/i,
        /sign up/i,
        /signup/i,
        /register/i,
        /create account/i,
        /continue/i,
        /submit/i,
        /get started/i,
        /join/i,
        /start/i
    ];

    function findTargetButtons() {
        const buttons = [];

        document.querySelectorAll('button, input[type="submit"], input[type="button"]').forEach(btn => {
            const text = btn.textContent || btn.value || '';
            if (BUTTON_PATTERNS.some(pattern => pattern.test(text.trim()))) {
                buttons.push(btn);
            }
        });

        document.querySelectorAll('a[role="button"], div[role="button"], span[role="button"]').forEach(btn => {
            const text = btn.textContent || '';
            if (BUTTON_PATTERNS.some(pattern => pattern.test(text.trim()))) {
                buttons.push(btn);
            }
        });

        document.querySelectorAll('[class*="btn"], [class*="button"], [class*="submit"]').forEach(el => {
            if (el.tagName.toLowerCase() !== 'form') {
                const text = el.textContent || '';
                if (BUTTON_PATTERNS.some(pattern => pattern.test(text.trim())) && !buttons.includes(el)) {
                    buttons.push(el);
                }
            }
        });

        return buttons;
    }

    function blockButton(button, severity = 3) {
        if (button.dataset.blindSightBlocked) return;

        const originalState = {
            element: button,
            disabled: button.disabled,
            pointerEvents: button.style.pointerEvents,
            position: button.style.position,
            opacity: button.style.opacity
        };

        blockedButtons.push(originalState);

        button.dataset.blindSightBlocked = 'true';

        if (button.tagName === 'BUTTON' || button.tagName === 'INPUT') {
            button.disabled = true;
        }

        button.style.pointerEvents = 'none';
        button.style.position = 'relative';
        button.style.opacity = '0.5';

        const overlayColor = severity >= 3 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(249, 115, 22, 0.3)';
        const icon = severity >= 3 ? '🚫' : '⏳';

        const overlay = document.createElement('div');
        overlay.className = 'blind-sight-btn-overlay';
        overlay.innerHTML = icon;
        overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: ${overlayColor};
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.2em;
            pointer-events: none;
            z-index: 1000;
            border-radius: inherit;
        `;

        const computedPosition = window.getComputedStyle(button).position;
        if (computedPosition === 'static') {
            button.style.position = 'relative';
        }

        button.appendChild(overlay);
    }

    function blockButtons(severity = 3) {
        const buttons = findTargetButtons();
        buttons.forEach(btn => blockButton(btn, severity));
        return buttons.length;
    }

    function unblockButtons() {
        blockedButtons.forEach(state => {
            const button = state.element;

            delete button.dataset.blindSightBlocked;

            if (button.tagName === 'BUTTON' || button.tagName === 'INPUT') {
                button.disabled = state.disabled;
            }
            button.style.pointerEvents = state.pointerEvents;
            button.style.position = state.position;
            button.style.opacity = state.opacity;

            const overlay = button.querySelector('.blind-sight-btn-overlay');
            if (overlay) {
                overlay.remove();
            }
        });

        blockedButtons.length = 0;
    }

    function getClauseInfo(clause) {
        const severity = clause.severity || 2;
        const typeIcons = {
            'DATA_SELLING': '💰',
            'ARBITRATION': '⚖️',
            'NO_CLASS_ACTION': '🚫',
            'TOS_CHANGES': '📝',
            'CONTENT_RIGHTS': '©️',
            'LIABILITY': '⚡',
            'UNILATERAL_CHANGES': '📝',
            'OTHER': '📋'
        };
        const typeNames = {
            'DATA_SELLING': 'Data Selling/Sharing',
            'ARBITRATION': 'Arbitration Clause',
            'NO_CLASS_ACTION': 'No Class Action Rights',
            'TOS_CHANGES': 'Terms Changes',
            'CONTENT_RIGHTS': 'Content Rights',
            'LIABILITY': 'Liability Waiver',
            'UNILATERAL_CHANGES': 'Unilateral Changes',
            'OTHER': 'Other Terms'
        };
        const severityColors = {
            1: '#eab308',
            2: '#f97316',
            3: '#ef4444'
        };

        return {
            icon: typeIcons[clause.type] || '⚠️',
            name: typeNames[clause.type] || clause.type || 'Concerning Clause',
            color: severityColors[severity] || severityColors[2]
        };
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function createAlternativesHTML(category, serviceName) {
        const altData = getAlternatives(category);
        if (!altData || !altData.alternatives || altData.alternatives.length === 0) {
            return '';
        }

        const altItems = altData.alternatives.slice(0, 3).map(alt => `
            <a href="${alt.url}" target="_blank" rel="noopener noreferrer" class="blind-sight-alt-card">
                <span class="blind-sight-alt-icon">${alt.icon}</span>
                <div class="blind-sight-alt-info">
                    <span class="blind-sight-alt-name">${escapeHtml(alt.name)}</span>
                    <span class="blind-sight-alt-reason">${escapeHtml(alt.reason)}</span>
                </div>
                <span class="blind-sight-alt-arrow">→</span>
            </a>
        `).join('');

        const serviceLabel = serviceName ? escapeHtml(serviceName) : altData.displayName;

        return `
            <div class="blind-sight-alternatives">
                <div class="blind-sight-alt-header">
                    <span class="blind-sight-alt-header-icon">🔄</span>
                    <span>Privacy-Friendly Alternatives${serviceLabel ? ` to ${serviceLabel}` : ''}</span>
                </div>
                <div class="blind-sight-alt-list">
                    ${altItems}
                </div>
            </div>
        `;
    }

    function createOrangeModalHTML(clauses, category = null, serviceName = null) {
        const clauseItems = clauses.map(clause => {
            const info = getClauseInfo(clause);
            const mitigationHtml = clause.mitigation
                ? `<div class="blind-sight-clause-mitigation">💡 ${escapeHtml(clause.mitigation)}</div>`
                : '';
            return `
                <div class="blind-sight-clause" style="border-left-color: ${info.color}">
                    <div class="blind-sight-clause-header">
                        <span class="blind-sight-clause-icon">${info.icon}</span>
                        <span class="blind-sight-clause-type" style="color: ${info.color}">${info.name}</span>
                    </div>
                    ${clause.quote ? `<div class="blind-sight-clause-quote">"${escapeHtml(clause.quote)}"</div>` : ''}
                    <div class="blind-sight-clause-explanation">${escapeHtml(clause.explanation)}</div>
                    ${mitigationHtml}
                </div>
            `;
        }).join('');

        return `
            <div id="${OVERLAY_ID}" class="blind-sight-overlay blind-sight-orange">
                <div id="${MODAL_ID}" class="blind-sight-modal blind-sight-modal-orange">
                    <div class="blind-sight-modal-header">
                        <div class="blind-sight-warning-icon">⚠️</div>
                        <h2 class="blind-sight-title">Proceed with Caution</h2>
                        <p class="blind-sight-subtitle">Blind-Sight detected ${clauses.length} unusual term${clauses.length > 1 ? 's' : ''} you should review</p>
                    </div>
                    
                    <div class="blind-sight-clauses">
                        ${clauseItems}
                    </div>
                    
                    ${createAlternativesHTML(category, serviceName)}
                    
                    <div class="blind-sight-modal-footer">
                        <p class="blind-sight-warning-text">
                            Please read the terms above before proceeding. The button will enable in <span id="blind-sight-countdown" class="blind-sight-countdown-number">${ORANGE_COUNTDOWN_SECONDS}</span> seconds.
                        </p>
                        <button id="blind-sight-proceed-btn" class="blind-sight-proceed-btn blind-sight-proceed-orange" disabled>
                            ⏳ Wait ${ORANGE_COUNTDOWN_SECONDS} seconds...
                        </button>
                        <button id="blind-sight-abort-btn" class="blind-sight-abort-btn">
                            ✕ Close Tab & Stay Safe
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    function createRedModalHTML(clauses, category = null, serviceName = null) {
        const clauseItems = clauses.map(clause => {
            const info = getClauseInfo(clause);
            const mitigationHtml = clause.mitigation
                ? `<div class="blind-sight-clause-mitigation">💡 ${escapeHtml(clause.mitigation)}</div>`
                : '';
            return `
                <div class="blind-sight-clause" style="border-left-color: ${info.color}">
                    <div class="blind-sight-clause-header">
                        <span class="blind-sight-clause-icon">${info.icon}</span>
                        <span class="blind-sight-clause-type" style="color: ${info.color}">${info.name}</span>
                    </div>
                    ${clause.quote ? `<div class="blind-sight-clause-quote">"${escapeHtml(clause.quote)}"</div>` : ''}
                    <div class="blind-sight-clause-explanation">${escapeHtml(clause.explanation)}</div>
                    ${mitigationHtml}
                </div>
            `;
        }).join('');

        return `
            <div id="${OVERLAY_ID}" class="blind-sight-overlay blind-sight-red">
                <div id="${MODAL_ID}" class="blind-sight-modal blind-sight-modal-red">
                    <div class="blind-sight-modal-header">
                        <div class="blind-sight-warning-icon">🚨</div>
                        <h2 class="blind-sight-title">CRITICAL: Dangerous Terms Detected</h2>
                        <p class="blind-sight-subtitle">${clauses.length} predatory clause${clauses.length > 1 ? 's' : ''} found. Proceeding is strongly discouraged.</p>
                    </div>
                    
                    <div class="blind-sight-clauses">
                        ${clauseItems}
                    </div>
                    
                    ${createAlternativesHTML(category, serviceName)}
                    
                    <div class="blind-sight-modal-footer">
                        <div class="blind-sight-confirm-section">
                            <p class="blind-sight-confirm-label">
                                ⚠️ To proceed anyway, type <strong>"${CONFIRMATION_PHRASE}"</strong> below:
                            </p>
                            <input type="text" 
                                   id="blind-sight-confirm-input" 
                                   class="blind-sight-confirm-input" 
                                   placeholder="Type '${CONFIRMATION_PHRASE}' to enable proceed button"
                                   autocomplete="off"
                                   spellcheck="false" />
                        </div>
                        <button id="blind-sight-proceed-btn" class="blind-sight-proceed-btn blind-sight-proceed-red" disabled>
                            🔓 Proceed (Locked - Type to Unlock)
                        </button>
                        <button id="blind-sight-abort-btn" class="blind-sight-abort-btn">
                            ✕ Close Tab & Stay Safe (Recommended)
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    function injectStyles() {
        if (document.getElementById('blind-sight-modal-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'blind-sight-modal-styles';
        styles.textContent = `
            .blind-sight-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.85);
                backdrop-filter: blur(8px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 2147483647;
                animation: blindSightFadeIn 0.3s ease-out;
            }

            .blind-sight-overlay.blind-sight-orange {
                background: rgba(0, 0, 0, 0.75);
            }

            .blind-sight-overlay.blind-sight-red {
                background: rgba(20, 0, 0, 0.9);
            }

            @keyframes blindSightFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes blindSightSlideIn {
                from { 
                    opacity: 0;
                    transform: scale(0.9) translateY(-20px);
                }
                to { 
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
            }

            @keyframes blindSightPulse {
                0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
                50% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
            }

            @keyframes blindSightOrangePulse {
                0%, 100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.4); }
                50% { box-shadow: 0 0 0 8px rgba(249, 115, 22, 0); }
            }

            @keyframes blindSightGlow {
                0%, 100% { text-shadow: 0 0 10px rgba(239, 68, 68, 0.5); }
                50% { text-shadow: 0 0 20px rgba(239, 68, 68, 0.8), 0 0 30px rgba(239, 68, 68, 0.6); }
            }

            @keyframes blindSightShake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-5px); }
                75% { transform: translateX(5px); }
            }

            .blind-sight-modal {
                background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%);
                border-radius: 16px;
                max-width: 600px;
                width: 90%;
                max-height: 85vh;
                overflow-y: auto;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
                animation: blindSightSlideIn 0.4s ease-out;
            }

            .blind-sight-modal-orange {
                border: 2px solid #f97316;
                box-shadow: 
                    0 0 40px rgba(249, 115, 22, 0.3),
                    0 8px 32px rgba(0, 0, 0, 0.4),
                    inset 0 1px 0 rgba(255, 255, 255, 0.1);
                animation: blindSightSlideIn 0.4s ease-out, blindSightOrangePulse 2s ease-in-out infinite;
            }

            .blind-sight-modal-red {
                border: 3px solid #ef4444;
                box-shadow: 
                    0 0 60px rgba(239, 68, 68, 0.4),
                    0 8px 32px rgba(0, 0, 0, 0.5),
                    inset 0 1px 0 rgba(255, 255, 255, 0.1);
                animation: blindSightSlideIn 0.4s ease-out, blindSightPulse 1.5s ease-in-out infinite;
            }

            .blind-sight-modal-header {
                text-align: center;
                padding: 24px 24px 16px;
            }

            .blind-sight-modal-orange .blind-sight-modal-header {
                border-bottom: 1px solid rgba(249, 115, 22, 0.3);
                background: linear-gradient(180deg, rgba(249, 115, 22, 0.1) 0%, transparent 100%);
            }

            .blind-sight-modal-red .blind-sight-modal-header {
                border-bottom: 1px solid rgba(239, 68, 68, 0.3);
                background: linear-gradient(180deg, rgba(239, 68, 68, 0.15) 0%, transparent 100%);
            }

            .blind-sight-warning-icon {
                font-size: 48px;
                margin-bottom: 12px;
            }

            .blind-sight-modal-red .blind-sight-warning-icon {
                animation: blindSightGlow 1.5s ease-in-out infinite;
            }

            .blind-sight-title {
                font-size: 22px;
                font-weight: 700;
                margin: 0 0 8px 0;
                text-transform: uppercase;
                letter-spacing: 1px;
            }

            .blind-sight-modal-orange .blind-sight-title {
                color: #f97316;
            }

            .blind-sight-modal-red .blind-sight-title {
                color: #ef4444;
            }

            .blind-sight-subtitle {
                color: #94a3b8;
                font-size: 14px;
                margin: 0;
            }

            .blind-sight-clauses {
                padding: 16px 24px;
                display: flex;
                flex-direction: column;
                gap: 12px;
                max-height: 300px;
                overflow-y: auto;
            }

            .blind-sight-clause {
                background: rgba(0, 0, 0, 0.3);
                border-left: 4px solid #f97316;
                border-radius: 8px;
                padding: 14px;
                transition: transform 0.2s ease, box-shadow 0.2s ease;
            }

            .blind-sight-clause:hover {
                transform: translateX(4px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            }

            .blind-sight-clause-header {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 8px;
            }

            .blind-sight-clause-icon {
                font-size: 18px;
            }

            .blind-sight-clause-type {
                font-weight: 600;
                font-size: 13px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .blind-sight-clause-quote {
                color: #fbbf24;
                font-style: italic;
                font-size: 12px;
                line-height: 1.5;
                padding: 8px 12px;
                background: rgba(251, 191, 36, 0.1);
                border-radius: 4px;
                margin-bottom: 8px;
            }

            .blind-sight-clause-explanation {
                color: #cbd5e1;
                font-size: 13px;
                line-height: 1.5;
            }

            .blind-sight-clause-mitigation {
                margin-top: 8px;
                padding: 8px 10px;
                background: rgba(34, 197, 94, 0.1);
                border-radius: 4px;
                color: #22c55e;
                font-size: 12px;
            }

            .blind-sight-modal-footer {
                padding: 20px 24px 24px;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .blind-sight-modal-orange .blind-sight-modal-footer {
                border-top: 1px solid rgba(249, 115, 22, 0.3);
            }

            .blind-sight-modal-red .blind-sight-modal-footer {
                border-top: 1px solid rgba(239, 68, 68, 0.3);
            }

            .blind-sight-warning-text {
                color: #94a3b8;
                font-size: 13px;
                text-align: center;
                margin: 0 0 8px 0;
            }

            .blind-sight-countdown-number {
                font-weight: 700;
                font-size: 16px;
                color: #f97316;
            }

            .blind-sight-confirm-section {
                text-align: center;
            }

            .blind-sight-confirm-label {
                color: #f87171;
                font-size: 13px;
                margin: 0 0 10px 0;
            }

            .blind-sight-confirm-input {
                width: 100%;
                padding: 12px 16px;
                font-size: 14px;
                font-family: inherit;
                text-align: center;
                background: rgba(0, 0, 0, 0.4);
                border: 2px solid #4b5563;
                border-radius: 8px;
                color: #fff;
                outline: none;
                transition: border-color 0.3s ease, box-shadow 0.3s ease;
            }

            .blind-sight-confirm-input:focus {
                border-color: #ef4444;
                box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);
            }

            .blind-sight-confirm-input.valid {
                border-color: #22c55e;
                box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.2);
            }

            .blind-sight-confirm-input.invalid {
                animation: blindSightShake 0.3s ease-in-out;
            }

            .blind-sight-proceed-btn {
                width: 100%;
                padding: 14px 24px;
                font-size: 14px;
                font-weight: 600;
                color: #fff;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.3s ease;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .blind-sight-proceed-orange {
                background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%);
            }

            .blind-sight-proceed-red {
                background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
            }

            .blind-sight-proceed-btn:disabled {
                background: #374151;
                cursor: not-allowed;
                opacity: 0.7;
            }

            .blind-sight-proceed-btn:not(:disabled):hover {
                transform: translateY(-2px);
            }

            .blind-sight-proceed-orange:not(:disabled):hover {
                background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
                box-shadow: 0 4px 12px rgba(249, 115, 22, 0.4);
            }

            .blind-sight-proceed-red:not(:disabled):hover {
                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
            }

            .blind-sight-abort-btn {
                width: 100%;
                padding: 12px 24px;
                font-size: 13px;
                font-weight: 600;
                color: #10b981;
                background: transparent;
                border: 2px solid #10b981;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .blind-sight-abort-btn:hover {
                background: rgba(16, 185, 129, 0.15);
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
            }

            .blind-sight-modal::-webkit-scrollbar, 
            .blind-sight-clauses::-webkit-scrollbar {
                width: 8px;
            }

            .blind-sight-modal::-webkit-scrollbar-track, 
            .blind-sight-clauses::-webkit-scrollbar-track {
                background: rgba(0, 0, 0, 0.2);
                border-radius: 4px;
            }

            .blind-sight-modal-orange::-webkit-scrollbar-thumb {
                background: rgba(249, 115, 22, 0.5);
                border-radius: 4px;
            }

            .blind-sight-modal-red::-webkit-scrollbar-thumb {
                background: rgba(239, 68, 68, 0.5);
                border-radius: 4px;
            }

            .blind-sight-alternatives {
                padding: 16px 24px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            }

            .blind-sight-alt-header {
                display: flex;
                align-items: center;
                gap: 8px;
                color: #10b981;
                font-size: 14px;
                font-weight: 600;
                margin-bottom: 12px;
            }

            .blind-sight-alt-header-icon {
                font-size: 16px;
            }

            .blind-sight-alt-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .blind-sight-alt-card {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px;
                background: rgba(16, 185, 129, 0.08);
                border: 1px solid rgba(16, 185, 129, 0.2);
                border-radius: 8px;
                text-decoration: none;
                color: inherit;
                transition: all 0.2s ease;
            }

            .blind-sight-alt-card:hover {
                background: rgba(16, 185, 129, 0.15);
                border-color: rgba(16, 185, 129, 0.4);
                transform: translateX(4px);
            }

            .blind-sight-alt-icon {
                font-size: 24px;
                flex-shrink: 0;
            }

            .blind-sight-alt-info {
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 2px;
                min-width: 0;
            }

            .blind-sight-alt-name {
                font-weight: 600;
                color: #10b981;
                font-size: 14px;
            }

            .blind-sight-alt-reason {
                font-size: 12px;
                color: #94a3b8;
                line-height: 1.4;
            }

            .blind-sight-alt-arrow {
                color: #10b981;
                font-size: 16px;
                flex-shrink: 0;
                opacity: 0.6;
                transition: opacity 0.2s ease, transform 0.2s ease;
            }

            .blind-sight-alt-card:hover .blind-sight-alt-arrow {
                opacity: 1;
                transform: translateX(2px);
            }
        `;
        document.head.appendChild(styles);
    }

    function showOrangeModal(clauses, options = {}) {
        injectStyles();
        hideWarningModal();
        blockButtons(2);

        const container = document.createElement('div');
        container.innerHTML = createOrangeModalHTML(clauses, options.category, options.serviceName);
        document.body.appendChild(container.firstElementChild);

        let countdown = ORANGE_COUNTDOWN_SECONDS;
        const countdownEl = document.getElementById('blind-sight-countdown');
        const proceedBtn = document.getElementById('blind-sight-proceed-btn');
        const abortBtn = document.getElementById('blind-sight-abort-btn');

        const countdownInterval = setInterval(() => {
            countdown--;
            if (countdownEl) {
                countdownEl.textContent = countdown;
            }
            if (proceedBtn) {
                proceedBtn.textContent = `⏳ Wait ${countdown} second${countdown !== 1 ? 's' : ''}...`;
            }

            if (countdown <= 0) {
                clearInterval(countdownInterval);
                if (proceedBtn) {
                    proceedBtn.disabled = false;
                    proceedBtn.textContent = '✓ I\'ve Read the Terms - Proceed';
                }
            }
        }, 1000);

        if (proceedBtn) {
            proceedBtn.addEventListener('click', () => {
                clearInterval(countdownInterval);
                hideWarningModal();
                unblockButtons();
            });
        }

        if (abortBtn) {
            abortBtn.addEventListener('click', () => {
                clearInterval(countdownInterval);
                window.close();
                setTimeout(() => {
                    window.history.back();
                }, 100);
            });
        }
    }

    function showRedModal(clauses, options = {}) {
        injectStyles();
        hideWarningModal();
        blockButtons(3);

        const container = document.createElement('div');
        container.innerHTML = createRedModalHTML(clauses, options.category, options.serviceName);
        document.body.appendChild(container.firstElementChild);

        const confirmInput = document.getElementById('blind-sight-confirm-input');
        const proceedBtn = document.getElementById('blind-sight-proceed-btn');
        const abortBtn = document.getElementById('blind-sight-abort-btn');

        if (confirmInput) {
            confirmInput.addEventListener('input', (e) => {
                const value = e.target.value.toUpperCase().trim();
                const isValid = value === CONFIRMATION_PHRASE;

                confirmInput.classList.remove('valid', 'invalid');

                if (isValid) {
                    confirmInput.classList.add('valid');
                    if (proceedBtn) {
                        proceedBtn.disabled = false;
                        proceedBtn.textContent = '🔓 Proceed at My Own Risk';
                    }
                } else {
                    if (proceedBtn) {
                        proceedBtn.disabled = true;
                        proceedBtn.textContent = '🔒 Type "I PROCEED" to Unlock';
                    }
                }
            });

            confirmInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && confirmInput.value.toUpperCase().trim() !== CONFIRMATION_PHRASE) {
                    confirmInput.classList.add('invalid');
                    setTimeout(() => confirmInput.classList.remove('invalid'), 300);
                }
            });
        }

        if (proceedBtn) {
            proceedBtn.addEventListener('click', () => {
                if (!proceedBtn.disabled) {
                    hideWarningModal();
                    unblockButtons();
                }
            });
        }

        if (abortBtn) {
            abortBtn.addEventListener('click', () => {
                window.close();
                setTimeout(() => {
                    window.history.back();
                }, 100);
            });
        }
    }

    function showWarningModal(clauses, severity = 3, options = {}) {
        if (severity >= 3) {
            showRedModal(clauses, options);
        } else if (severity >= 2) {
            showOrangeModal(clauses, options);
        } else {
        }
    }

    function hideWarningModal() {
        const overlay = document.getElementById(OVERLAY_ID);
        if (overlay) {
            overlay.remove();
        }
    }

    function isModalVisible() {
        return document.getElementById(MODAL_ID) !== null;
    }

    window.BlindSightBlocker = {
        blockButtons,
        unblockButtons,
        findTargetButtons,
        showWarningModal,
        showOrangeModal,
        showRedModal,
        hideWarningModal,
        isModalVisible
    };
})();