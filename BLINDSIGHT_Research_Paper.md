# Blind-Sight: An AI-Powered Legal Firewall for Real-Time Terms of Service Analysis

---

**Authors:** Team Syndicate  
**Domain:** Privacy Engineering, Natural Language Processing, Browser Security  
**Platform:** Google Chrome Extension (Manifest V3)  
**Date:** February 2026

---

## Abstract

The modern internet economy operates on a foundation of legal agreements — Terms of Service (ToS), privacy policies, and end-user license agreements — that the overwhelming majority of users accept without reading. Studies indicate that less than 1% of users read these documents before clicking "I Agree," exposing themselves to predatory data-selling clauses, irrevocable content licensing, and class-action waivers buried within thousands of words of dense legal prose. **Blind-Sight** addresses this systemic vulnerability by deploying an AI-powered Chrome extension that intercepts the user at the critical moment of consent. Leveraging the Llama 3.3 70B large language model served through a custom FastAPI backend, and with fallback support for OpenAI GPT-4o-mini and Google Gemini 2.0 Flash, the system performs real-time extraction, analysis, and severity classification of Terms of Service text. It assigns a four-tier severity grade (Standard, Notable, Cautionary, Critical) and, for high-risk agreements, physically blocks the "Accept" button with graduated intervention mechanisms — from timed cooldown barriers to mandatory confirmation phrases. Blind-Sight further enhances user protection by maintaining a curated database of over 200 privacy-respecting alternatives across 45+ service categories, and autonomously monitors tracked services for ToS changes, issuing proactive notifications when concerning amendments are detected. Built on React 18, TypeScript 5.3, and Chrome Manifest V3, the extension achieves sub-minute analysis cycles while maintaining a non-intrusive user experience through a prompt-first interaction model. This paper presents the architecture, methodology, and design philosophy of Blind-Sight, demonstrating a practical approach to democratising legal literacy in the digital age.

---

## 1. Introduction & Problem Statement

### 1.1 The Consent Crisis

Digital consent has devolved into a meaningless ritual. A landmark study by Obar and Oeldorf-Hirsch (2020) found that 97% of participants in a controlled experiment failed to read the Terms of Service before accepting. The average ToS agreement for a major internet platform spans 4,000–8,000 words — roughly 15–30 minutes of focused reading per service. With the average internet user maintaining accounts across 70–100 online services, full compliance with informed consent would demand hundreds of hours of legal review annually.

This asymmetry is not incidental; it is structural. Corporations invest significant legal resources in drafting Terms of Service that maximise institutional protection while minimising user awareness. Predatory clauses — including blanket data-selling authorisations, perpetual content licensing, mandatory arbitration with class-action waivers, and unilateral amendment rights — are routinely embedded within otherwise standard agreements. The consequence is a global population that has, unwittingly, surrendered substantial legal rights and personal data sovereignty.

### 1.2 Limitations of Existing Solutions

Prior approaches to this problem have been largely informational rather than interventional:

