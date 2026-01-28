/**
 * Blind-Sight Signup Page Detector
 * Heuristics to detect signup/registration forms on web pages
 */

/**
 * Keywords that indicate a signup/register button or link
 */
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
    'sign in', // Often signup pages have sign in as secondary
];

/**
 * Keywords that indicate terms/conditions acceptance
 */
const TERMS_CHECKBOX_KEYWORDS = [
    'i agree',
    'i accept',
    'terms of service',
    'terms and conditions',
    'privacy policy',
    'agree to',
    'accept the',
];

/**
 * Check if an element's text matches any of the keywords
 * @param {string} text - Text to check
 * @param {string[]} keywords - Keywords to match against
 * @returns {boolean}
 */
function matchesKeywords(text, keywords) {
    if (!text) return false;
    const lowerText = text.toLowerCase().trim();
    return keywords.some(keyword => lowerText.includes(keyword));
}

/**
 * Find password input fields on the page
 * @returns {HTMLInputElement[]}
 */
function findPasswordFields() {
    return Array.from(document.querySelectorAll('input[type="password"]'));
}

/**
 * Find email input fields on the page
 * @returns {HTMLInputElement[]}
 */
function findEmailFields() {
    const emailInputs = [];

    // Direct type="email"
    emailInputs.push(...document.querySelectorAll('input[type="email"]'));

    // Check for name/id/placeholder containing "email"
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

/**
 * Find signup/register buttons or submit buttons
 * @returns {Element[]}
 */
function findSignupButtons() {
    const signupButtons = [];

    // Check buttons
    const buttons = document.querySelectorAll('button, input[type="submit"], input[type="button"], [role="button"]');
    for (const btn of buttons) {
        const text = btn.textContent || btn.value || '';
        if (matchesKeywords(text, SIGNUP_BUTTON_KEYWORDS)) {
            signupButtons.push(btn);
        }
    }

    // Check links that look like buttons
    const links = document.querySelectorAll('a');
    for (const link of links) {
        const text = link.textContent || '';
        if (matchesKeywords(text, SIGNUP_BUTTON_KEYWORDS)) {
            signupButtons.push(link);
        }
    }

    return signupButtons;
}

/**
 * Find terms/conditions checkboxes
 * @returns {Element[]}
 */
function findTermsCheckboxes() {
    const termsCheckboxes = [];

    // Check labels associated with checkboxes
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    for (const checkbox of checkboxes) {
        // Check associated label
        const label = document.querySelector(`label[for="${checkbox.id}"]`) ||
            checkbox.closest('label');

        if (label) {
            const labelText = label.textContent || '';
            if (matchesKeywords(labelText, TERMS_CHECKBOX_KEYWORDS)) {
                termsCheckboxes.push(checkbox);
            }
        }

        // Check nearby text
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

/**
 * Check if the page contains a form with signup characteristics
 * @returns {boolean}
 */
function hasSignupForm() {
    const forms = document.querySelectorAll('form');

    for (const form of forms) {
        const formHtml = form.innerHTML.toLowerCase();
        const formAction = (form.action || '').toLowerCase();

        // Check if form action contains signup keywords
        if (formAction.includes('signup') || formAction.includes('register') ||
            formAction.includes('create') || formAction.includes('join')) {
            return true;
        }

        // Check if form contains signup-related content
        if (formHtml.includes('create account') || formHtml.includes('sign up') ||
            formHtml.includes('register')) {
            return true;
        }
    }

    return false;
}

/**
 * Calculate a confidence score for signup page detection
 * @returns {Object} Detection result with score and indicators
 */
function getSignupConfidence() {
    const passwordFields = findPasswordFields();
    const emailFields = findEmailFields();
    const signupButtons = findSignupButtons();
    const termsCheckboxes = findTermsCheckboxes();
    const hasForm = hasSignupForm();

    let score = 0;
    const indicators = [];

    // Password field is a strong indicator (but could also be login)
    if (passwordFields.length > 0) {
        score += 25;
        indicators.push('password_field');
    }

    // Email field is common
    if (emailFields.length > 0) {
        score += 20;
        indicators.push('email_field');
    }

    // Multiple password fields (password + confirm) is a very strong signal
    if (passwordFields.length >= 2) {
        score += 30;
        indicators.push('confirm_password');
    }

    // Signup buttons are a strong indicator
    if (signupButtons.length > 0) {
        score += 30;
        indicators.push('signup_button');
    }

    // Terms checkbox is a strong indicator of signup (less common on login)
    if (termsCheckboxes.length > 0) {
        score += 25;
        indicators.push('terms_checkbox');
    }

    // Form characteristics
    if (hasForm) {
        score += 10;
        indicators.push('signup_form');
    }

    // Check page title and URL
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
        score: Math.min(score, 100), // Cap at 100
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

/**
 * Main detection function - checks if current page is a signup/registration form
 * @param {number} threshold - Confidence threshold (0-100), default 50
 * @returns {boolean}
 */
function isSignupPage(threshold = 50) {
    const result = getSignupConfidence();

    console.log('[Blind-Sight] Signup detection:', {
        isSignup: result.score >= threshold,
        score: result.score,
        threshold,
        indicators: result.indicators,
        details: result.details
    });

    return result.score >= threshold;
}

/**
 * Get detailed signup detection result
 * @param {number} threshold - Confidence threshold (0-100), default 50
 * @returns {Object}
 */
function getSignupDetectionResult(threshold = 50) {
    const result = getSignupConfidence();
    return {
        isSignup: result.score >= threshold,
        ...result
    };
}

// Export for use in content.js
// Note: In content scripts, we use global scope since ES modules aren't always supported
window.BlindSightDetector = {
    isSignupPage,
    getSignupDetectionResult,
    findPasswordFields,
    findEmailFields,
    findSignupButtons,
    findTermsCheckboxes
};
