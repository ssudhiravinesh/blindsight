# 🛡️ Blind-Sight: The Legal Firewall
## Masterplan for Vibe Coding

> **TL;DR:** A Chrome Extension that scans Terms of Service agreements via Gemini Flash API, detects "lethal" clauses (data selling, forced arbitration, unilateral changes), and blocks the Accept button with a friction-based warning modal.

---

## 🎯 MVP Scope (Locked In)

| Decision | Choice |
|----------|--------|
| **ToS Extraction** | Scrape linked `/terms` pages (extensible architecture) |
| **Block UX** | Friction Block – modal with clause highlight + deliberate override |
| **API Key** | User provides their own Gemini API key |
| **Priority Clauses** | Data Selling, No Class Action, Unilateral Changes |
| **Trigger** | Hybrid – auto-detect signup pages + manual scan button |

---

## 📁 File Structure

```
blind-sight/
├── manifest.json           # Extension config (Manifest V3)
├── popup/
│   ├── popup.html          # Extension popup UI
│   ├── popup.css           # Popup styling
│   └── popup.js            # Popup logic (manual scan trigger, settings)
├── options/
│   ├── options.html        # Settings page (API key input)
│   ├── options.css         # Settings styling
│   └── options.js          # Settings logic (save/load API key)
├── content/
│   ├── content.js          # Main content script (DOM detection & manipulation)
│   ├── extractor.js        # ToS link finder & text scraper
│   ├── detector.js         # Signup page detection heuristics
│   └── blocker.js          # Button blocking & warning modal injection
├── background/
│   └── background.js       # Service worker (API calls to Gemini)
├── lib/
│   └── gemini.js           # Gemini API wrapper (prompt construction, parsing)
├── styles/
│   └── warning-modal.css   # Styles for the injected warning modal
├── assets/
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
└── README.md
```

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER TAB                               │
├─────────────────────────────────────────────────────────────────┤
│  content.js (Content Script)                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  detector.js │  │ extractor.js │  │  blocker.js  │           │
│  │  (Signup     │  │ (Find ToS    │  │ (Block btn,  │           │
│  │   detection) │→ │  link, fetch │→ │  show modal) │           │
│  └──────────────┘  │  full text)  │  └──────────────┘           │
│                    └──────────────┘                              │                    
└────────────────────────────┬────────────────────────────────────┘
                             │ chrome.runtime.sendMessage()
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  background.js (Service Worker)                                  │
│  ┌──────────────┐                                                │
│  │  gemini.js   │  ← Calls Gemini Flash API                     │
│  │  (API wrap)  │  ← Returns: { lethal: true, clauses: [...] }  │
│  └──────────────┘                                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔨 Step-by-Step Build Plan

### Phase 1: Foundation (Steps 1-3)
> Goal: Get a working extension skeleton that loads in Chrome.

#### Step 1: Create Manifest & Basic Popup
**What to build:**
- `manifest.json` with Manifest V3 structure
- Basic popup with "Blind-Sight" branding and a "Scan This Page" button
- Extension icons (can use placeholder colors initially)

**Files:** `manifest.json`, `popup/popup.html`, `popup/popup.css`, `popup/popup.js`

**Prompt strategy:**
> "Create a Manifest V3 Chrome extension with a popup that has a button labeled 'Scan This Page'. Include proper permissions for activeTab, storage, and scripting. Use a clean, modern dark theme for the popup."

---

#### Step 2: Settings Page for API Key
**What to build:**
- Options page where user can paste their Gemini API key
- Save key to `chrome.storage.local`
- Visual feedback (key saved confirmation)

**Files:** `options/options.html`, `options/options.css`, `options/options.js`

**Prompt strategy:**
> "Create a Chrome extension options page with a text input for a Gemini API key. Save the key to chrome.storage.local on submit. Show a green checkmark when saved successfully. Match the dark theme from the popup."

---

#### Step 3: Service Worker Skeleton
**What to build:**
- Background service worker that listens for messages
- Stub function for Gemini API calls
- Message passing setup between content script ↔ background

**Files:** `background/background.js`, `lib/gemini.js`

**Prompt strategy:**
> "Create a Manifest V3 background service worker that listens for messages with type 'ANALYZE_TOS'. It should read the API key from chrome.storage.local and have a placeholder function for calling the Gemini API. Return a mock response for now."

---

