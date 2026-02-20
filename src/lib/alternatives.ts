import type { AlternativeCategory, ServiceCategory } from './types';

export const ALTERNATIVES_DATABASE: Record<string, AlternativeCategory> = {
    vpn: {
        displayName: 'VPN Service',
        alternatives: [
            { name: 'ProtonVPN', url: 'https://protonvpn.com', reason: 'Swiss-based, no-logs policy, open source apps, free tier available', icon: '🛡️' },
            { name: 'Mullvad VPN', url: 'https://mullvad.net', reason: 'Anonymous accounts, no email required, audited no-logs policy', icon: '🔐' },
            { name: 'IVPN', url: 'https://ivpn.net', reason: 'Transparent company, multi-hop connections, strong privacy focus', icon: '🌐' },
        ],
    },
    email: {
        displayName: 'Email Service',
        alternatives: [
            { name: 'ProtonMail', url: 'https://proton.me/mail', reason: 'End-to-end encrypted, Swiss privacy laws, zero-access encryption', icon: '📧' },
            { name: 'Tutanota', url: 'https://tutanota.com', reason: 'German privacy laws, encrypted calendar, open source', icon: '🔒' },
            { name: 'Fastmail', url: 'https://fastmail.com', reason: 'No ads, strong spam filtering, privacy-focused Australian company', icon: '⚡' },
        ],
    },
    cloud_storage: {
        displayName: 'Cloud Storage',
        alternatives: [
            { name: 'Proton Drive', url: 'https://proton.me/drive', reason: 'End-to-end encrypted, Swiss privacy, zero-knowledge encryption', icon: '☁️' },
            { name: 'Tresorit', url: 'https://tresorit.com', reason: 'Zero-knowledge encryption, GDPR compliant, Swiss data centers', icon: '🔐' },
            { name: 'Sync.com', url: 'https://sync.com', reason: 'Canadian privacy laws, zero-knowledge, free 5GB tier', icon: '🔄' },
        ],
    },
    social_media: {
        displayName: 'Social Platform',
        alternatives: [
            { name: 'Mastodon', url: 'https://joinmastodon.org', reason: 'Decentralized, no ads, no tracking, open source', icon: '🐘' },
            { name: 'Bluesky', url: 'https://bsky.app', reason: 'Decentralized protocol, user control over algorithms', icon: '🦋' },
            { name: 'Pixelfed', url: 'https://pixelfed.org', reason: 'Decentralized Instagram alternative, no ads or tracking', icon: '📸' },
        ],
    },
    messaging: {
        displayName: 'Messaging App',
        alternatives: [
            { name: 'Signal', url: 'https://signal.org', reason: 'Gold standard encryption, open source, minimal metadata', icon: '💬' },
            { name: 'Element (Matrix)', url: 'https://element.io', reason: 'Decentralized, end-to-end encrypted, self-hosted option', icon: '🔷' },
            { name: 'Session', url: 'https://getsession.org', reason: 'No phone number required, decentralized, onion routing', icon: '🧅' },
        ],
    },
    video_conferencing: {
        displayName: 'Video Conferencing',
        alternatives: [
            { name: 'Jitsi Meet', url: 'https://meet.jit.si', reason: 'Open source, no account required, can self-host', icon: '📹' },
            { name: 'Signal Video Calls', url: 'https://signal.org', reason: 'End-to-end encrypted, built into Signal app', icon: '📞' },
        ],
    },
    search: {
        displayName: 'Search Engine',
        alternatives: [
            { name: 'DuckDuckGo', url: 'https://duckduckgo.com', reason: 'No tracking, no search history, private by default', icon: '🦆' },
            { name: 'Brave Search', url: 'https://search.brave.com', reason: 'Independent index, no tracking, anonymous queries', icon: '🦁' },
            { name: 'Startpage', url: 'https://startpage.com', reason: 'Google results without tracking, EU privacy', icon: '🔍' },
        ],
    },
    browser: {
        displayName: 'Web Browser',
        alternatives: [
            { name: 'Firefox', url: 'https://firefox.com', reason: 'Open source, strong privacy features, customizable', icon: '🦊' },
            { name: 'Brave', url: 'https://brave.com', reason: 'Built-in ad/tracker blocking, Chromium-based', icon: '🦁' },
            { name: 'Tor Browser', url: 'https://torproject.org', reason: 'Maximum anonymity, onion routing, circumvents censorship', icon: '🧅' },
        ],
    },
    password_manager: {
        displayName: 'Password Manager',
        alternatives: [
            { name: 'Bitwarden', url: 'https://bitwarden.com', reason: 'Open source, free tier, can self-host, audited', icon: '🔑' },
            { name: 'KeePassXC', url: 'https://keepassxc.org', reason: 'Offline-first, open source, full control over data', icon: '🗝️' },
        ],
    },
    notes: {
        displayName: 'Note Taking App',
        alternatives: [
            { name: 'Standard Notes', url: 'https://standardnotes.com', reason: 'End-to-end encrypted, open source, 100-year company', icon: '📝' },
            { name: 'Joplin', url: 'https://joplinapp.org', reason: 'Open source, E2E encryption, supports Markdown', icon: '📓' },
            { name: 'Obsidian', url: 'https://obsidian.md', reason: 'Local-first, your data stays on your device', icon: '💎' },
        ],
    },
    ai_assistant: {
        displayName: 'AI Assistant',
        alternatives: [
            { name: 'DuckDuckGo AI Chat', url: 'https://duckduckgo.com/?q=DuckDuckGo+AI+Chat', reason: 'Anonymous access to AI, no account needed', icon: '🤖' },
            { name: 'Perplexity', url: 'https://perplexity.ai', reason: 'Transparent sources, less data collection', icon: '🔮' },
        ],
    },
    file_sharing: {
        displayName: 'File Sharing',
        alternatives: [
            { name: 'OnionShare', url: 'https://onionshare.org', reason: 'Peer-to-peer, no third party, Tor-based', icon: '🧅' },
            { name: 'Send (by Mozilla)', url: 'https://send.vis.ee', reason: 'End-to-end encrypted, files auto-delete', icon: '📤' },
        ],
    },
    unknown: {
        displayName: 'Online Service',
        alternatives: [
            { name: 'Privacy Guides', url: 'https://privacyguides.org', reason: 'Comprehensive resource for privacy-respecting alternatives', icon: '📚' },
            { name: 'AlternativeTo', url: 'https://alternativeto.net', reason: 'Find alternatives filtered by privacy/open source', icon: '🔄' },
        ],
    },
};

export function getAlternatives(category?: ServiceCategory | string): AlternativeCategory {
    const normalizedCategory = (category ?? 'unknown').toLowerCase().replace(/[\s-]/g, '_');
    return ALTERNATIVES_DATABASE[normalizedCategory] ?? ALTERNATIVES_DATABASE.unknown;
}
