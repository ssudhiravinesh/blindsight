import type { SignupDetection } from '../lib/types';

const SIGNUP_BUTTON_KEYWORDS = [
    'sign up', 'signup', 'register', 'create account', 'create an account',
    'join', 'join now', 'get started', 'start free', 'try free',
    'sign in', 'signin', 'log in', 'login', 'next', 'continue',
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

function findPasswordFields(): HTMLInputElement[] {
    return Array.from(document.querySelectorAll<HTMLInputElement>('input[type="password"]'));
}

function findEmailFields(): HTMLInputElement[] {
    const fields: HTMLInputElement[] = [];
    document.querySelectorAll<HTMLInputElement>('input[type="email"]').forEach(el => fields.push(el));

    const allInputs = document.querySelectorAll<HTMLInputElement>('input[type="text"], input:not([type])');
    for (const input of allInputs) {
        const name = (input.name ?? '').toLowerCase();
        const id = (input.id ?? '').toLowerCase();
        const placeholder = (input.placeholder ?? '').toLowerCase();
        const autocomplete = (input.autocomplete ?? '').toLowerCase();
        const ariaLabel = (input.getAttribute('aria-label') ?? '').toLowerCase();

        const isIdentity = ['email', 'user', 'login', 'identifier', 'phone'].some(k =>
            name.includes(k) || id.includes(k) || placeholder.includes(k) || autocomplete.includes(k) || ariaLabel.includes(k)
        );

        if (isIdentity) {
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
        if (['signup', 'register', 'create', 'join', 'login', 'signin', 'auth'].some((k) => action.includes(k))) return true;
        if (['create account', 'sign up', 'register', 'log in', 'sign in', 'next', 'continue'].some((k) => html.includes(k))) return true;
    }
    return false;
}

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

    if (['sign up', 'signup', 'register', 'create', 'join', 'login', 'signin', 'log in', 'sign in'].some((k) => pageTitle.includes(k))) {
        score += 20; indicators.push('title_match');
    }
    if (['signup', 'register', 'join', 'create', 'login', 'signin', 'auth'].some((k) => pageUrl.includes(k))) {
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

export function isSignupPage(threshold = 35): boolean {
    return getSignupConfidence().score >= threshold;
}

export function getSignupDetectionResult(threshold = 35): SignupDetection {
    const result = getSignupConfidence();
    return { isSignup: result.score >= threshold, ...result };
}
