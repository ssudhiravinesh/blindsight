import type { Clause, SeverityKey, ScanResult, AISuggestedAlternative } from '../lib/types';
import { getAlternatives } from '../lib/alternatives';

const OVERLAY_ID = 'blind-sight-overlay';
const MODAL_ID = 'blind-sight-modal';
const PROMPT_BANNER_ID = 'blind-sight-prompt-banner';
const ORANGE_COUNTDOWN_SECONDS = 5;
const CONFIRMATION_PHRASE = 'I PROCEED';
const BLOCKED_ATTR = 'data-blind-sight-blocked';

let blockedButtons: HTMLElement[] = [];

function findTargetButtons(): HTMLElement[] {
    const buttons: HTMLElement[] = [];
    const selectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:not([type="button"])',
        '[role="button"]',
        '.btn-primary',
        '.signup-btn',
        '.register-btn',
        '.submit-btn',
    ];

    for (const sel of selectors) {
        document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
            const text = (el.textContent ?? '').toLowerCase();
            const value = ((el as HTMLInputElement).value ?? '').toLowerCase();
            const combined = `${text} ${value}`;

            const keywords = [
                'sign up', 'signup', 'register', 'create account', 'join', 'agree',
                'accept', 'submit', 'continue', 'get started', 'start',
            ];

            if (keywords.some((kw) => combined.includes(kw))) {
                buttons.push(el);
            }
        });
    }

    const unique = Array.from(new Set(buttons));
    return unique.slice(0, 5);
}

function blockButtons(severity: SeverityKey): void {
    const buttons = findTargetButtons();
    if (buttons.length === 0) return;

    blockedButtons = buttons;
    for (const btn of buttons) {
        btn.setAttribute(BLOCKED_ATTR, String(severity));
        btn.style.pointerEvents = 'none';
        btn.style.opacity = '0.5';
        btn.style.filter = 'grayscale(100%)';
        btn.style.cursor = 'not-allowed';
    }
}

function unblockButtons(): void {
    for (const btn of blockedButtons) {
        btn.removeAttribute(BLOCKED_ATTR);
        btn.style.pointerEvents = '';
        btn.style.opacity = '';
        btn.style.filter = '';
        btn.style.cursor = '';
    }
    blockedButtons = [];
}

