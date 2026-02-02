const TOS_LINK_KEYWORDS = [
    'terms of service',
    'terms of use',
    'terms and conditions',
    'terms & conditions',
    'user agreement',
    'service agreement',
    'legal terms',
    'tos',
    '/terms',
    '/legal',
    '/tos',
];

const LEGAL_LINK_KEYWORDS = [
    'privacy policy',
    'privacy',
    'cookie policy',
    'acceptable use',
    'community guidelines',
];

function containsKeyword(text, keywords) {
    if (!text) return false;
    const lowerText = text.toLowerCase();
    return keywords.some(keyword => lowerText.includes(keyword));
}

function findTosLinks() {
    const links = document.querySelectorAll('a[href]');
    const tosLinks = [];
    const seenUrls = new Set();

    for (const link of links) {
        const href = link.href || '';
        const text = (link.textContent || '').trim();
        const title = link.title || '';
        const ariaLabel = link.getAttribute('aria-label') || '';

        const allText = `${href} ${text} ${title} ${ariaLabel}`;

        if (seenUrls.has(href)) continue;

        if (containsKeyword(allText, TOS_LINK_KEYWORDS)) {
            tosLinks.push({
                url: href,
                text: text || 'Terms of Service',
                type: 'tos',
                priority: 1
            });
            seenUrls.add(href);
            continue;
        }

        if (containsKeyword(allText, LEGAL_LINK_KEYWORDS)) {
            tosLinks.push({
                url: href,
                text: text || 'Legal Document',
                type: 'legal',
                priority: 2
