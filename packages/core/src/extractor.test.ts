import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { extractTextFromHtml, findTosLinks, extractTosText } from './extractor';

describe('extractor logic', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    document.body.innerHTML = '';
    document.title = '';
  });

  afterEach(() => {
    // Restore window.location
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true
    });
  });

  describe('extractTextFromHtml', () => {
    it('should extract plain text and remove scripts and styles', () => {
      const html = `
        <html>
          <head>
            <style>body { color: red; }</style>
            <script>console.log("noisy");</script>
          </head>
          <body>
            <main>
              <h1>Terms of Service</h1>
              <p>Welcome to our terms.</p>
            </main>
            <footer>Unwanted footer</footer>
          </body>
        </html>
      `;
      const text = extractTextFromHtml(html);
      expect(text).toContain('Terms of Service');
      expect(text).toContain('Welcome to our terms.');
      expect(text).not.toContain('Unwanted footer');
      expect(text).not.toContain('noisy');
    });
  });

  describe('findTosLinks', () => {
    it('should find terms links on the page', () => {
      document.body.innerHTML = `
        <div>
          <a href="/terms-of-service">Terms of Service</a>
          <a href="/privacy-policy">Privacy Policy</a>
          <a href="https://google.com">Google</a>
        </div>
      `;
      const links = findTosLinks();
      expect(links.length).toBeGreaterThanOrEqual(1);
      expect(links[0].url).toContain('/terms-of-service');
      expect(links[0].type).toBe('tos');
    });
  });

  describe('extractTosText', () => {
    it('should extract text using CurrentPageStrategy if we are on a terms URL', async () => {
      Object.defineProperty(window, 'location', {
        value: {
          href: 'https://example.com/terms-of-service',
        },
        writable: true
      });
      document.title = 'Terms of Service';
      
      // We need more than 500 chars to satisfy the extraction minimum threshold
      const largeContent = 'Terms of Service '.repeat(50);
      document.body.innerHTML = `<main>${largeContent}</main>`;

      const result = await extractTosText();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.source).toBe('current-page');
        expect(result.charCount).toBeGreaterThan(500);
      }
    });

    it('should fallback to inline strategy if matching element exists', async () => {
      Object.defineProperty(window, 'location', {
        value: {
          href: 'https://example.com/some-other-page',
        },
        writable: true
      });
      
      const largeContent = 'Some inline legal text '.repeat(50);
      document.body.innerHTML = `
        <div class="terms-content">
          ${largeContent}
        </div>
      `;

      const result = await extractTosText();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.source).toBe('inline');
      }
    });
  });
});