function injectStyles(): void {
    if (document.getElementById('blind-sight-blocker-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'blind-sight-blocker-styles';
    styles.textContent = `
    #${OVERLAY_ID}{position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:2147483646;display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
    #${MODAL_ID}{background:#1a1a2e;border-radius:16px;width:90%;max-width:480px;max-height:85vh;overflow-y:auto;box-shadow:0 25px 50px rgba(0,0,0,0.5);animation:bs-slide-in 0.3s ease}
    @keyframes bs-slide-in{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
    .bs-modal-header{padding:20px 24px;border-bottom:1px solid rgba(255,255,255,0.08)}
    .bs-modal-header.orange{background:linear-gradient(135deg,rgba(249,115,22,0.15),rgba(234,179,8,0.1))}
    .bs-modal-header.red{background:linear-gradient(135deg,rgba(239,68,68,0.2),rgba(220,38,38,0.1))}
    .bs-modal-title{font-size:18px;font-weight:700;color:#fff;margin:0 0 4px}
    .bs-modal-subtitle{font-size:13px;color:#94a3b8}
    .bs-modal-body{padding:16px 24px}
    .bs-clause-list{list-style:none;padding:0;margin:0 0 16px}
    .bs-clause-item{padding:10px 12px;background:rgba(255,255,255,0.04);border-radius:8px;margin-bottom:6px;font-size:13px;color:#e2e8f0;line-height:1.5;border-left:3px solid}
    .bs-clause-item.orange{border-color:#f97316}
    .bs-clause-item.red{border-color:#ef4444}
    .bs-modal-footer{padding:16px 24px 20px;display:flex;flex-direction:column;gap:8px}
    .bs-btn{padding:10px 16px;border-radius:10px;border:none;font-size:14px;font-weight:600;cursor:pointer;text-align:center;transition:all 0.2s}
    .bs-btn:disabled{opacity:0.5;cursor:not-allowed}
    .bs-btn-abort{background:rgba(239,68,68,0.15);color:#ef4444;border:1px solid rgba(239,68,68,0.3)}
    .bs-btn-abort:hover{background:rgba(239,68,68,0.25)}
    .bs-btn-proceed{background:rgba(255,255,255,0.08);color:#94a3b8;border:1px solid rgba(255,255,255,0.1)}
    .bs-btn-proceed:hover:not(:disabled){background:rgba(255,255,255,0.12);color:#fff}
    .bs-confirm-input{width:100%;padding:10px 12px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:8px;color:#fff;font-size:14px;text-align:center;letter-spacing:2px;outline:none;box-sizing:border-box;margin-bottom:8px}
    .bs-confirm-input:focus{border-color:#6366f1}
    .bs-confirm-input.valid{border-color:#22c55e;background:rgba(34,197,94,0.08)}
    .bs-confirm-input.invalid{border-color:#ef4444;animation:bs-shake 0.3s ease}
    @keyframes bs-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
    .bs-confirm-label{font-size:12px;color:#94a3b8;text-align:center;margin-bottom:8px}
    .bs-alt-section{margin-top:12px;padding:12px;background:rgba(34,197,94,0.05);border-radius:10px;border:1px solid rgba(34,197,94,0.15)}
    .bs-alt-title{font-size:13px;font-weight:600;color:#22c55e;margin-bottom:8px}
    .bs-alt-card{display:flex;align-items:center;gap:10px;padding:8px 10px;background:rgba(255,255,255,0.04);border-radius:8px;margin-bottom:4px;text-decoration:none;transition:background 0.2s}
    .bs-alt-card:hover{background:rgba(255,255,255,0.08)}
    .bs-alt-icon{font-size:18px;flex-shrink:0}
    .bs-alt-info{flex:1;min-width:0}
    .bs-alt-name{font-weight:600;color:#10b981;font-size:14px}
    .bs-alt-reason{font-size:12px;color:#94a3b8;line-height:1.4}
    .bs-alt-arrow{color:#10b981;font-size:16px;flex-shrink:0;opacity:0.6;transition:opacity 0.2s,transform 0.2s}
    .bs-alt-card:hover .bs-alt-arrow{opacity:1;transform:translateX(2px)}
    #${PROMPT_BANNER_ID}{position:fixed;top:0;left:0;right:0;z-index:2147483645;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;animation:bs-banner-slide-in 0.4s cubic-bezier(0.16,1,0.3,1)}
    @keyframes bs-banner-slide-in{from{transform:translateY(-100%);opacity:0}to{transform:translateY(0);opacity:1}}
    @keyframes bs-banner-slide-out{from{transform:translateY(0);opacity:1}to{transform:translateY(-100%);opacity:0}}
    .bs-prompt-inner{display:flex;align-items:center;gap:14px;padding:14px 20px;background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);border-bottom:1px solid rgba(99,102,241,0.3);box-shadow:0 4px 24px rgba(0,0,0,0.4)}
    .bs-prompt-icon{font-size:22px;flex-shrink:0;filter:drop-shadow(0 0 6px rgba(99,102,241,0.4))}
    .bs-prompt-text{flex:1;min-width:0}
    .bs-prompt-title{font-size:14px;font-weight:700;color:#e2e8f0;margin:0 0 2px}
    .bs-prompt-subtitle{font-size:12px;color:#94a3b8;margin:0}
    .bs-prompt-actions{display:flex;gap:8px;flex-shrink:0}
    .bs-prompt-scan-btn{padding:8px 18px;border-radius:8px;border:none;font-size:13px;font-weight:700;cursor:pointer;background:linear-gradient(135deg,#6366f1,#818cf8);color:#fff;transition:all 0.2s;box-shadow:0 2px 8px rgba(99,102,241,0.3)}
    .bs-prompt-scan-btn:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(99,102,241,0.5)}
    .bs-prompt-dismiss-btn{padding:8px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.06);color:#94a3b8;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s}
    .bs-prompt-dismiss-btn:hover{background:rgba(255,255,255,0.12);color:#e2e8f0}
    #bs-result-card{position:fixed;top:16px;right:16px;z-index:2147483645;width:360px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;animation:bs-result-fade-in 0.4s cubic-bezier(0.16,1,0.3,1)}
    @keyframes bs-result-fade-in{from{transform:translateY(-12px) scale(0.96);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}
    @keyframes bs-result-fade-out{from{transform:translateY(0) scale(1);opacity:1}to{transform:translateY(-12px) scale(0.96);opacity:0}}
    .bs-result-inner{border-radius:14px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.5),0 0 0 1px rgba(255,255,255,0.06)}
    .bs-result-header{padding:16px 18px;display:flex;align-items:center;gap:12px}
    .bs-result-header.safe{background:linear-gradient(135deg,#0a2e1a,#1a1a2e)}
    .bs-result-header.notable{background:linear-gradient(135deg,#2e2a0a,#1a1a2e)}
    .bs-result-header.caution{background:linear-gradient(135deg,#2e1a0a,#1a1a2e)}
    .bs-result-header.danger{background:linear-gradient(135deg,#2e0a0a,#1a1a2e)}
    .bs-result-header.error{background:linear-gradient(135deg,#2e0a0a,#1a1a2e)}
    .bs-result-header.scanning{background:linear-gradient(135deg,#0a1a2e,#1a1a2e)}
    #bs-scanning-banner{position:fixed;top:0;left:0;right:0;z-index:2147483645;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;animation:bs-banner-slide-in 0.4s cubic-bezier(0.16,1,0.3,1)}
    .bs-scanning-inner{display:flex;align-items:center;gap:12px;padding:12px 20px;background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);border-bottom:1px solid rgba(99,102,241,0.3);box-shadow:0 4px 24px rgba(0,0,0,0.4)}
    .bs-scanning-spinner{width:20px;height:20px;border:2.5px solid rgba(99,102,241,0.2);border-top-color:#818cf8;border-radius:50%;animation:bs-spin 0.8s linear infinite}
    @keyframes bs-spin{to{transform:rotate(360deg)}}
    .bs-scanning-text{font-size:13px;font-weight:600;color:#e2e8f0}
    .bs-scanning-sub{font-size:11px;color:#94a3b8;margin-left:auto}
    .bs-result-icon{font-size:28px;flex-shrink:0}
    .bs-result-info{flex:1;min-width:0}
    .bs-result-title{font-size:15px;font-weight:700;color:#fff;margin:0 0 2px}
    .bs-result-msg{font-size:12px;color:#94a3b8;margin:0;line-height:1.4}
    .bs-result-close{background:none;border:none;color:#64748b;font-size:18px;cursor:pointer;padding:4px;line-height:1;transition:color 0.2s}
    .bs-result-close:hover{color:#e2e8f0}
    .bs-result-body{padding:12px 18px;background:#1a1a2e}
    .bs-result-clauses{list-style:none;padding:0;margin:0}
    .bs-result-clause{padding:8px 10px;background:rgba(255,255,255,0.04);border-radius:6px;margin-bottom:4px;font-size:12px;color:#cbd5e1;line-height:1.4;border-left:2px solid}
    .bs-result-clause.green{border-color:#22c55e}
    .bs-result-clause.yellow{border-color:#eab308}
    .bs-result-clause.orange{border-color:#f97316}
    .bs-result-clause.red{border-color:#ef4444}
    .bs-result-footer{padding:10px 18px;background:#151525;text-align:center}
    .bs-result-footer p{font-size:10px;color:#64748b;margin:0}
    .bs-result-grade{display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:10px;font-size:18px;font-weight:800;flex-shrink:0}
    .bs-result-grade.safe{background:rgba(34,197,94,0.15);color:#22c55e}
    .bs-result-grade.notable{background:rgba(234,179,8,0.15);color:#eab308}
    .bs-result-grade.caution{background:rgba(249,115,22,0.15);color:#f97316}
    .bs-result-grade.danger{background:rgba(239,68,68,0.15);color:#ef4444}
  `;
    document.head.appendChild(styles);
}

function createClausesHTML(clauses: Clause[], severityClass: 'orange' | 'red'): string {
    return clauses
        .map((c) => `<li class="bs-clause-item ${severityClass}">${c.explanation ?? c.quote ?? 'Concerning clause'}</li>`)
        .join('');
}

function createAlternativesHTML(category?: string, hostname?: string, aiAlternatives?: AISuggestedAlternative[]): string {
    if (category) {
        const alts = getAlternatives(category, hostname);
        if (alts.displayName !== 'Online Service' && alts.alternatives.length) {
            return `
            <div class="bs-alt-section">
              <div class="bs-alt-title">🛡️ Safer ${alts.displayName} Alternatives</div>
              ${alts.alternatives.slice(0, 3).map((alt) => `
                <a href="${alt.url}" target="_blank" rel="noopener noreferrer" class="bs-alt-card">
                  <span class="bs-alt-icon">${alt.icon}</span>
                  <div class="bs-alt-info">
                    <div class="bs-alt-name">${alt.name}</div>
                    <div class="bs-alt-reason">${alt.reason}</div>
                  </div>
                  <span class="bs-alt-arrow">→</span>
                </a>
              `).join('')}
            </div>`;
        }
    }

    if (aiAlternatives && aiAlternatives.length > 0) {
        return `
        <div class="bs-alt-section">
          <div class="bs-alt-title">🤖 AI-Suggested Alternatives</div>
          ${aiAlternatives.slice(0, 3).map((alt) => `
            <a href="${alt.url}" target="_blank" rel="noopener noreferrer" class="bs-alt-card">
              <span class="bs-alt-icon">🔗</span>
              <div class="bs-alt-info">
                <div class="bs-alt-name">${alt.name}</div>
                <div class="bs-alt-reason">${alt.reason}</div>
              </div>
              <span class="bs-alt-arrow">→</span>
            </a>
          `).join('')}
          <div style="font-size:10px;color:#64748b;text-align:center;margin-top:6px;">AI-suggested — verify before visiting</div>
        </div>`;
    }

    return '';
}

function createOrangeModalHTML(clauses: Clause[], category?: string, serviceName?: string, hostname?: string, aiAlternatives?: AISuggestedAlternative[]): string {
    const name = serviceName ?? 'this service';
    return `
    <div id="${OVERLAY_ID}">
      <div id="${MODAL_ID}">
        <div class="bs-modal-header orange">
          <div class="bs-modal-title">⚠️ Cautionary Terms Detected</div>
          <div class="bs-modal-subtitle">Blind-Sight found concerning terms in ${name}'s agreement</div>
        </div>
        <div class="bs-modal-body">
          <ul class="bs-clause-list">${createClausesHTML(clauses, 'orange')}</ul>
          ${createAlternativesHTML(category, hostname, aiAlternatives)}
        </div>
        <div class="bs-modal-footer">
          <button id="blind-sight-abort-btn" class="bs-btn bs-btn-abort">✕ Leave This Page</button>
          <button id="blind-sight-proceed-btn" class="bs-btn bs-btn-proceed" disabled>⏳ Wait <span id="blind-sight-countdown">${ORANGE_COUNTDOWN_SECONDS}</span> seconds...</button>
        </div>
      </div>
    </div>`;
}

function createRedModalHTML(clauses: Clause[], category?: string, serviceName?: string, hostname?: string, aiAlternatives?: AISuggestedAlternative[]): string {
    const name = serviceName ?? 'this service';
    return `
    <div id="${OVERLAY_ID}">
      <div id="${MODAL_ID}">
        <div class="bs-modal-header red">
          <div class="bs-modal-title">🚨 Critical Terms — High Risk</div>
          <div class="bs-modal-subtitle">Blind-Sight detected aggressive terms in ${name}'s agreement</div>
        </div>
        <div class="bs-modal-body">
          <ul class="bs-clause-list">${createClausesHTML(clauses, 'red')}</ul>
          ${createAlternativesHTML(category, hostname, aiAlternatives)}
          <div class="bs-confirm-label">Type <strong>"I PROCEED"</strong> to unlock</div>
          <input id="blind-sight-confirm-input" class="bs-confirm-input" type="text" placeholder="Type here..." autocomplete="off" />
        </div>
        <div class="bs-modal-footer">
          <button id="blind-sight-abort-btn" class="bs-btn bs-btn-abort">✕ Leave This Page</button>
          <button id="blind-sight-proceed-btn" class="bs-btn bs-btn-proceed" disabled>🔒 Type "I PROCEED" to Unlock</button>
        </div>
      </div>
    </div>`;
}

function showOrangeModal(clauses: Clause[], options: { category?: string; serviceName?: string; hostname?: string; aiAlternatives?: AISuggestedAlternative[] } = {}): void {
    injectStyles();
    hideWarningModal();
    blockButtons(2);

    const container = document.createElement('div');
    container.innerHTML = createOrangeModalHTML(clauses, options.category, options.serviceName, options.hostname, options.aiAlternatives);
    document.body.appendChild(container.firstElementChild!);

    let countdown = ORANGE_COUNTDOWN_SECONDS;
    const countdownEl = document.getElementById('blind-sight-countdown');
    const proceedBtn = document.getElementById('blind-sight-proceed-btn') as HTMLButtonElement | null;
    const abortBtn = document.getElementById('blind-sight-abort-btn');

    const countdownInterval = setInterval(() => {
        countdown--;
        if (countdownEl) countdownEl.textContent = String(countdown);
        if (proceedBtn) proceedBtn.textContent = `⏳ Wait ${countdown} second${countdown !== 1 ? 's' : ''}...`;

        if (countdown <= 0) {
            clearInterval(countdownInterval);
            if (proceedBtn) {
                proceedBtn.disabled = false;
                proceedBtn.textContent = "✓ I've Read the Terms - Proceed";
            }
        }
    }, 1000);

    proceedBtn?.addEventListener('click', () => {
        clearInterval(countdownInterval);
        hideWarningModal();
        unblockButtons();
    });

    abortBtn?.addEventListener('click', () => {
        clearInterval(countdownInterval);
        window.close();
        setTimeout(() => window.history.back(), 100);
    });
}

function showRedModal(clauses: Clause[], options: { category?: string; serviceName?: string; hostname?: string; aiAlternatives?: AISuggestedAlternative[] } = {}): void {
    injectStyles();
    hideWarningModal();
    blockButtons(3);

    const container = document.createElement('div');
    container.innerHTML = createRedModalHTML(clauses, options.category, options.serviceName, options.hostname, options.aiAlternatives);
    document.body.appendChild(container.firstElementChild!);

    const confirmInput = document.getElementById('blind-sight-confirm-input') as HTMLInputElement | null;
    const proceedBtn = document.getElementById('blind-sight-proceed-btn') as HTMLButtonElement | null;
    const abortBtn = document.getElementById('blind-sight-abort-btn');

    confirmInput?.addEventListener('input', (e) => {
        const value = (e.target as HTMLInputElement).value.toUpperCase().trim();
        const isValid = value === CONFIRMATION_PHRASE;

        confirmInput.classList.remove('valid', 'invalid');
        if (isValid) {
            confirmInput.classList.add('valid');
            if (proceedBtn) {
                proceedBtn.disabled = false;
                proceedBtn.textContent = '🔓 Proceed at My Own Risk';
            }
        } else if (proceedBtn) {
            proceedBtn.disabled = true;
            proceedBtn.textContent = '🔒 Type "I PROCEED" to Unlock';
        }
    });

    confirmInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && confirmInput.value.toUpperCase().trim() !== CONFIRMATION_PHRASE) {
            confirmInput.classList.add('invalid');
            setTimeout(() => confirmInput.classList.remove('invalid'), 300);
        }
    });

    proceedBtn?.addEventListener('click', () => {
        if (!proceedBtn.disabled) { hideWarningModal(); unblockButtons(); }
    });

    abortBtn?.addEventListener('click', () => {
        window.close();
        setTimeout(() => window.history.back(), 100);
    });
}

