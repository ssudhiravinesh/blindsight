import type { AlternativeCategory, ServiceCategory } from './types';

export const ALTERNATIVES_DATABASE: Record<string, AlternativeCategory> = {
    // ─── Communication ──────────────────────────────────────
    email: {
        displayName: 'Email Service',
        alternatives: [
            { name: 'ProtonMail', url: 'https://proton.me/mail', reason: 'End-to-end encrypted, Swiss privacy laws, zero-access encryption', icon: '📧' },
            { name: 'Tuta Mail', url: 'https://tuta.com', reason: 'German privacy laws, encrypted calendar, open source', icon: '🔒' },
            { name: 'Fastmail', url: 'https://fastmail.com', reason: 'No ads, strong spam filtering, privacy-focused Australian company', icon: '⚡' },
        ],
    },
    messaging: {
        displayName: 'Messaging App',
        alternatives: [
            { name: 'Signal', url: 'https://signal.org', reason: 'Gold standard encryption, open source, minimal metadata collection', icon: '💬' },
            { name: 'Element (Matrix)', url: 'https://element.io', reason: 'Decentralized, end-to-end encrypted, can be self-hosted', icon: '🔷' },
            { name: 'Session', url: 'https://getsession.org', reason: 'No phone number required, decentralized, onion routing', icon: '🧅' },
        ],
    },
    video_conferencing: {
        displayName: 'Video Conferencing',
        alternatives: [
            { name: 'Jitsi Meet', url: 'https://meet.jit.si', reason: 'Open source, no account required, can be self-hosted', icon: '📹' },
            { name: 'Signal Video Calls', url: 'https://signal.org', reason: 'End-to-end encrypted, built into Signal app', icon: '📞' },
            { name: 'BigBlueButton', url: 'https://bigbluebutton.org', reason: 'Open source, designed for education, self-hostable', icon: '🎓' },
        ],
    },

    // ─── Social ─────────────────────────────────────────────
    social_media: {
        displayName: 'Social Platform',
        alternatives: [
            { name: 'Mastodon', url: 'https://joinmastodon.org', reason: 'Decentralized, no ads, no tracking, open source', icon: '🐘' },
            { name: 'Bluesky', url: 'https://bsky.app', reason: 'Decentralized protocol, user control over algorithms', icon: '🦋' },
            { name: 'Pixelfed', url: 'https://pixelfed.org', reason: 'Decentralized Instagram alternative, no ads or tracking', icon: '📸' },
        ],
    },
    video_sharing: {
        displayName: 'Video Sharing',
        alternatives: [
            { name: 'PeerTube', url: 'https://joinpeertube.org', reason: 'Decentralized, federated video hosting, no ads', icon: '🎬' },
            { name: 'Odysee', url: 'https://odysee.com', reason: 'Blockchain-based, creator-friendly, minimal tracking', icon: '🌊' },
        ],
    },
    dating: {
        displayName: 'Dating App',
        alternatives: [
            { name: 'Alovoa', url: 'https://alovoa.com', reason: 'Open source, no ads, no tracking, donation-based', icon: '💚' },
            { name: 'Bumble (with privacy settings)', url: 'https://bumble.com', reason: 'Better data practices than many competitors, optional features', icon: '🐝' },
        ],
    },
    forum: {
        displayName: 'Forum / Community',
        alternatives: [
            { name: 'Lemmy', url: 'https://join-lemmy.org', reason: 'Decentralized Reddit alternative, federated, open source', icon: '🐿️' },
            { name: 'Discourse', url: 'https://discourse.org', reason: 'Open source, self-hostable, transparent moderation', icon: '💬' },
        ],
    },

    // ─── Web & Browsing ─────────────────────────────────────
    search: {
        displayName: 'Search Engine',
        alternatives: [
            { name: 'DuckDuckGo', url: 'https://duckduckgo.com', reason: 'No tracking, no search history, private by default', icon: '🦆' },
            { name: 'Brave Search', url: 'https://search.brave.com', reason: 'Independent index, no tracking, anonymous queries', icon: '🦁' },
            { name: 'Startpage', url: 'https://startpage.com', reason: 'Google results without tracking, EU privacy laws', icon: '🔍' },
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
    dns: {
        displayName: 'DNS Provider',
        alternatives: [
            { name: 'Quad9', url: 'https://quad9.net', reason: 'Swiss non-profit, blocks malware, no personal data logging', icon: '🛡️' },
            { name: 'NextDNS', url: 'https://nextdns.io', reason: 'Customizable ad-blocking DNS, privacy-first, optional logging', icon: '🌐' },
            { name: 'AdGuard DNS', url: 'https://adguard-dns.io', reason: 'Ad-blocking DNS, open source server, no logging', icon: '🚫' },
        ],
    },
    vpn: {
        displayName: 'VPN Service',
        alternatives: [
            { name: 'ProtonVPN', url: 'https://protonvpn.com', reason: 'Swiss-based, no-logs policy, open source apps, free tier', icon: '🛡️' },
            { name: 'Mullvad VPN', url: 'https://mullvad.net', reason: 'Anonymous accounts, no email required, audited no-logs policy', icon: '🔐' },
            { name: 'IVPN', url: 'https://ivpn.net', reason: 'Transparent company, multi-hop connections, strong privacy focus', icon: '🌐' },
        ],
    },
    link_shortener: {
        displayName: 'Link Shortener',
        alternatives: [
            { name: 'Shlink', url: 'https://shlink.io', reason: 'Self-hosted, open source, full control over analytics', icon: '🔗' },
            { name: 'YOURLS', url: 'https://yourls.org', reason: 'Self-hosted, open source, plugin ecosystem', icon: '🏠' },
            { name: 'Kutt', url: 'https://kutt.it', reason: 'Open source, self-hostable, custom domains', icon: '✂️' },
        ],
    },

    // ─── Storage & Files ────────────────────────────────────
    cloud_storage: {
        displayName: 'Cloud Storage',
        alternatives: [
            { name: 'Proton Drive', url: 'https://proton.me/drive', reason: 'End-to-end encrypted, Swiss privacy, zero-knowledge encryption', icon: '☁️' },
            { name: 'Tresorit', url: 'https://tresorit.com', reason: 'Zero-knowledge encryption, GDPR compliant, Swiss data centers', icon: '🔐' },
            { name: 'Sync.com', url: 'https://sync.com', reason: 'Canadian privacy laws, zero-knowledge encryption, free 5GB tier', icon: '🔄' },
        ],
    },
    file_sharing: {
        displayName: 'File Sharing',
        alternatives: [
            { name: 'OnionShare', url: 'https://onionshare.org', reason: 'Peer-to-peer, no third party, Tor-based encryption', icon: '🧅' },
            { name: 'Send (by Mozilla)', url: 'https://send.vis.ee', reason: 'End-to-end encrypted, files auto-delete after download', icon: '📤' },
            { name: 'Wormhole', url: 'https://wormhole.app', reason: 'End-to-end encrypted, no account needed, auto-deletion', icon: '🕳️' },
        ],
    },
    photo_storage: {
        displayName: 'Photo Storage',
        alternatives: [
            { name: 'Ente', url: 'https://ente.io', reason: 'End-to-end encrypted photo storage, open source', icon: '📷' },
            { name: 'Immich', url: 'https://immich.app', reason: 'Self-hosted Google Photos alternative, open source', icon: '🖼️' },
            { name: 'Stingle Photos', url: 'https://stingle.org', reason: 'Encrypted photo backup, open source, cross-platform', icon: '🔒' },
        ],
    },

    // ─── Productivity & Office ──────────────────────────────
    notes: {
        displayName: 'Note Taking App',
        alternatives: [
            { name: 'Standard Notes', url: 'https://standardnotes.com', reason: 'End-to-end encrypted, open source, 100-year commitment', icon: '📝' },
            { name: 'Joplin', url: 'https://joplinapp.org', reason: 'Open source, E2E encryption, Markdown support', icon: '📓' },
            { name: 'Obsidian', url: 'https://obsidian.md', reason: 'Local-first, data stays on your device, plugin ecosystem', icon: '💎' },
        ],
    },
    office_suite: {
        displayName: 'Office Suite',
        alternatives: [
            { name: 'LibreOffice', url: 'https://libreoffice.org', reason: 'Fully open source, no cloud dependency, full Office compatibility', icon: '📄' },
            { name: 'CryptPad', url: 'https://cryptpad.fr', reason: 'End-to-end encrypted collaborative editing, no tracking', icon: '🔐' },
            { name: 'OnlyOffice', url: 'https://onlyoffice.com', reason: 'Open source, self-hostable, strong MS Office compatibility', icon: '📊' },
        ],
    },
    calendar: {
        displayName: 'Calendar App',
        alternatives: [
            { name: 'Proton Calendar', url: 'https://proton.me/calendar', reason: 'End-to-end encrypted, integrated with ProtonMail', icon: '📅' },
            { name: 'EteSync', url: 'https://www.etesync.com', reason: 'E2E encrypted calendar & contacts sync, open source', icon: '🔄' },
            { name: 'Tuta Calendar', url: 'https://tuta.com', reason: 'Encrypted calendar built into Tuta Mail, zero-knowledge', icon: '🗓️' },
        ],
    },
    productivity: {
        displayName: 'Productivity Tool',
        alternatives: [
            { name: 'AppFlowy', url: 'https://appflowy.io', reason: 'Open source Notion alternative, local-first, self-hostable', icon: '📋' },
            { name: 'Logseq', url: 'https://logseq.com', reason: 'Local-first knowledge base, open source, privacy-focused', icon: '🧠' },
            { name: 'Vikunja', url: 'https://vikunja.io', reason: 'Open source task management, self-hostable, no tracking', icon: '✅' },
        ],
    },
    project_management: {
        displayName: 'Project Management',
        alternatives: [
            { name: 'Taiga', url: 'https://taiga.io', reason: 'Open source project management, agile-focused, self-hostable', icon: '📌' },
            { name: 'OpenProject', url: 'https://openproject.org', reason: 'Open source, Gantt charts, self-hostable, GDPR compliant', icon: '📊' },
            { name: 'Plane', url: 'https://plane.so', reason: 'Open source Jira alternative, self-hostable', icon: '✈️' },
        ],
    },
    forms_surveys: {
        displayName: 'Forms & Surveys',
        alternatives: [
            { name: 'LimeSurvey', url: 'https://limesurvey.org', reason: 'Open source, self-hostable, GDPR compliant', icon: '📝' },
            { name: 'CryptPad Forms', url: 'https://cryptpad.fr', reason: 'End-to-end encrypted forms, no tracking', icon: '🔐' },
            { name: 'Typebot', url: 'https://typebot.io', reason: 'Open source conversational forms, self-hostable', icon: '🤖' },
        ],
    },
    crm: {
        displayName: 'CRM / Business Tool',
        alternatives: [
            { name: 'Twenty', url: 'https://twenty.com', reason: 'Open source CRM, self-hostable, modern interface', icon: '🏢' },
            { name: 'SuiteCRM', url: 'https://suitecrm.com', reason: 'Open source Salesforce alternative, enterprise-ready', icon: '💼' },
            { name: 'Monica', url: 'https://monicahq.com', reason: 'Open source personal CRM, self-hosted, relationship-focused', icon: '👥' },
        ],
    },

    // ─── Security ───────────────────────────────────────────
    password_manager: {
        displayName: 'Password Manager',
        alternatives: [
            { name: 'Bitwarden', url: 'https://bitwarden.com', reason: 'Open source, free tier, can self-host, independently audited', icon: '🔑' },
            { name: 'KeePassXC', url: 'https://keepassxc.org', reason: 'Offline-first, open source, full control over your data', icon: '🗝️' },
            { name: 'Proton Pass', url: 'https://proton.me/pass', reason: 'E2E encrypted, integrated with Proton ecosystem, open source', icon: '🛡️' },
        ],
    },
    two_factor_auth: {
        displayName: '2FA / Authenticator',
        alternatives: [
            { name: 'Aegis', url: 'https://getaegis.app', reason: 'Open source, encrypted vault, Android, import/export', icon: '🔐' },
            { name: 'Ente Auth', url: 'https://ente.io/auth', reason: 'End-to-end encrypted 2FA backup, cross-platform, open source', icon: '🛡️' },
            { name: 'KeePassXC', url: 'https://keepassxc.org', reason: 'Built-in TOTP support, offline, open source', icon: '🗝️' },
        ],
    },

    // ─── AI ─────────────────────────────────────────────────
    ai_assistant: {
        displayName: 'AI Assistant',
        alternatives: [
            { name: 'DuckDuckGo AI Chat', url: 'https://duckduckgo.com/?q=DuckDuckGo+AI+Chat', reason: 'Anonymous access to AI models, no account needed', icon: '🤖' },
            { name: 'Perplexity', url: 'https://perplexity.ai', reason: 'Transparent source citations, less data collection', icon: '🔮' },
            { name: 'Jan', url: 'https://jan.ai', reason: 'Run AI models locally on your device, fully offline, open source', icon: '🏠' },
        ],
    },

    // ─── Media & Entertainment ──────────────────────────────
    streaming_video: {
        displayName: 'Video Streaming',
        alternatives: [
            { name: 'Jellyfin', url: 'https://jellyfin.org', reason: 'Self-hosted media server, open source, no tracking', icon: '🎬' },
            { name: 'Kodi', url: 'https://kodi.tv', reason: 'Open source media center, local playback, extensible', icon: '📺' },
            { name: 'PeerTube', url: 'https://joinpeertube.org', reason: 'Decentralized video hosting, federated, ad-free', icon: '🎥' },
        ],
    },
    streaming_music: {
        displayName: 'Music Streaming',
        alternatives: [
            { name: 'Navidrome', url: 'https://navidrome.org', reason: 'Self-hosted music server, open source, Subsonic compatible', icon: '🎵' },
            { name: 'Funkwhale', url: 'https://funkwhale.audio', reason: 'Decentralized, federated music platform, open source', icon: '🐋' },
            { name: 'Nuclear', url: 'https://nuclear.js.org', reason: 'Free music player, streams from multiple sources, no account', icon: '☢️' },
        ],
    },
    podcast: {
        displayName: 'Podcast Platform',
        alternatives: [
            { name: 'AntennaPod', url: 'https://antennapod.org', reason: 'Open source, no tracking, ad-free, Android', icon: '🎙️' },
            { name: 'gPodder', url: 'https://gpodder.github.io', reason: 'Open source podcast client, no account needed', icon: '📻' },
            { name: 'Castopod', url: 'https://castopod.org', reason: 'Self-hosted podcast hosting, open source, federated', icon: '🏠' },
        ],
    },
    gaming: {
        displayName: 'Gaming Platform',
        alternatives: [
            { name: 'GOG', url: 'https://gog.com', reason: 'DRM-free games, optional client, respects ownership', icon: '🎮' },
            { name: 'itch.io', url: 'https://itch.io', reason: 'Indie platform, DRM-free, creator-friendly, fair revenue sharing', icon: '🕹️' },
            { name: 'Lutris', url: 'https://lutris.net', reason: 'Open source gaming platform for Linux, no DRM', icon: '🐧' },
        ],
    },

    // ─── Shopping & Finance ─────────────────────────────────
    ecommerce: {
        displayName: 'Online Shopping',
        alternatives: [
            { name: 'Ethical Consumer', url: 'https://ethicalconsumer.org', reason: 'Ethics & privacy ratings for products and brands', icon: '🛒' },
            { name: 'DuckDuckGo Shopping', url: 'https://duckduckgo.com', reason: 'Private search for products without tracking', icon: '🦆' },
            { name: 'Local Shops', url: 'https://www.shoplocal.com', reason: 'Support local businesses, fewer data collection practices', icon: '🏪' },
        ],
    },
    finance_banking: {
        displayName: 'Finance & Banking',
        alternatives: [
            { name: 'Credit Unions', url: 'https://mycreditunion.gov', reason: 'Non-profit, member-owned, community-focused banking', icon: '🏦' },
            { name: 'Monero', url: 'https://getmonero.org', reason: 'Private cryptocurrency, untraceable transactions', icon: '💰' },
            { name: 'GnuCash', url: 'https://gnucash.org', reason: 'Open source personal finance tracking, local-only data', icon: '📒' },
        ],
    },
    digital_payments: {
        displayName: 'Digital Payments',
        alternatives: [
            { name: 'Monero', url: 'https://getmonero.org', reason: 'Private cryptocurrency, untraceable by design', icon: '💰' },
            { name: 'GNU Taler', url: 'https://taler.net', reason: 'Privacy-preserving digital payment system', icon: '💳' },
            { name: 'Cash/In-person', url: 'https://privacyguides.org', reason: 'Physical cash leaves no digital trail', icon: '💵' },
        ],
    },
    food_delivery: {
        displayName: 'Food Delivery',
        alternatives: [
            { name: 'Direct Restaurant Ordering', url: 'https://privacyguides.org', reason: 'Order directly from restaurants — less data shared with aggregators', icon: '🍽️' },
            { name: 'Local Delivery Co-ops', url: 'https://privacyguides.org', reason: 'Community-owned delivery services, less data collection', icon: '🚲' },
        ],
    },
    ride_sharing: {
        displayName: 'Ride Sharing',
        alternatives: [
            { name: 'Local Taxi Apps', url: 'https://privacyguides.org', reason: 'Local taxi services often collect less data than big platforms', icon: '🚕' },
            { name: 'Public Transit Apps', url: 'https://privacyguides.org', reason: 'Transit apps typically have minimal data collection', icon: '🚌' },
        ],
    },

    // ─── Maps & Navigation ──────────────────────────────────
    maps_navigation: {
        displayName: 'Maps & Navigation',
        alternatives: [
            { name: 'OsmAnd', url: 'https://osmand.net', reason: 'Offline maps, open source, based on OpenStreetMap, no tracking', icon: '🗺️' },
            { name: 'Organic Maps', url: 'https://organicmaps.app', reason: 'Offline-first, no ads, no tracking, open source', icon: '🌿' },
            { name: 'OpenStreetMap', url: 'https://openstreetmap.org', reason: 'Community-built maps, no corporate tracking', icon: '🌍' },
        ],
    },

    // ─── Health & Fitness ───────────────────────────────────
    fitness_health: {
        displayName: 'Fitness & Health',
        alternatives: [
            { name: 'Gadgetbridge', url: 'https://gadgetbridge.org', reason: 'Open source, connects to fitness trackers without cloud dependency', icon: '⌚' },
            { name: 'Wger', url: 'https://wger.de', reason: 'Open source workout manager, self-hostable, no tracking', icon: '💪' },
            { name: 'OpenScale', url: 'https://github.com/oliexdev/openScale', reason: 'Open source body metrics tracking, local-only data', icon: '⚖️' },
        ],
    },

    // ─── Education ──────────────────────────────────────────
    education: {
        displayName: 'Education Platform',
        alternatives: [
            { name: 'Khan Academy', url: 'https://khanacademy.org', reason: 'Non-profit, minimal data collection, free education', icon: '🎓' },
            { name: 'MIT OpenCourseWare', url: 'https://ocw.mit.edu', reason: 'Free university courses, no sign-up required for content', icon: '🏛️' },
            { name: 'LibreTexts', url: 'https://libretexts.org', reason: 'Open educational resources, free textbooks, no tracking', icon: '📚' },
        ],
    },

    // ─── Developer & Tech ───────────────────────────────────
    code_hosting: {
        displayName: 'Code Hosting',
        alternatives: [
            { name: 'Codeberg', url: 'https://codeberg.org', reason: 'Non-profit, open source Gitea instance, EU-based, no tracking', icon: '🏔️' },
            { name: 'Sourcehut', url: 'https://sr.ht', reason: 'Minimalist, no JavaScript required, mailing list workflow', icon: '📮' },
            { name: 'Gitea', url: 'https://gitea.io', reason: 'Self-hostable Git service, lightweight, open source', icon: '🍵' },
        ],
    },
    analytics: {
        displayName: 'Website Analytics',
        alternatives: [
            { name: 'Plausible', url: 'https://plausible.io', reason: 'Privacy-friendly, GDPR compliant, no cookies, open source', icon: '📊' },
            { name: 'Umami', url: 'https://umami.is', reason: 'Open source, self-hostable, no cookie banner needed', icon: '🔢' },
            { name: 'GoatCounter', url: 'https://goatcounter.com', reason: 'Open source, lightweight, no tracking, free for non-commercial', icon: '🐐' },
        ],
    },
    web_hosting: {
        displayName: 'Web Hosting',
        alternatives: [
            { name: 'Hetzner', url: 'https://hetzner.com', reason: 'German hosting, GDPR compliant, strong privacy practices', icon: '🖥️' },
            { name: '1984 Hosting', url: 'https://1984hosting.com', reason: 'Icelandic hosting, strong free-speech and privacy laws', icon: '🇮🇸' },
            { name: 'Njalla', url: 'https://njal.la', reason: 'Privacy-first domain and hosting, anonymous registration', icon: '🏠' },
        ],
    },
    domain_registrar: {
        displayName: 'Domain Registrar',
        alternatives: [
            { name: 'Njalla', url: 'https://njal.la', reason: 'Privacy-first registrar, they own the domain on your behalf', icon: '🔐' },
            { name: 'Gandi', url: 'https://gandi.net', reason: 'No ads, transparent pricing, free WHOIS privacy', icon: '🌐' },
            { name: 'Porkbun', url: 'https://porkbun.com', reason: 'Affordable, free WHOIS privacy on all domains', icon: '🐷' },
        ],
    },
    remote_access: {
        displayName: 'Remote Access',
        alternatives: [
            { name: 'RustDesk', url: 'https://rustdesk.com', reason: 'Open source, self-hostable TeamViewer alternative', icon: '🖥️' },
            { name: 'Apache Guacamole', url: 'https://guacamole.apache.org', reason: 'Clientless remote desktop gateway, open source', icon: '🥑' },
        ],
    },

    // ─── Design & Media Creation ────────────────────────────
    photo_editing: {
        displayName: 'Photo Editing',
        alternatives: [
            { name: 'GIMP', url: 'https://gimp.org', reason: 'Open source Photoshop alternative, no cloud requirement', icon: '🎨' },
            { name: 'Darktable', url: 'https://darktable.org', reason: 'Open source Lightroom alternative, non-destructive editing', icon: '📷' },
            { name: 'RawTherapee', url: 'https://rawtherapee.com', reason: 'Open source RAW photo processor, fully local', icon: '🖌️' },
        ],
    },
    design_tools: {
        displayName: 'Design Tools',
        alternatives: [
            { name: 'Penpot', url: 'https://penpot.app', reason: 'Open source Figma alternative, self-hostable, web-based', icon: '✏️' },
            { name: 'Inkscape', url: 'https://inkscape.org', reason: 'Open source vector graphics editor, fully offline', icon: '🖊️' },
            { name: 'Krita', url: 'https://krita.org', reason: 'Open source digital painting, professional quality', icon: '🎨' },
        ],
    },

    // ─── Translation ────────────────────────────────────────
    translation: {
        displayName: 'Translation Tool',
        alternatives: [
            { name: 'LibreTranslate', url: 'https://libretranslate.com', reason: 'Open source, self-hostable, no data collection', icon: '🌐' },
            { name: 'DeepL', url: 'https://deepl.com', reason: 'Superior translation quality, better privacy than Google Translate', icon: '📖' },
            { name: 'Apertium', url: 'https://apertium.org', reason: 'Open source machine translation, fully offline capable', icon: '🔠' },
        ],
    },

    // ─── Operating Systems ──────────────────────────────────
    operating_system: {
        displayName: 'Operating System',
        alternatives: [
            { name: 'Linux Mint', url: 'https://linuxmint.com', reason: 'User-friendly Linux, no telemetry, open source', icon: '🐧' },
            { name: 'Fedora', url: 'https://fedoraproject.org', reason: 'Community-driven, cutting-edge, strong security defaults', icon: '🎩' },
            { name: 'Tails', url: 'https://tails.net', reason: 'Amnesic system, Tor-based, leaves no trace', icon: '🧅' },
        ],
    },
    mobile_os: {
        displayName: 'Mobile OS',
        alternatives: [
            { name: 'GrapheneOS', url: 'https://grapheneos.org', reason: 'Hardened Android, no Google services, best mobile privacy', icon: '📱' },
            { name: 'CalyxOS', url: 'https://calyxos.org', reason: 'Privacy-focused Android with microG, user-friendly', icon: '🌸' },
            { name: 'LineageOS', url: 'https://lineageos.org', reason: 'Open source Android, wide device support, no bloatware', icon: '🔧' },
        ],
    },

    // ─── News & Content ─────────────────────────────────────
    news_media: {
        displayName: 'News & Media',
        alternatives: [
            { name: 'Ground News', url: 'https://ground.news', reason: 'Bias-aware news aggregation, transparent source ratings', icon: '📰' },
            { name: 'Miniflux', url: 'https://miniflux.app', reason: 'Self-hosted RSS reader, minimalist, no tracking', icon: '📡' },
            { name: 'Feeder', url: 'https://f-droid.org/packages/com.nononsenseapps.feeder/', reason: 'Open source RSS reader for Android, ad-free', icon: '📲' },
        ],
    },
    rss_reader: {
        displayName: 'RSS / News Reader',
        alternatives: [
            { name: 'Miniflux', url: 'https://miniflux.app', reason: 'Self-hosted, minimalist, open source, REST API', icon: '📡' },
            { name: 'FreshRSS', url: 'https://freshrss.org', reason: 'Self-hosted, full-featured, open source, multi-user', icon: '🍊' },
            { name: 'NewsFlash', url: 'https://flathub.org/apps/io.gitlab.news_flash.NewsFlash', reason: 'Desktop RSS reader, integrates with multiple backends', icon: '⚡' },
        ],
    },

    // ─── Catch-all / Unknown ────────────────────────────────
    unknown: {
        displayName: 'Online Service',
        alternatives: [
            { name: 'Privacy Guides', url: 'https://privacyguides.org', reason: 'Comprehensive resource for privacy-respecting alternatives', icon: '📚' },
            { name: 'AlternativeTo', url: 'https://alternativeto.net', reason: 'Find alternatives filtered by privacy/open source', icon: '🔄' },
            { name: 'PRISM Break', url: 'https://prism-break.org', reason: 'Curated list of anti-surveillance tools and services', icon: '🔓' },
        ],
    },
};

// ─── Domain → Category Mapping ──────────────────────────
// Maps well-known hostnames to categories for more reliable classification
const DOMAIN_CATEGORY_MAP: Record<string, string> = {
    // Search
    'google.com': 'search', 'bing.com': 'search', 'yahoo.com': 'search', 'baidu.com': 'search', 'yandex.com': 'search',
    // Email
    'gmail.com': 'email', 'outlook.com': 'email', 'mail.yahoo.com': 'email', 'aol.com': 'email', 'zoho.com': 'email',
    // Social Media
    'facebook.com': 'social_media', 'instagram.com': 'social_media', 'twitter.com': 'social_media', 'x.com': 'social_media',
    'linkedin.com': 'social_media', 'tiktok.com': 'social_media', 'snapchat.com': 'social_media',
    'pinterest.com': 'social_media', 'tumblr.com': 'social_media', 'threads.net': 'social_media',
    // Messaging
    'whatsapp.com': 'messaging', 'telegram.org': 'messaging', 'discord.com': 'messaging', 'slack.com': 'messaging',
    'messenger.com': 'messaging', 'wechat.com': 'messaging', 'viber.com': 'messaging',
    // Video Conferencing
    'zoom.us': 'video_conferencing', 'meet.google.com': 'video_conferencing', 'teams.microsoft.com': 'video_conferencing',
    'webex.com': 'video_conferencing',
    // Video Sharing
    'youtube.com': 'video_sharing', 'vimeo.com': 'video_sharing', 'dailymotion.com': 'video_sharing',
    // Streaming Video
    'netflix.com': 'streaming_video', 'hulu.com': 'streaming_video', 'disneyplus.com': 'streaming_video',
    'primevideo.com': 'streaming_video', 'hbomax.com': 'streaming_video', 'max.com': 'streaming_video',
    'peacocktv.com': 'streaming_video', 'paramountplus.com': 'streaming_video', 'crunchyroll.com': 'streaming_video',
    // Streaming Music
    'spotify.com': 'streaming_music', 'music.apple.com': 'streaming_music', 'music.youtube.com': 'streaming_music',
    'tidal.com': 'streaming_music', 'deezer.com': 'streaming_music', 'soundcloud.com': 'streaming_music',
    'pandora.com': 'streaming_music',
    // Cloud Storage
    'drive.google.com': 'cloud_storage', 'dropbox.com': 'cloud_storage', 'onedrive.live.com': 'cloud_storage',
    'box.com': 'cloud_storage', 'icloud.com': 'cloud_storage', 'mega.nz': 'cloud_storage',
    // E-commerce
    'amazon.com': 'ecommerce', 'ebay.com': 'ecommerce', 'walmart.com': 'ecommerce', 'etsy.com': 'ecommerce',
    'aliexpress.com': 'ecommerce', 'shopify.com': 'ecommerce', 'wish.com': 'ecommerce', 'target.com': 'ecommerce',
    'bestbuy.com': 'ecommerce', 'flipkart.com': 'ecommerce', 'myntra.com': 'ecommerce',
    // Finance
    'paypal.com': 'finance_banking', 'venmo.com': 'finance_banking', 'cashapp.com': 'finance_banking',
    'revolut.com': 'finance_banking', 'wise.com': 'finance_banking', 'robinhood.com': 'finance_banking',
    'coinbase.com': 'finance_banking', 'binance.com': 'finance_banking',
    // Food Delivery
    'ubereats.com': 'food_delivery', 'doordash.com': 'food_delivery', 'grubhub.com': 'food_delivery',
    'postmates.com': 'food_delivery', 'deliveroo.com': 'food_delivery', 'swiggy.com': 'food_delivery',
    'zomato.com': 'food_delivery',
    // Ride Sharing
    'uber.com': 'ride_sharing', 'lyft.com': 'ride_sharing', 'grab.com': 'ride_sharing',
    'bolt.eu': 'ride_sharing', 'ola.com': 'ride_sharing',
    // Maps
    'maps.google.com': 'maps_navigation', 'waze.com': 'maps_navigation',
    // Gaming
    'store.steampowered.com': 'gaming', 'steampowered.com': 'gaming', 'epicgames.com': 'gaming',
    'ea.com': 'gaming', 'ubisoft.com': 'gaming', 'roblox.com': 'gaming',
    // Dating
    'tinder.com': 'dating', 'bumble.com': 'dating', 'hinge.co': 'dating', 'match.com': 'dating',
    'okcupid.com': 'dating',
    // Education
    'coursera.org': 'education', 'udemy.com': 'education', 'edx.org': 'education',
    'skillshare.com': 'education', 'duolingo.com': 'education', 'chegg.com': 'education',
    // Fitness
    'fitbit.com': 'fitness_health', 'strava.com': 'fitness_health', 'myfitnesspal.com': 'fitness_health',
    'peloton.com': 'fitness_health',
    // Password Managers
    'lastpass.com': 'password_manager', '1password.com': 'password_manager', 'dashlane.com': 'password_manager',
    // Notes / Productivity
    'notion.so': 'productivity', 'evernote.com': 'notes', 'todoist.com': 'productivity',
    'trello.com': 'project_management', 'asana.com': 'project_management', 'monday.com': 'project_management',
    'clickup.com': 'project_management', 'jira.atlassian.com': 'project_management',
    // Office
    'docs.google.com': 'office_suite', 'sheets.google.com': 'office_suite', 'office.com': 'office_suite',
    'canva.com': 'design_tools',
    // AI
    'chat.openai.com': 'ai_assistant', 'chatgpt.com': 'ai_assistant', 'bard.google.com': 'ai_assistant',
    'gemini.google.com': 'ai_assistant', 'claude.ai': 'ai_assistant', 'copilot.microsoft.com': 'ai_assistant',
    // Code Hosting
    'github.com': 'code_hosting', 'gitlab.com': 'code_hosting', 'bitbucket.org': 'code_hosting',
    // Browsers
    'chrome.google.com': 'browser', 'microsoftedge.com': 'browser',
    // VPN
    'nordvpn.com': 'vpn', 'expressvpn.com': 'vpn', 'surfshark.com': 'vpn', 'cyberghostvpn.com': 'vpn',
    // DNS (cloudflare listed once in Web Hosting section)
    // Analytics
    'analytics.google.com': 'analytics', 'hotjar.com': 'analytics', 'mixpanel.com': 'analytics',
    // Web Hosting & Registrars
    'godaddy.com': 'domain_registrar', 'namecheap.com': 'domain_registrar', 'cloudflare.com': 'dns',
    'aws.amazon.com': 'web_hosting', 'cloud.google.com': 'web_hosting', 'azure.microsoft.com': 'web_hosting',
    'vercel.com': 'web_hosting', 'netlify.com': 'web_hosting', 'heroku.com': 'web_hosting',
    // Translation
    'translate.google.com': 'translation', 'deepl.com': 'translation',
    // Photo
    'photos.google.com': 'photo_storage', 'flickr.com': 'photo_storage',
    'photoshop.adobe.com': 'photo_editing', 'lightroom.adobe.com': 'photo_editing',
    // Design
    'figma.com': 'design_tools', 'sketch.com': 'design_tools',
    // Podcast
    'podcasts.apple.com': 'podcast', 'podcasters.spotify.com': 'podcast',
    // Forms
    'typeform.com': 'forms_surveys', 'surveymonkey.com': 'forms_surveys', 'forms.google.com': 'forms_surveys',
    // Link Shortener
    'bit.ly': 'link_shortener', 'tinyurl.com': 'link_shortener',
    // Payments
    'stripe.com': 'digital_payments', 'square.com': 'digital_payments',
    // Remote Access
    'teamviewer.com': 'remote_access', 'anydesk.com': 'remote_access',
    // News
    'news.google.com': 'news_media', 'apple.news': 'news_media', 'flipboard.com': 'news_media',
    // CRM
    'salesforce.com': 'crm', 'hubspot.com': 'crm',
    // Forum
    'reddit.com': 'forum',
};

/**
 * Try to infer category from a hostname (e.g. "mail.google.com" → "email")
 */
export function getCategoryFromDomain(hostname: string): string | null {
    if (!hostname) return null;

    // Strip www.
    const clean = hostname.replace(/^www\./, '').toLowerCase();

    // Direct match
    if (DOMAIN_CATEGORY_MAP[clean]) return DOMAIN_CATEGORY_MAP[clean];

    // Try parent domain (e.g., "mail.google.com" → "google.com")
    const parts = clean.split('.');
    if (parts.length > 2) {
        const parent = parts.slice(-2).join('.');
        if (DOMAIN_CATEGORY_MAP[parent]) return DOMAIN_CATEGORY_MAP[parent];
    }

    // Try subdomain-specific match (e.g., "drive.google.com")
    if (DOMAIN_CATEGORY_MAP[clean]) return DOMAIN_CATEGORY_MAP[clean];

    return null;
}

/**
 * Get alternatives for a given category.
 * Priority: exact match → domain guess → 'unknown' fallback
 */
export function getAlternatives(category?: ServiceCategory | string, hostname?: string): AlternativeCategory {
    // 1. Try exact category match
    const normalizedCategory = (category ?? 'unknown').toLowerCase().replace(/[\s-]/g, '_');
    if (normalizedCategory !== 'unknown' && ALTERNATIVES_DATABASE[normalizedCategory]) {
        return ALTERNATIVES_DATABASE[normalizedCategory];
    }

    // 2. Try domain-based category inference
    if (hostname) {
        const domainCategory = getCategoryFromDomain(hostname);
        if (domainCategory && ALTERNATIVES_DATABASE[domainCategory]) {
            return ALTERNATIVES_DATABASE[domainCategory];
        }
    }

    // 3. Fallback to unknown
    return ALTERNATIVES_DATABASE.unknown;
}

/**
 * Get the full list of category keys for the AI prompt
 */
export function getAllCategoryKeys(): string[] {
    return Object.keys(ALTERNATIVES_DATABASE).filter(k => k !== 'unknown');
}