### Phase 2: Detection & Extraction (Steps 4-6)
> Goal: Detect signup pages and extract ToS text.

#### Step 4: Signup Page Detector
**What to build:**
- Heuristics to detect signup/registration forms
- Look for: email/password inputs, "Sign Up" / "Register" buttons
- Fire an event when signup page detected

**Files:** `content/detector.js`, `content/content.js`

**Prompt strategy:**
> "Write a content script module that detects if the current page is a signup/registration form. Check for: (1) password input fields, (2) email input fields, (3) buttons/links containing text like 'Sign Up', 'Register', 'Create Account'. Export a function `isSignupPage()` that returns true/false."

---

#### Step 5: ToS Link Finder & Text Extractor
**What to build:**
- Find links containing "terms", "tos", "terms of service", "legal"
- Fetch the linked page and extract text content
- Clean the text (remove nav, footer, scripts)

**Files:** `content/extractor.js`

**Prompt strategy:**
> "Write a module that: (1) Finds anchor tags whose href or text contains 'terms', 'tos', 'terms-of-service', 'legal', or 'conditions'. (2) Fetches the href URL. (3) Extracts the main text content, stripping navigation, footers, and scripts. Return the cleaned text. Handle errors gracefully."

---

#### Step 6: Wire Up Detection Flow
**What to build:**
- On page load: check if signup page → find ToS link → extract text
- Send extracted text to background for analysis
- Manual trigger from popup also works

**Files:** Update `content/content.js`, `popup/popup.js`

**Prompt strategy:**
> "Wire up the content script to: (1) On page load, run isSignupPage(). (2) If true, call extractTosText(). (3) Send the text to background via chrome.runtime.sendMessage({ type: 'ANALYZE_TOS', text: ... }). Also add a listener for manual trigger from the popup."

---

### Phase 3: Gemini Integration (Steps 7-8)
> Goal: Send ToS text to Gemini and get structured analysis.

#### Step 7: Gemini API Integration
**What to build:**
- Real Gemini Flash API call
- Craft a prompt that returns structured JSON
- Parse response for lethal clauses

**Files:** `lib/gemini.js`, `background/background.js`

**Prompt strategy:**
> "Implement the Gemini API call using fetch. The prompt should instruct Gemini to analyze Terms of Service text and return JSON like: { lethal: boolean, clauses: [{ type: 'DATA_SELLING' | 'NO_CLASS_ACTION' | 'UNILATERAL_CHANGES', quote: '...', explanation: '...' }] }. Use the gemini-1.5-flash model. Handle API errors and rate limits."

**Example Gemini Prompt (to embed in code):**
```
You are a legal document analyzer. Analyze the following Terms of Service text and identify any concerning clauses.

Look specifically for:
1. DATA_SELLING: Clauses about sharing/selling user data to third parties
2. NO_CLASS_ACTION: Forced arbitration or waiving class action rights
3. UNILATERAL_CHANGES: Ability to modify terms without notice

Respond ONLY with valid JSON in this format:
{
  "lethal": true/false,
  "clauses": [
    {
      "type": "DATA_SELLING",
      "quote": "exact quote from the text",
      "explanation": "brief human-readable explanation"
    }
  ]
}

Terms of Service text:
---
{TOS_TEXT}
---
```

---

#### Step 8: Response Handler
**What to build:**
- Parse Gemini response in background
- Send results back to content script
- Handle edge cases (no lethal clauses, API errors)

**Files:** `background/background.js`

**Prompt strategy:**
> "Update the background service worker to parse the Gemini JSON response. If parsing fails, return { error: 'parsing_failed' }. If lethal is true, send the clauses array back to the content script. If lethal is false, send { safe: true }."

---

### Phase 4: The Friction Block (Steps 9-10)
> Goal: Block the Accept button and show warning modal.

#### Step 9: Button Blocker
**What to build:**
- Find "Accept" / "I Agree" / "Sign Up" buttons
- Add overlay or disable them
- Store reference for later re-enabling

**Files:** `content/blocker.js`

**Prompt strategy:**
> "Write a module that finds buttons containing text like 'Accept', 'I Agree', 'Sign Up', 'Continue', 'Submit'. Disable them by setting disabled=true and adding a semi-transparent red overlay. Export functions: blockButtons() and unblockButtons()."

---