export function showWarningModal(
    clauses: Clause[],
    severity: SeverityKey = 3,
    options: { category?: string; serviceName?: string; hostname?: string; aiAlternatives?: AISuggestedAlternative[] } = {},
): void {
    if (severity >= 3) showRedModal(clauses, options);
    else if (severity >= 2) showOrangeModal(clauses, options);
}

export function hideWarningModal(): void {
    document.getElementById(OVERLAY_ID)?.remove();
}

export function isModalVisible(): boolean {
    return document.getElementById(MODAL_ID) !== null;
}

export function attachAgreementListeners(): void {
    const buttons = findTargetButtons();
    for (const btn of buttons) {
        if (btn.hasAttribute('data-bs-listening')) continue;
        btn.setAttribute('data-bs-listening', 'true');

        btn.addEventListener('click', () => {
            if (!btn.hasAttribute(BLOCKED_ATTR)) {
                console.log('[Blind-Sight] User clicked agreement button. Tracking ToS...');
                chrome.runtime.sendMessage({
                    type: 'TRACK_TOS_AGREEMENT',
                    domain: window.location.hostname.replace('www.', '')
                });
            }
        });
    }
}

export function showPreScanPrompt(): Promise<boolean> {
    return new Promise((resolve) => {
        if (document.getElementById(PROMPT_BANNER_ID)) {
            resolve(false);
            return;
        }

        injectStyles();

        const banner = document.createElement('div');
        banner.id = PROMPT_BANNER_ID;
        banner.innerHTML = `
          <div class="bs-prompt-inner">
            <span class="bs-prompt-icon">🛡️</span>
            <div class="bs-prompt-text">
              <p class="bs-prompt-title">Sign-up page detected</p>
              <p class="bs-prompt-subtitle">Would you like Blind-Sight to scan the Terms of Service before you continue?</p>
            </div>
            <div class="bs-prompt-actions">
              <button id="bs-prompt-scan" class="bs-prompt-scan-btn">Scan Terms</button>
              <button id="bs-prompt-dismiss" class="bs-prompt-dismiss-btn">✕</button>
            </div>
          </div>`;

        document.body.appendChild(banner);

        const cleanup = (userWantsScan: boolean) => {
            banner.style.animation = 'bs-banner-slide-out 0.3s ease forwards';
            banner.addEventListener('animationend', () => banner.remove(), { once: true });
            setTimeout(() => banner.remove(), 400);
            resolve(userWantsScan);
        };

        document.getElementById('bs-prompt-scan')?.addEventListener('click', () => cleanup(true));
        document.getElementById('bs-prompt-dismiss')?.addEventListener('click', () => cleanup(false));
    });
}

