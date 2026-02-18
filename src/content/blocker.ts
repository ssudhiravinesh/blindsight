import type { Clause, SeverityKey } from '../lib/types';
import { getAlternatives } from '../lib/alternatives';

// ─── Constants ──────────────────────────────────────────
const OVERLAY_ID = 'blind-sight-overlay';
const MODAL_ID = 'blind-sight-modal';
const ORANGE_COUNTDOWN_SECONDS = 5;
const CONFIRMATION_PHRASE = 'I PROCEED';
const BLOCKED_ATTR = 'data-blind-sight-blocked';

let blockedButtons: HTMLElement[] = [];

// ─── Button blocking ───────────────────────────────────
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

// ─── Styles injection ───────────────────────────────────
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
  `;
    document.head.appendChild(styles);
}

// ─── Modal HTML builders ────────────────────────────────
function createClausesHTML(clauses: Clause[], severityClass: 'orange' | 'red'): string {
    return clauses
        .map((c) => `<li class="bs-clause-item ${severityClass}">${c.explanation ?? c.quote ?? 'Concerning clause'}</li>`)
        .join('');
}

function createAlternativesHTML(category?: string): string {
    if (!category) return '';
    const alts = getAlternatives(category);
    if (!alts.alternatives.length) return '';

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
