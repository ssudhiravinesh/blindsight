/**
 * Copyright (c) 2026 Sudhir Avinesh. All rights reserved.
 * Proprietary and Confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 */

export const SIGNUP_BUTTON_KEYWORDS = [
    'sign up', 'signup', 'register', 'create account', 'create an account',
    'join', 'join now', 'get started', 'start free', 'try free', 'open account',
    'sign-up', 'new account'
];

export const LOGIN_BUTTON_KEYWORDS = [
    'sign in', 'signin', 'log in', 'login', 'log into', 'enter', 'sign-in',
    'access account', 'member login'
];

export const TERMS_CHECKBOX_KEYWORDS = [
    'i agree', 'i accept', 'terms of service', 'terms and conditions',
    'privacy policy', 'agree to', 'accept the', 'terms of use'
];

export const SIGNUP_URL_TITLE_KEYWORDS = [
    'sign up', 'signup', 'register', 'create', 'join', 'new-account'
];

export const LOGIN_URL_TITLE_KEYWORDS = [
    'login', 'signin', 'log in', 'sign in'
];

export const DETECTOR_CONFIG = {
    weights: {
        passwordField: 25,
        emailField: 20,
        confirmPassword: 30,
        signupButton: 30,
        termsCheckbox: 25,
        signupForm: 10,
        titleMatch: 20,
        urlMatch: 20,
        // Negative weight for login indicators
        loginDeduction: -40
    },
    thresholds: {
        signup: 50 // Increased default threshold to prevent false positives
    }
};
