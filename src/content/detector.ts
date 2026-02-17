import type { SignupDetection } from '../lib/types';

// ─── Keywords ───────────────────────────────────────────
const SIGNUP_BUTTON_KEYWORDS = [
    'sign up', 'signup', 'register', 'create account', 'create an account',
    'join', 'join now', 'get started', 'start free', 'try free', 'sign in',
];

const TERMS_CHECKBOX_KEYWORDS = [
    'i agree', 'i accept', 'terms of service', 'terms and conditions',
    'privacy policy', 'agree to', 'accept the',
];

function matchesKeywords(text: string, keywords: string[]): boolean {
    if (!text) return false;
    const lower = text.toLowerCase().trim();
    return keywords.some((kw) => lower.includes(kw));
}

// ─── Finders ────────────────────────────────────────────
function findPasswordFields(): HTMLInputElement[] {
    return Array.from(document.querySelectorAll<HTMLInputElement>('input[type="password"]'));
}

function findEmailFields(): HTMLInputElement[] {
    const fields: HTMLInputElement[] = [];
    fields.push(...document.querySelectorAll<HTMLInputElement>('input[type="email"]'));

    const allInputs = document.querySelectorAll<HTMLInputElement>('input[type="text"], input:not([type])');
    for (const input of allInputs) {
        const name = (input.name ?? '').toLowerCase();
        const id = (input.id ?? '').toLowerCase();
        const placeholder = (input.placeholder ?? '').toLowerCase();
        const autocomplete = (input.autocomplete ?? '').toLowerCase();

        if (name.includes('email') || id.includes('email') || placeholder.includes('email') || autocomplete.includes('email')) {
            fields.push(input);
        }
    }
    return fields;
}

function findSignupButtons(): (HTMLElement)[] {
    const buttons: HTMLElement[] = [];

    document.querySelectorAll<HTMLElement>('button, input[type="submit"], input[type="button"], [role="button"]').forEach((btn) => {
        const text = btn.textContent || (btn as HTMLInputElement).value || '';
        if (matchesKeywords(text, SIGNUP_BUTTON_KEYWORDS)) buttons.push(btn);
    });

    document.querySelectorAll<HTMLAnchorElement>('a').forEach((link) => {
        if (matchesKeywords(link.textContent ?? '', SIGNUP_BUTTON_KEYWORDS)) buttons.push(link);
    });

    return buttons;
}

function findTermsCheckboxes(): HTMLInputElement[] {
    const result: HTMLInputElement[] = [];

    document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((checkbox) => {
        const label = document.querySelector<HTMLLabelElement>(`label[for="${checkbox.id}"]`) ?? checkbox.closest('label');
        if (label && matchesKeywords(label.textContent ?? '', TERMS_CHECKBOX_KEYWORDS)) {
            result.push(checkbox);
            return;
        }
        const parent = checkbox.parentElement;
        if (parent && matchesKeywords(parent.textContent ?? '', TERMS_CHECKBOX_KEYWORDS)) {
            result.push(checkbox);
        }
    });

    return result;
}

function hasSignupForm(): boolean {
    for (const form of document.querySelectorAll('form')) {
        const action = (form.action ?? '').toLowerCase();
        const html = form.innerHTML.toLowerCase();
        if (['signup', 'register', 'create', 'join'].some((k) => action.includes(k))) return true;
        if (['create account', 'sign up', 'register'].some((k) => html.includes(k))) return true;
    }
    return false;
}

// ─── Detection ──────────────────────────────────────────
export function getSignupConfidence(): { score: number; indicators: string[]; details: SignupDetection['details'] } {
    const passwordFields = findPasswordFields();
    const emailFields = findEmailFields();
    const signupButtons = findSignupButtons();
    const termsCheckboxes = findTermsCheckboxes();
    const hasForm = hasSignupForm();

    let score = 0;
    const indicators: string[] = [];

    if (passwordFields.length > 0) { score += 25; indicators.push('password_field'); }
    if (emailFields.length > 0) { score += 20; indicators.push('email_field'); }
    if (passwordFields.length >= 2) { score += 30; indicators.push('confirm_password'); }
    if (signupButtons.length > 0) { score += 30; indicators.push('signup_button'); }
    if (termsCheckboxes.length > 0) { score += 25; indicators.push('terms_checkbox'); }
    if (hasForm) { score += 10; indicators.push('signup_form'); }

    const pageTitle = document.title.toLowerCase();
    const pageUrl = window.location.href.toLowerCase();

    if (['sign up', 'register', 'create account', 'join'].some((k) => pageTitle.includes(k))) {
        score += 20; indicators.push('title_match');
    }
    if (['signup', 'register', 'join', 'create'].some((k) => pageUrl.includes(k))) {
        score += 20; indicators.push('url_match');
    }

    return {
        score: Math.min(score, 100),
        indicators,
        details: {
            passwordFields: passwordFields.length,
            emailFields: emailFields.length,
            signupButtons: signupButtons.length,
            termsCheckboxes: termsCheckboxes.length,
            hasForm,
        },
    };
}

export function isSignupPage(threshold = 50): boolean {
    return getSignupConfidence().score >= threshold;
}

export function getSignupDetectionResult(threshold = 50): SignupDetection {
    const result = getSignupConfidence();
    return { isSignup: result.score >= threshold, ...result };
}
