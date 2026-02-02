const SIGNUP_BUTTON_KEYWORDS = [
    'sign up',
    'signup',
    'register',
    'create account',
    'create an account',
    'join',
    'join now',
    'get started',
    'start free',
    'try free',
    'sign in', 
];

const TERMS_CHECKBOX_KEYWORDS = [
    'i agree',
    'i accept',
    'terms of service',
    'terms and conditions',
    'privacy policy',
    'agree to',
    'accept the',
];

function matchesKeywords(text, keywords) {
    if (!text) return false;
    const lowerText = text.toLowerCase().trim();
    return keywords.some(keyword => lowerText.includes(keyword));
}

function findPasswordFields() {
    return Array.from(document.querySelectorAll('input[type="password"]'));
}

function findEmailFields() {
    const emailInputs = [];

    emailInputs.push(...document.querySelectorAll('input[type="email"]'));

    const allInputs = document.querySelectorAll('input[type="text"], input:not([type])');
    for (const input of allInputs) {
        const name = (input.name || '').toLowerCase();
        const id = (input.id || '').toLowerCase();
        const placeholder = (input.placeholder || '').toLowerCase();
        const autocomplete = (input.autocomplete || '').toLowerCase();

        if (name.includes('email') || id.includes('email') ||
            placeholder.includes('email') || autocomplete.includes('email')) {
            emailInputs.push(input);
        }
    }

    return emailInputs;
}

function findSignupButtons() {
    const signupButtons = [];

    const buttons = document.querySelectorAll('button, input[type="submit"], input[type="button"], [role="button"]');
    for (const btn of buttons) {
        const text = btn.textContent || btn.value || '';
        if (matchesKeywords(text, SIGNUP_BUTTON_KEYWORDS)) {
            signupButtons.push(btn);
        }
    }

    const links = document.querySelectorAll('a');
    for (const link of links) {
        const text = link.textContent || '';
        if (matchesKeywords(text, SIGNUP_BUTTON_KEYWORDS)) {
            signupButtons.push(link);
        }
    }

    return signupButtons;
}

function findTermsCheckboxes() {
    const termsCheckboxes = [];

    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    for (const checkbox of checkboxes) {
        const label = document.querySelector(`label[for="${checkbox.id}"]`) ||
            checkbox.closest('label');

        if (label) {
            const labelText = label.textContent || '';
            if (matchesKeywords(labelText, TERMS_CHECKBOX_KEYWORDS)) {
                termsCheckboxes.push(checkbox);
            }
        }

        const parent = checkbox.parentElement;
        if (parent) {
            const parentText = parent.textContent || '';
            if (matchesKeywords(parentText, TERMS_CHECKBOX_KEYWORDS)) {
                termsCheckboxes.push(checkbox);
            }
        }
    }

    return termsCheckboxes;
}

function hasSignupForm() {
    const forms = document.querySelectorAll('form');

    for (const form of forms) {
        const formHtml = form.innerHTML.toLowerCase();
        const formAction = (form.action || '').toLowerCase();

        if (formAction.includes('signup') || formAction.includes('register') ||
            formAction.includes('create') || formAction.includes('join')) {
            return true;
        }

        if (formHtml.includes('create account') || formHtml.includes('sign up') ||
            formHtml.includes('register')) {
            return true;
        }
    }

    return false;
}

function getSignupConfidence() {
    const passwordFields = findPasswordFields();
    const emailFields = findEmailFields();
    const signupButtons = findSignupButtons();
    const termsCheckboxes = findTermsCheckboxes();
    const hasForm = hasSignupForm();

    let score = 0;
    const indicators = [];

    if (passwordFields.length > 0) {
        score += 25;
        indicators.push('password_field');
    }

    if (emailFields.length > 0) {
        score += 20;
        indicators.push('email_field');
    }

    if (passwordFields.length >= 2) {
        score += 30;
        indicators.push('confirm_password');
    }

    if (signupButtons.length > 0) {
        score += 30;
        indicators.push('signup_button');
    }

    if (termsCheckboxes.length > 0) {
        score += 25;
        indicators.push('terms_checkbox');
    }

    if (hasForm) {
        score += 10;
        indicators.push('signup_form');
    }

    const pageTitle = document.title.toLowerCase();
    const pageUrl = window.location.href.toLowerCase();

    if (pageTitle.includes('sign up') || pageTitle.includes('register') ||
        pageTitle.includes('create account') || pageTitle.includes('join')) {
        score += 20;
        indicators.push('title_match');
    }

    if (pageUrl.includes('signup') || pageUrl.includes('register') ||
        pageUrl.includes('join') || pageUrl.includes('create')) {
        score += 20;
        indicators.push('url_match');
    }

    return {
        score: Math.min(score, 100), 
        indicators,
        details: {
            passwordFields: passwordFields.length,
            emailFields: emailFields.length,
            signupButtons: signupButtons.length,
            termsCheckboxes: termsCheckboxes.length,
            hasForm
        }
    };
}

function isSignupPage(threshold = 50) {
    const result = getSignupConfidence();
    return result.score >= threshold;
}

function getSignupDetectionResult(threshold = 50) {
    const result = getSignupConfidence();
    return {
        isSignup: result.score >= threshold,
        ...result
    };
}

window.BlindSightDetector = {
    isSignupPage,
    getSignupDetectionResult,
    findPasswordFields,
    findEmailFields,
    findSignupButtons,
    findTermsCheckboxes
};