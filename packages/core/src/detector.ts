/**
 * Copyright (c) 2026 Sudhir Avinesh. All rights reserved.
 * Proprietary and Confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 */

import type { SignupDetection } from './types';
import { traverseDOM } from './utils/dom';
import {
    SIGNUP_BUTTON_KEYWORDS,
    LOGIN_BUTTON_KEYWORDS,
    TERMS_CHECKBOX_KEYWORDS,
    SIGNUP_URL_TITLE_KEYWORDS,
    LOGIN_URL_TITLE_KEYWORDS,
    DETECTOR_CONFIG
} from './detector/config';

// Result cache
let cachedResult: { score: number; indicators: string[]; details: SignupDetection['details'] } | null = null;

export function invalidateDetectorCache(): void {
    cachedResult = null;
}

function matchesKeywords(text: string, keywords: string[]): boolean {
    if (!text) return false;
    const lower = text.toLowerCase().trim();
    return keywords.some((kw) => lower.includes(kw));
}


function findPasswordFields(): HTMLInputElement[] {
    const fields: HTMLInputElement[] = [];
    traverseDOM(document.body, (el) => {
        if (el.tagName === 'INPUT' && el.getAttribute('type') === 'password') {
            fields.push(el as HTMLInputElement);
        }
    });
    return fields;
}

