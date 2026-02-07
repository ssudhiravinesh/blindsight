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