export function hidePreScanPrompt(): void {
    const banner = document.getElementById(PROMPT_BANNER_ID);
    if (banner) {
        banner.style.animation = 'bs-banner-slide-out 0.3s ease forwards';
        banner.addEventListener('animationend', () => banner.remove(), { once: true });
        setTimeout(() => banner.remove(), 400);
    }
}

const RESULT_CARD_ID = 'bs-result-card';
const RESULT_AUTO_DISMISS_MS = 8000;

const RESULT_CONFIG: Record<SeverityKey, { icon: string; title: string; message: string; grade: string; cls: string }> = {
    0: { icon: '✅', title: 'Terms Look Good', message: "Standard, industry-normal terms. You're good to go!", grade: 'A', cls: 'safe' },
    1: { icon: '📝', title: 'Notable Terms', message: 'Some terms worth knowing about, but common practice.', grade: 'B', cls: 'notable' },
    2: { icon: '⚠️', title: 'Proceed with Caution', message: 'Unusual terms detected. Review before accepting.', grade: 'C', cls: 'caution' },
    3: { icon: '🚨', title: 'Critical Terms Detected', message: 'Aggressive terms found. Proceed at your own risk.', grade: 'F', cls: 'danger' },
};

function clauseSeverityClass(severity: SeverityKey): string {
    return ({ 0: 'green', 1: 'yellow', 2: 'orange', 3: 'red' } as Record<SeverityKey, string>)[severity] ?? 'yellow';
}