function findEmailFields(): HTMLInputElement[] {
    const fields: HTMLInputElement[] = [];
    
    traverseDOM(document.body, (el) => {
        if (el.tagName !== 'INPUT') return;
        const input = el as HTMLInputElement;
        const type = input.getAttribute('type');
        
        if (type === 'email') {
            fields.push(input);
            return;
        }
        
        if (type === 'text' || !type) {
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
    });
    
    return fields;
}

function findSignupButtons(): HTMLElement[] {
    const buttons: HTMLElement[] = [];

    traverseDOM(document.body, (el) => {
        const tagName = el.tagName;
        const type = el.getAttribute('type');
        const role = el.getAttribute('role');

        if (
            tagName === 'BUTTON' ||
            (tagName === 'INPUT' && (type === 'submit' || type === 'button')) ||
            role === 'button'
        ) {
            const text = el.textContent || (el as HTMLInputElement).value || '';
            if (matchesKeywords(text, SIGNUP_BUTTON_KEYWORDS)) {
                buttons.push(el as HTMLElement);
            }
        } else if (tagName === 'A') {
            const text = el.textContent ?? '';
            if (matchesKeywords(text, SIGNUP_BUTTON_KEYWORDS)) {
                buttons.push(el as HTMLElement);
            }
        }
    });

    return buttons;
}

function findLoginButtons(): HTMLElement[] {
    const buttons: HTMLElement[] = [];

    traverseDOM(document.body, (el) => {
        const tagName = el.tagName;
        const type = el.getAttribute('type');
        const role = el.getAttribute('role');

        if (
            tagName === 'BUTTON' ||
            (tagName === 'INPUT' && (type === 'submit' || type === 'button')) ||
            role === 'button'
        ) {
            const text = el.textContent || (el as HTMLInputElement).value || '';
            if (matchesKeywords(text, LOGIN_BUTTON_KEYWORDS)) {
                buttons.push(el as HTMLElement);
            }
        } else if (tagName === 'A') {
            const text = el.textContent ?? '';
            if (matchesKeywords(text, LOGIN_BUTTON_KEYWORDS)) {
                buttons.push(el as HTMLElement);
            }
        }
    });

    return buttons;
}

function findTermsCheckboxes(): HTMLInputElement[] {
    const result: HTMLInputElement[] = [];

    traverseDOM(document.body, (el) => {
        if (el.tagName !== 'INPUT' || el.getAttribute('type') !== 'checkbox') return;
        
        const checkbox = el as HTMLInputElement;
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
    let result = false;
    traverseDOM(document.body, (el) => {
        if (el.tagName !== 'FORM') return;
        const form = el as HTMLFormElement;
        const action = (form.action ?? '').toLowerCase();
        const html = form.innerHTML.toLowerCase();
        if (['signup', 'register', 'create', 'join'].some((k) => action.includes(k))) {
            result = true;
        } else if (['create account', 'sign up', 'register'].some((k) => html.includes(k))) {
            result = true;
        }
    });
    return result;
}

function hasLoginForm(): boolean {
    let result = false;
    traverseDOM(document.body, (el) => {
        if (el.tagName !== 'FORM') return;
        const form = el as HTMLFormElement;
        const action = (form.action ?? '').toLowerCase();
        const html = form.innerHTML.toLowerCase();
        if (['login', 'signin', 'auth'].some((k) => action.includes(k))) {
            result = true;
        } else if (['log in', 'sign in'].some((k) => html.includes(k))) {
            result = true;
        }
    });
    return result;
}

export function getSignupConfidence(): { score: number; indicators: string[]; details: SignupDetection['details'] } {
    if (cachedResult) {
        return cachedResult;
    }

    const passwordFields = findPasswordFields();
    const emailFields = findEmailFields();
    const signupButtons = findSignupButtons();
    const loginButtons = findLoginButtons();
    const termsCheckboxes = findTermsCheckboxes();
    const hasForm = hasSignupForm();
    const hasLogForm = hasLoginForm();

    let score = 0;
    const indicators: string[] = [];

    const weights = DETECTOR_CONFIG.weights;

    // 1. Password fields scoring
    if (passwordFields.length > 0) {
        score += weights.passwordField;
        indicators.push('password_field');
    }
    if (passwordFields.length >= 2) {
        score += weights.confirmPassword;
        indicators.push('confirm_password');
    }

    // 2. Email fields scoring
    if (emailFields.length > 0) {
        score += weights.emailField;
        indicators.push('email_field');
    }

    // 3. Buttons scoring
    if (signupButtons.length > 0) {
        score += weights.signupButton;
        indicators.push('signup_button');
    }

    // 4. Terms checkboxes scoring
    if (termsCheckboxes.length > 0) {
        score += weights.termsCheckbox;
        indicators.push('terms_checkbox');
    }

    // 5. Form presence
    if (hasForm) {
        score += weights.signupForm;
        indicators.push('signup_form');
    }

    // 6. Title and URL matches
    const pageTitle = document.title.toLowerCase();
    const pageUrl = window.location.href.toLowerCase();

    const titleHasSignup = SIGNUP_URL_TITLE_KEYWORDS.some((k) => pageTitle.includes(k));
    const urlHasSignup = SIGNUP_URL_TITLE_KEYWORDS.some((k) => pageUrl.includes(k));
    const titleHasLogin = LOGIN_URL_TITLE_KEYWORDS.some((k) => pageTitle.includes(k));
    const urlHasLogin = LOGIN_URL_TITLE_KEYWORDS.some((k) => pageUrl.includes(k));

    if (titleHasSignup) {
        score += weights.titleMatch;
        indicators.push('title_match');
    }
    if (urlHasSignup) {
        score += weights.urlMatch;
        indicators.push('url_match');
    }

    // 7. Login Page Mitigation (Reduce confidence if login indicators dominate)
    const loginIndicators = [];
    if (passwordFields.length === 1) loginIndicators.push('single_password_field');
    if (loginButtons.length > 0) loginIndicators.push('login_button');
    if (hasLogForm) loginIndicators.push('login_form');
    if (titleHasLogin) loginIndicators.push('login_title');
    if (urlHasLogin) loginIndicators.push('login_url');

    // If there are login indicators, and no strong signup signals, penalize the score
    const hasStrongSignupSignals = passwordFields.length >= 2 || termsCheckboxes.length > 0 || signupButtons.length > 0;
    
    if (loginIndicators.length > 0 && !hasStrongSignupSignals) {
        score += weights.loginDeduction;
        indicators.push(`login_mitigation_applied:(${loginIndicators.join(',')})`);
    }

    cachedResult = {
        score: Math.max(0, Math.min(score, 100)),
        indicators,
        details: {
            passwordFields: passwordFields.length,
            emailFields: emailFields.length,
            signupButtons: signupButtons.length,
            termsCheckboxes: termsCheckboxes.length,
            hasForm,
        },
    };

    return cachedResult;
}

export function isSignupPage(threshold = DETECTOR_CONFIG.thresholds.signup): boolean {
    return getSignupConfidence().score >= threshold;
}

export function getSignupDetectionResult(threshold = DETECTOR_CONFIG.thresholds.signup): SignupDetection {
    const result = getSignupConfidence();
    return { isSignup: result.score >= threshold, ...result };
}

/**
 * Sets up a MutationObserver to monitor dynamic changes in the DOM.
 * Triggers the callback with the new detection results when relevant changes occur.
 * Returns a function to clean up/disconnect the observer.
 */
export function observeSignupPage(
    callback: (result: SignupDetection) => void,
    threshold = DETECTOR_CONFIG.thresholds.signup
): () => void {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const observer = new MutationObserver((mutations) => {
        // Check if any mutation was outside the Blind-Sight overlays
        const hasExternalMutation = mutations.some((mutation) => {
            const target = mutation.target;
            if (target instanceof Element) {
                // Ignore mutations inside our own shadow host overlay
                return !target.closest('#blind-sight-shadow-host') && !target.closest('[id^="blind-sight"]');
            }
            return true;
        });

        if (!hasExternalMutation) return;

        // Debounce for 100ms
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            invalidateDetectorCache();
            const result = getSignupDetectionResult(threshold);
            callback(result);
        }, 100);
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['type', 'role', 'action', 'class']
    });

    return () => {
        observer.disconnect();
        if (timeoutId) clearTimeout(timeoutId);
    };
}
