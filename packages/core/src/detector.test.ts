import { describe, it, expect, beforeEach } from 'vitest';
import { getSignupConfidence, invalidateDetectorCache } from './detector';

describe('detector logic', () => {
  beforeEach(() => {
    // Clear DOM before each test
    document.body.innerHTML = '';
    invalidateDetectorCache();
  });

  it('should detect a standard signup form with high confidence', () => {
    document.body.innerHTML = `
      <form action="/register" method="POST">
        <h2>Create an Account</h2>
        <label for="email">Email</label>
        <input type="email" id="email" name="email" required />

        <label for="password">Password</label>
        <input type="password" id="password" name="password" required />

        <label>
          <input type="checkbox" id="terms" required />
          I agree to the Terms of Service and Privacy Policy.
        </label>

        <button type="submit">Sign Up</button>
      </form>
    `;

    const result = getSignupConfidence();
    expect(result.score).toBeGreaterThan(50);
    expect(result.details.passwordFields).toBe(1);
    expect(result.details.emailFields).toBe(1);
    expect(result.details.termsCheckboxes).toBe(1);
    expect(result.details.signupButtons).toBe(1);
    expect(result.details.hasForm).toBe(true);
    expect(result.indicators).toContain('password_field');
    expect(result.indicators).toContain('signup_button');
  });

  it('should not false-positive on a login form', () => {
    document.body.innerHTML = `
      <form action="/login" method="POST">
        <h2>Log In</h2>
        <label for="email">Email</label>
        <input type="text" id="email" name="username" required />

        <label for="password">Password</label>
        <input type="password" id="password" name="password" required />

        <button type="submit">Sign In</button>
      </form>
    `;

    const result = getSignupConfidence();
    // Since it's a login form, signup buttons and terms checkboxes are 0.
    expect(result.details.signupButtons).toBe(0);
    expect(result.details.termsCheckboxes).toBe(0);
    // Score should be low or 0 because it's a login form
    expect(result.score).toBeLessThan(40);
  });

  it('should return 0 score and details on empty page', () => {
    const result = getSignupConfidence();
    expect(result.score).toBe(0);
    expect(result.details.passwordFields).toBe(0);
    expect(result.details.emailFields).toBe(0);
    expect(result.details.signupButtons).toBe(0);
    expect(result.details.termsCheckboxes).toBe(0);
    expect(result.details.hasForm).toBe(false);
  });
});