#### Step 10: Warning Modal
**What to build:**
- Inject a modal into the page
- Display detected clauses with highlights
- "I Understand the Risks" button with 5-second countdown OR type confirmation
- On override, unblock buttons and dismiss modal

**Files:** `content/blocker.js`, `styles/warning-modal.css`

**Prompt strategy:**
> "Create a warning modal that: (1) Overlays the entire page with a semi-dark backdrop. (2) Shows a red-themed modal with 'Warning: Lethal Clauses Detected' header. (3) Lists each clause with its type, quote, and explanation. (4) Has a disabled 'I Understand the Risks' button that enables after 5 seconds. (5) Clicking the button calls unblockButtons() and removes the modal. Use CSS animations for impact."

---

### Phase 5: Polish & Testing (Steps 11-12)
> Goal: Make it feel production-ready.

#### Step 11: Status Indicators
**What to build:**
- Extension icon badge: 🟢 safe, 🔴 lethal, ⚪ not scanned
- Popup shows last scan result
- Loading state while scanning

**Files:** `popup/popup.js`, `background/background.js`

**Prompt strategy:**
> "Add extension badge functionality: use chrome.action.setBadgeText and setBadgeBackgroundColor to show '✓' green when safe, '!' red when lethal, and '' when not scanned. Update the popup to show the last scan result with detected clauses."

---

#### Step 12: Error Handling & Edge Cases
**What to build:**
- No ToS link found → notify user
- API key missing → prompt to add in settings
- Network errors → graceful fallback
- Very long ToS → truncate smartly

**Files:** All files - add error handling throughout

**Prompt strategy:**
> "Add comprehensive error handling: (1) If no ToS link found, show a yellow badge and message 'No ToS link found'. (2) If API key missing, show popup message with link to settings. (3) On network error, show retry option. (4) If ToS text exceeds 30,000 characters, truncate to the first 30,000 with a note."

---

## 🧪 Testing Strategy

### Manual Testing Checklist
- [ ] Extension loads in Chrome without errors
- [ ] Settings page saves/retrieves API key
- [ ] Popup "Scan" button triggers analysis
- [ ] Signup page detection works on: Google, Twitter, GitHub signup pages
- [ ] ToS extraction works for pages with linked terms
- [ ] Gemini returns valid JSON responses
- [ ] Modal appears when lethal clauses detected
- [ ] Modal countdown/override works
- [ ] Buttons re-enable after override
- [ ] Badge updates correctly

### Test Sites
| Site | Expected Behavior |
|------|-------------------|
| `accounts.google.com/signup` | Should detect signup, find ToS link |
| `twitter.com/i/flow/signup` | Should detect signup |
| `github.com/signup` | Should detect signup, find ToS link |
| Any site without signup form | Should NOT trigger auto-scan |

---

## 💡 Prompting Tips for Vibe Coding

### General Strategy
1. **Start each prompt with context:** "I'm building a Chrome extension called Blind-Sight that..."
2. **Reference existing files:** "Here's my current manifest.json: [paste]. Now add..."
3. **Ask for one file at a time:** Don't ask for 5 files in one prompt
4. **Request specific formats:** "Use ES6 modules", "Add JSDoc comments", "Return JSON"

### Debugging Prompts
- "This code throws [error]. Here's the full file and console log. Fix it."
- "The content script isn't detecting ToS links on [URL]. Here's what I see in DOM..."

### Iteration Prompts
- "The modal looks too plain. Make it more dramatic with animations and a red glow."
- "Gemini sometimes returns malformed JSON. Add robust parsing with fallbacks."

---

## 🚀 Future Enhancements (Post-MVP)

1. **More extraction methods:** Inline ToS, modals, iframes
2. **More clause types:** Auto-renewal traps, perpetual licenses, liability waivers
3. **Whitelist/Blacklist:** User can mark sites as trusted
4. **History:** View past scans and decisions
5. **Backend proxy:** For users who don't want to manage API keys
6. **Severity scoring:** Not just lethal/safe, but a 1-10 risk score

---

## ⚡ Quick Start Commands

```bash
# Create project structure
mkdir -p blind-sight/{popup,options,content,background,lib,styles,assets}

# After building, load extension:
# 1. Go to chrome://extensions
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the blind-sight folder
```

---

**You've got this!** 🚀 Start with Step 1, get it loading in Chrome, then iterate. The architecture is designed so each step builds on the last without breaking anything. Ship fast, fix later.

*— Your CTO Co-Pilot*
