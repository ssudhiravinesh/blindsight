# Chrome Web Store Listing & Compliance Documentation

This document contains the metadata, permission justifications, and privacy policy required for the Chrome Web Store (CWS) submission of **Blindsight**.

---

## 1. Store Listing Copy

### Extension Title
`Blindsight: Terms of Service Scanner & Shield`

### Single-Sentence Tagline
`Scans Terms of Service for harmful clauses and flags predatory terms before you click accept.`

### Detailed Description
```
Blindsight is your legal firewall. Every day, we sign away our privacy, rights, and data by clicking "I Agree" to agreements we never read. Blindsight changes that by instantly reading, analyzing, and grading the terms for you.

Key Features:
- Automatic Signup Page Detection: Blindsight recognizes when you are on a signup page and automatically prepares to inspect the terms.
- Severity-Graded Warnings: Harmful clauses (like data selling, forced arbitration, or class-action waivers) are flagged with clear alerts.
- Inline Safeguard Overlay: Block and cover accept buttons on predatory sites, prompting you to review the warnings before agreeing.
- Cost-saving Shared Cache: Leverages a high-speed cached database of scanned sites to deliver instant grade assessments under 100ms.
- 100% Anonymous First: No accounts, emails, or personal data required. All analysis runs via a unique, anonymous device identifier.

Protect your rights and browse safely. Install Blindsight today.
```

---

## 2. Permission Justifications (Privacy & Security Review)

The Chrome Web Store requires explicit, single-purpose justifications for sensitive API permissions. Below are our justifications:

| Permission / API | API Usage | Single-Purpose Justification |
|------------------|-----------|------------------------------|
| `activeTab` | Temporary access to the current tab | Used to inject styling and read ToS elements from the page only when the user clicks the extension popup to run a scan. |
| `storage` | Local extension state storage | Used to persist anonymous device UUID and user settings locally. |
| `alarms` | Cron alarm scheduling | Triggers periodic background checks (every 6 hours) to poll for notifications of Terms updates for tracked domains. |
| `notifications` | OS-level alerts | Sends desktop push notifications to the user if a tracked service alters its terms. |
| `scripting` | Injection of stylesheets/scripts | Programmatically injects the Shadow DOM warning overlay on pages containing critical legal clauses. |
| `contextMenus` | Context menu action | Adds a right-click context menu item so users can scan legal text selections on any web page. |
| `<all_urls>` (Host) | Cross-origin network access | Required because legal agreements are hosted on diverse domains. To inspect agreements and search for Terms links, the background service worker must be permitted to request and analyze text elements across any target origin. |

---

## 3. Privacy Policy

**Effective Date: June 18, 2026**

### Introduction
Blindsight ("we," "our," or "us") is dedicated to protecting your privacy. This Privacy Policy details how we handle user data. Our core principle is simple: **we do not collect, store, or sell any personally identifiable information (PII).**

### Data Collection & Usage
1. **Anonymous Device ID**: On first scan, the extension registers a random identifier (UUID) with our backend. It contains no email, name, or hardware identifiers. It is used only for abuse-prevention rate limiting and to deliver notifications for services you choose to track.
2. **Scan Text Elements**: When you initiate a scan, the text of the legal terms on that page is normalized and hashed. This hash is compared against a database of previously analyzed terms. We only store the text hash and the anonymous ID to cache findings.
3. **No Browsing History Stored**: Blindsight does not log, track, or record your browsing history. The extension only runs Strategy matchers locally on your device.

### Data Security
All communications between the extension and our Supabase backend are encrypted via HTTPS. 

### Contact
For questions regarding compliance or privacy, contact compliance@blindsight.ai.