- **ToS;DR (Terms of Service; Didn't Read):** Provides crowdsourced ratings for popular services, but relies on manual review by volunteers, resulting in incomplete coverage and significant lag between ToS changes and corresponding ratings updates.
- **Privacy Badger / uBlock Origin:** Focus on blocking trackers and advertisements rather than analysing legal agreements. They address symptoms (tracking) rather than the root cause (uninformed consent).
- **Static Policy Scanners:** Rule-based keyword matching tools that flag specific terms but lack the contextual understanding required to distinguish between standard legal language and genuinely concerning clauses.

None of these solutions operate at the **point of consent** — the precise moment when the user is about to click "Accept" — nor do they provide **graduated, severity-proportionate intervention** that physically prevents hasty agreement to dangerous terms.

### 1.3 Problem Definition

The core problem Blind-Sight addresses can be formalised as follows: *Given an arbitrary web page where a user is about to enter into a legal agreement, can we automatically (1) detect the consent event, (2) extract the relevant legal text, (3) classify its severity using natural language understanding, and (4) intervene proportionally to prevent uninformed consent — all within a latency window acceptable for interactive web browsing?*

---

## 2. Proposed Solution

### 2.1 System Overview

Blind-Sight is architected as a three-layer system operating across the browser client and a cloud-hosted inference server:

```
┌─────────────────────────────────────────────────────────────┐
│                     CHROME EXTENSION                        │
│                                                             │
│  ┌─────────────┐   ┌──────────────┐   ┌─────────────────┐  │
│  │  Detector    │──▶│  Extractor   │──▶│    Blocker       │  │
│  │  (Content)   │   │  (Content)   │   │   (Content)      │  │
│  └─────────────┘   └──────────────┘   └─────────────────┘  │
│         │                  │                    ▲            │
│         ▼                  ▼                    │            │
│  ┌──────────────────────────────────────────────┤           │
│  │           Background Service Worker          │           │
│  │     (Orchestration, History, Badge, Alarms)  │           │
│  └──────────────────────────────┬───────────────┘           │
└─────────────────────────────────┼───────────────────────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │    Syndicate Server         │
                    │  (FastAPI + Rate Limiting)  │
                    │             │               │
                    │   ┌────────▼────────┐      │
                    │   │ Llama 3.3 70B   │      │
                    │   │  (via Groq)     │      │
                    │   └─────────────────┘      │
                    └────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
         GPT-4o-mini    Gemini 2.0 Flash   (Fallbacks)
```

**Layer 1 — Content Scripts:** Injected into every web page, these scripts handle sign-up page detection, ToS text extraction, and UI overlay rendering.

**Layer 2 — Background Service Worker:** The Manifest V3 service worker orchestrates message passing, manages scan history, controls the extension badge, handles ToS update monitoring via Chrome Alarms, and routes analysis requests.

**Layer 3 — Syndicate Server:** A Python FastAPI backend deployed on Railway, interfacing with the Groq API for Llama 3.3 70B inference. It provides authentication, rate limiting, and a versioned RESTful API.

### 2.2 The Analysis Pipeline

The Blind-Sight pipeline executes in four sequential phases:

**Phase 1 — Detection:** The `detector.ts` module implements a heuristic confidence-scoring system that evaluates the current page against multiple indicators: presence of password and email input fields, sign-up/login button keywords, terms-agreement checkboxes, form action URLs, page title, and URL patterns. Each indicator contributes a weighted score (e.g., password field: +25, confirm password: +30, signup button: +30, terms checkbox: +25, URL match: +20). A composite score exceeding the configurable threshold (default: 50) triggers the detection pipeline.

**Phase 2 — Extraction:** The `extractor.ts` module employs a multi-strategy approach to locate and extract ToS text:

1. **Current-Page Analysis:** Checks if the current page _is_ the ToS document (via URL and title pattern matching), extracting main content directly.
2. **Inline ToS Detection:** Searches for embedded ToS content using data attributes (`[data-tos]`, `[data-terms]`) and semantic class/ID selectors (`.terms-content`, `#tos-text`).
3. **Link Discovery:** Scans all anchor elements for ToS-related hyperlinks using keyword matching against both link text and href patterns.
4. **Well-Known Path Guessing:** Falls back to probing standard ToS URL patterns (`/terms`, `/tos`, `/terms-of-service`, `/legal/terms`, `/privacy`).
5. **Background Fetch:** If content-script CORS restrictions block direct retrieval, the request is escalated to the background service worker for cross-origin fetching.

**Phase 3 — LLM Analysis:** Extracted text (truncated to 30,000 characters) is submitted to the Syndicate Server, which forwards it to Llama 3.3 70B with a carefully engineered system prompt. The prompt defines four severity tiers with explicit calibration instructions to avoid both false positives (flagging standard arbitration clauses) and false negatives (overlooking stacked aggressive terms). The LLM returns structured JSON containing an overall severity score, individual clause classifications with direct quotes and human-readable explanations, service category identification, and (for unknown categories) AI-suggested privacy-respecting alternatives.

**Phase 4 — Intervention:** Based on the severity classification, the `blocker.ts` module deploys graduated UI interventions:

| Severity | Grade | Intervention |
|----------|-------|-------------|
| **Tier 0 — Standard** | A (Green) | Non-intrusive toast notification: "Terms Look Good" |
| **Tier 1 — Notable** | B (Yellow) | Toast with clause summary; no blocking |
| **Tier 2 — Cautionary** | C (Orange) | Full-screen overlay with clause list; Accept button blocked with a 5-second countdown timer |
| **Tier 3 — Critical** | F (Red) | Full-screen overlay; Accept button locked until the user types the exact phrase **"I PROCEED"** |

---

## 3. How to Use Blind-Sight

### 3.1 Installation

1. Clone the repository and install dependencies:
   ```
   git clone <repository-url>
   cd BLINDSIGHT_3.0
   npm install
   npm run build
   ```
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer Mode** and click **Load unpacked**.
4. Select the `dist/` folder generated by the build process.

### 3.2 Configuration

- **Built-in Server (Default):** Blind-Sight ships pre-configured to use the Syndicate Server for analysis. No additional setup is required.
- **Personal API Key (Optional):** Navigate to the extension's Settings page to configure a personal Gemini or OpenAI API key as a fallback or primary analysis provider.

### 3.3 Usage Workflow

1. **Automatic Detection:** Browse normally. When Blind-Sight detects a sign-up or login page, a non-intrusive banner slides in from the top: *"Sign-up page detected. Would you like Blind-Sight to scan the Terms of Service before you continue?"*
2. **One-Click Scan:** Click **"Scan Terms"** to initiate analysis. A scanning animation provides visual feedback.
3. **Review Results:** A severity-graded result card appears showing the overall grade (A–F), clause-by-clause breakdown, and privacy-safe alternatives for concerning services.
4. **Manual Scanning:** Right-click on any page and select *"Scan this page with Blind-Sight"* from the context menu, or use the keyboard shortcut **Alt+B** to trigger a scan.
5. **Popup Dashboard:** Click the extension icon to view the popup interface, which displays the current page's scan status, history of recent scans, and severity indicators.

---

## 4. Features

### 4.1 Core Features

- **AI-Powered ToS Analysis:** Leverages Llama 3.3 70B for deep contextual understanding of legal language, distinguishing between standard boilerplate and genuinely predatory clauses.
- **Four-Tier Severity Grading System:** Classifies ToS into Standard (Green/A), Notable (Yellow/B), Cautionary (Orange/C), and Critical (Red/F) tiers with precise calibration criteria.
- **Graduated Intervention Mechanism:** Deploys severity-proportionate blocking — from informational toasts to physical button locks requiring explicit user acknowledgement.
- **Multi-Strategy ToS Extraction:** Employs five cascading extraction strategies (current-page analysis, inline detection, link discovery, well-known path probing, and background cross-origin fetching) to reliably locate ToS text across diverse website architectures.
- **Heuristic Sign-Up Page Detection:** Confidence-based scoring system analysing DOM elements (input fields, buttons, checkboxes, forms) and URL/title patterns to automatically detect consent events.

### 4.2 Privacy Protection Features

- **Curated Alternatives Database:** Maintains a hand-curated database of **200+ privacy-respecting service alternatives** spanning **45+ categories** — from email (ProtonMail, Tuta) to social media (Mastodon, Bluesky) to VPNs (Mullvad, ProtonVPN).
- **AI-Generated Alternatives:** For services outside the curated database, the LLM dynamically suggests privacy-friendly alternatives with reasoning.
- **Domain-to-Category Mapping:** A comprehensive mapping of **150+ popular domains** to service categories enables instant alternative lookup without requiring LLM inference.

### 4.3 Monitoring & Intelligence

- **Autonomous ToS Change Detection:** Tracks accepted ToS versions per domain and periodically checks (every 5 minutes via Chrome Alarms) for version changes. When a change is detected, the updated ToS is re-analysed and the user receives a Chrome notification graded by severity.
- **Scan History:** Maintains a rolling history of the last 10 scans with hostname, severity, clause count, timestamp, and summary.
- **Dynamic Badge System:** The extension icon badge reflects the current page's status in real time (✓ Safe, • Notable, ⚠ Caution, ! Danger, ... Scanning, ? Prompt).

### 4.4 Multi-Provider LLM Architecture

- **Primary:** Syndicate Server → Llama 3.3 70B via Groq
- **Fallback 1:** User's personal Gemini 2.0 Flash API key
- **Fallback 2:** User's personal OpenAI GPT-4o-mini API key
- Automatic failover with retry logic (2 attempts, 3-second backoff) for server errors and cold starts.

### 4.5 User Experience

- **Prompt-First Interaction Model:** Never auto-scans without user consent; always presents a dismissible prompt first.
- **Context Menu Integration:** Right-click any page to trigger a scan.
- **Keyboard Shortcut:** `Alt+B` for instant scanning.
- **Smooth Animations:** CSS-powered slide-in banners, fade-out result cards, and shake animations for invalid input provide a polished, modern UI.

---

## 5. Unique Selling Proposition (USP)

Blind-Sight's differentiation rests on three pillars that no existing solution jointly delivers:

### 5.1 Point-of-Consent Intervention

Unlike informational tools (ToS;DR, Privacy Badger) that operate passively or after the fact, Blind-Sight intercepts the user **at the exact moment of consent formation**. The sign-up page detector identifies when a user is about to agree to terms, and the graduated blocking mechanism physically prevents uninformed acceptance of high-risk agreements. This is not a review tool — it is a **legal firewall**.

### 5.2 Contextual Intelligence over Keyword Matching

Traditional ToS scanners rely on keyword matching (flagging the word "arbitration" regardless of context). Blind-Sight's LLM-powered analysis understands semantic context: it distinguishes between arbitration with a 30-day opt-out (a standard, Tier 1 practice) and mandatory arbitration with no opt-out combined with a class-action waiver (a Tier 3 predatory term). The system prompt includes explicit calibration notes preventing brand-name anchoring bias and enabling severity escalation when multiple moderate-risk clauses stack.

### 5.3 Actionable Protection, Not Just Awareness

Blind-Sight goes beyond awareness by providing **actionable alternatives**. When a service's ToS is graded as concerning, the user is immediately presented with privacy-respecting alternatives in the same service category — with explanations of why each alternative is safer. This transforms the interaction from "this is bad" to "here is what you can use instead."

---

## 6. Scalability & Future Scope

### 6.1 Current Scalability Architecture

- **Stateless Server Design:** The Syndicate Server is stateless, enabling horizontal scaling via containerised deployment on platforms like Railway, Render, or AWS ECS.
- **Rate Limiting:** Per-key rate limiting (10 requests/minute via slowapi) protects the server from abuse while ensuring fair access.
- **Multi-Provider Fallback:** The three-provider LLM architecture (Groq → Gemini → OpenAI) provides inherent resilience; if any provider is down, analysis continues via alternatives.
- **Client-Side Caching:** Scan results are cached per-tab in Chrome session storage, preventing redundant API calls for already-analysed pages.
- **Text Truncation:** ToS text is intelligently truncated to 30,000 characters to control LLM token costs while preserving the most relevant content.

### 6.2 Future Scope

1. **Cross-Browser Support:** Extend to Firefox (WebExtensions API), Safari (Safari Web Extensions), and Edge via a unified extension codebase with browser-specific adapters.
2. **Historical ToS Diff Analysis:** Instead of merely detecting ToS version changes, perform clause-level diff analysis highlighting exactly what was added, removed, or modified — with severity-graded change impact scoring.
3. **Community-Powered ToS Database:** Build a centralised, crowdsourced repository of pre-analysed ToS documents to enable instant results for popular services without requiring per-user LLM inference, dramatically reducing latency and costs.
4. **Enterprise/Organisational Deployment:** Offer a managed deployment mode for organisations where IT administrators can enforce ToS scanning policies, set minimum acceptability thresholds, and maintain organisation-wide audit logs.
5. **Mobile Integration:** Develop a companion mobile application (or operating system-level integration) that intercepts ToS consent across native mobile apps, not just web browsers.
6. **Regulatory Compliance Mapping:** Map detected ToS clauses to specific regulatory frameworks (GDPR, CCPA, DPDPA) to flag potential legal non-compliance and generate regulatory risk reports.
7. **Fine-Tuned Domain-Specific Model:** Train or fine-tune a smaller, specialised language model on a corpus of ToS documents and legal annotations to reduce inference costs (moving from 70B to a 7B–13B specialist model) while maintaining or improving analysis accuracy.
8. **Browser-Native LLM Inference:** As on-device LLM capabilities mature (e.g., Chrome's built-in Gemini Nano), shift analysis entirely to the client side, eliminating server dependency and ensuring complete privacy of the analysed text.

---

## 7. Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend Framework** | React 18 + TypeScript 5.3 | Popup UI and component architecture |
| **Build System** | Vite 5 + @crxjs/vite-plugin | Fast HMR, Chrome extension bundling |
| **Styling** | Tailwind CSS 3.4 | Utility-first styling for popup |
| **State Management** | Zustand 4.5 | Lightweight state for popup components |
| **Extension Platform** | Chrome Manifest V3 | Content scripts, service worker, alarms, notifications |
| **Backend Framework** | FastAPI (Python) | Async API gateway with CORS, rate limiting |
| **Primary LLM** | Llama 3.3 70B via Groq | High-quality ToS analysis at inference speed |
| **Fallback LLMs** | Gemini 2.0 Flash, GPT-4o-mini | Resilience and user-configurable providers |
| **Rate Limiting** | slowapi | Per-API-key request throttling |
| **Deployment** | Railway / Render | Containerised cloud hosting with auto-scaling |

---

## 8. Conclusion

Blind-Sight represents a paradigm shift in how users interact with legal agreements on the internet. By positioning AI-powered analysis at the precise moment of consent — rather than as an after-the-fact informational service — the system transforms the "I Agree" button from a rubber stamp into a genuine checkpoint for informed decision-making.

The technical contribution of this work is threefold. First, we demonstrate that multi-strategy ToS extraction (combining DOM analysis, link discovery, well-known path probing, and cross-origin background fetching) can reliably locate legal text across the diversity of modern web architectures. Second, we show that large language models, when guided by carefully calibrated severity-tier prompts, can distinguish between standard legal boilerplate and genuinely predatory terms with sufficient accuracy for real-time user protection. Third, we introduce graduated, severity-proportionate intervention mechanisms — from passive notifications to active button blocking — that balance user agency with informed consent.

The curated alternatives database spanning 45+ service categories and 200+ privacy-respecting alternatives, combined with autonomous ToS change monitoring and proactive notifications, extends Blind-Sight's protection beyond the initial consent event into an ongoing privacy guardianship role.

As Terms of Service grow longer, more complex, and more consequential — governing everything from biometric data collection to AI training data rights — tools like Blind-Sight transition from convenience to necessity. The gap between the legal sophistication of the agreements users sign and the time those users can realistically devote to reading them will only widen. Blind-Sight is designed to bridge that gap: not by replacing human judgement, but by ensuring that when a user clicks "I Agree," they do so with genuine awareness of what they are agreeing to.

---

## References

1. Obar, J. A., & Oeldorf-Hirsch, A. (2020). The Biggest Lie on the Internet: Ignoring the Privacy Policies and Terms of Service Policies of Social Networking Services. *Information, Communication & Society*, 23(1), 128–147.
2. McDonald, A. M., & Cranor, L. F. (2008). The Cost of Reading Privacy Policies. *I/S: A Journal of Law and Policy for the Information Society*, 4(3), 543–568.
3. Lippi, M., et al. (2019). CLAUDETTE: An Automated Detector of Potentially Unfair Clauses in Online Terms of Service. *Artificial Intelligence and Law*, 27(2), 117–139.
4. Chrome Extensions Documentation — Manifest V3. Google Developers. https://developer.chrome.com/docs/extensions/
5. Groq API Documentation. https://console.groq.com/docs

---

*© 2026 Team Syndicate. All rights reserved. Licensed under MIT.*