export function showScanResultCard(result: ScanResult): void {
    document.getElementById(RESULT_CARD_ID)?.remove();
    injectStyles();

    const severity = (result.overallSeverity ?? 0) as SeverityKey;
    const config = RESULT_CONFIG[severity];
    const serviceName = result.serviceName ?? 'this service';
    const clausesHTML = (result.clauses ?? []).slice(0, 4).map(c =>
        `<li class="bs-result-clause ${clauseSeverityClass(c.severity)}">${c.explanation ?? c.quote ?? 'Concerning clause'}</li>`
    ).join('');

    const card = document.createElement('div');
    card.id = RESULT_CARD_ID;
    card.innerHTML = `
      <div class="bs-result-inner">
        <div class="bs-result-header ${config.cls}">
          <span class="bs-result-icon">${config.icon}</span>
          <div class="bs-result-info">
            <p class="bs-result-title">${config.title}</p>
            <p class="bs-result-msg">${serviceName} — ${config.message}</p>
          </div>
          <div class="bs-result-grade ${config.cls}">${config.grade}</div>
          <button class="bs-result-close" id="bs-result-close">✕</button>
        </div>
        ${clausesHTML ? `<div class="bs-result-body"><ul class="bs-result-clauses">${clausesHTML}</ul></div>` : ''}
        <div class="bs-result-footer"><p>Blind-Sight · Click to dismiss</p></div>
      </div>`;

    document.body.appendChild(card);

    const dismiss = () => {
        card.style.animation = 'bs-result-fade-out 0.3s ease forwards';
        card.addEventListener('animationend', () => card.remove(), { once: true });
        setTimeout(() => card.remove(), 400);
    };

    document.getElementById('bs-result-close')?.addEventListener('click', dismiss);
    card.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('.bs-result-clause')) return;
        dismiss();
    });

    setTimeout(() => {
        if (document.getElementById(RESULT_CARD_ID)) dismiss();
    }, RESULT_AUTO_DISMISS_MS);
}

export function hideResultCard(): void {
    const card = document.getElementById(RESULT_CARD_ID);
    if (card) {
        card.style.animation = 'bs-result-fade-out 0.3s ease forwards';
        card.addEventListener('animationend', () => card.remove(), { once: true });
        setTimeout(() => card.remove(), 400);
    }
}

const SCANNING_BANNER_ID = 'bs-scanning-banner';

export function showScanningBanner(): void {
    document.getElementById(SCANNING_BANNER_ID)?.remove();
    injectStyles();

    const banner = document.createElement('div');
    banner.id = SCANNING_BANNER_ID;
    banner.innerHTML = `
      <div class="bs-scanning-inner">
        <div class="bs-scanning-spinner"></div>
        <span class="bs-scanning-text">Analyzing Terms of Service...</span>
        <span class="bs-scanning-sub">This may take a few seconds</span>
      </div>`;

    document.body.appendChild(banner);
}

export function hideScanningBanner(): void {
    const banner = document.getElementById(SCANNING_BANNER_ID);
    if (banner) {
        banner.style.animation = 'bs-banner-slide-out 0.3s ease forwards';
        banner.addEventListener('animationend', () => banner.remove(), { once: true });
        setTimeout(() => banner.remove(), 400);
    }
}

export function showScanErrorCard(errorMessage: string): void {
    document.getElementById(RESULT_CARD_ID)?.remove();
    injectStyles();

    const card = document.createElement('div');
    card.id = RESULT_CARD_ID;
    card.innerHTML = `
      <div class="bs-result-inner">
        <div class="bs-result-header error">
          <span class="bs-result-icon">❌</span>
          <div class="bs-result-info">
            <p class="bs-result-title">Scan Failed</p>
            <p class="bs-result-msg">${errorMessage}</p>
          </div>
          <button class="bs-result-close" id="bs-result-close">✕</button>
        </div>
        <div class="bs-result-footer"><p>Blind-Sight · Click to dismiss</p></div>
      </div>`;

    document.body.appendChild(card);

    const dismiss = () => {
        card.style.animation = 'bs-result-fade-out 0.3s ease forwards';
        card.addEventListener('animationend', () => card.remove(), { once: true });
        setTimeout(() => card.remove(), 400);
    };

    document.getElementById('bs-result-close')?.addEventListener('click', dismiss);
    card.addEventListener('click', dismiss);
    setTimeout(() => { if (document.getElementById(RESULT_CARD_ID)) dismiss(); }, RESULT_AUTO_DISMISS_MS);
}

export { findTargetButtons, blockButtons, unblockButtons };
