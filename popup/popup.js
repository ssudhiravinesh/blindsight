const scanBtn = document.getElementById('scan-btn');
const scanBtnText = document.getElementById('scan-btn-text');
const statusArea = document.getElementById('status-area');
const resultsArea = document.getElementById('results-area');
const resultTitle = document.getElementById('result-title');
const resultMessage = document.getElementById('result-message');
const clauseList = document.getElementById('clause-list');
const retryBtn = document.getElementById('retry-btn');
const gotoTosBtn = document.getElementById('goto-tos-btn');
const apiKeyAlert = document.getElementById('api-key-alert');
const setupSettingsLink = document.getElementById('setup-settings-link');
const settingsLink = document.getElementById('settings-link');
const alternativesSection = document.getElementById('alternatives-section');
const alternativesTitle = document.getElementById('alternatives-title');
const alternativesList = document.getElementById('alternatives-list');
const historySection = document.getElementById('history-section');
const historyList = document.getElementById('history-list');

// Trust Badge Elements
const trustBadge = document.getElementById('trust-badge');
const trustGrade = document.getElementById('trust-grade');
const trustProgress = document.getElementById('trust-progress');
const trustStatus = document.getElementById('trust-status');
const copyBtn = document.getElementById('copy-btn');
const toast = document.getElementById('toast');

// Current scan result for copy functionality
let currentScanResult = null;

// Store ToS URL for "Go to ToS" button
let pendingTosUrl = null;

/**
 * Alternatives database for popup display
 */
const ALTERNATIVES_DATABASE = {
  vpn: {
    displayName: 'VPN Service',
    alternatives: [
      { name: 'ProtonVPN', url: 'https://protonvpn.com', reason: 'No-logs policy, Swiss privacy', icon: '🛡️' },
      { name: 'Mullvad VPN', url: 'https://mullvad.net', reason: 'Anonymous accounts, no email required', icon: '🔒' },
      { name: 'IVPN', url: 'https://ivpn.net', reason: 'Open source, transparent', icon: '✨' }
    ]
  },
  email: {
    displayName: 'Email Service',
    alternatives: [
      { name: 'ProtonMail', url: 'https://proton.me', reason: 'End-to-end encrypted email', icon: '📬' },
      { name: 'Tutanota', url: 'https://tutanota.com', reason: 'Encrypted, no tracking', icon: '🔐' },
      { name: 'Fastmail', url: 'https://fastmail.com', reason: 'Privacy-focused, no ads', icon: '✉️' }
    ]
  },
  cloud_storage: {
    displayName: 'Cloud Storage',
    alternatives: [
      { name: 'Proton Drive', url: 'https://proton.me/drive', reason: 'End-to-end encrypted storage', icon: '☁️' },
      { name: 'Tresorit', url: 'https://tresorit.com', reason: 'Zero-knowledge encryption', icon: '🗄️' },
      { name: 'Sync.com', url: 'https://sync.com', reason: 'Zero-knowledge, Canadian privacy', icon: '🔄' }
    ]
  },
  social_media: {
    displayName: 'Social Media',
    alternatives: [
      { name: 'Mastodon', url: 'https://joinmastodon.org', reason: 'Decentralized, no ads', icon: '🐘' },
      { name: 'Bluesky', url: 'https://bsky.app', reason: 'User-controlled algorithms', icon: '🌤️' },
      { name: 'Pixelfed', url: 'https://pixelfed.org', reason: 'Privacy-focused photo sharing', icon: '📸' }
    ]
  },
  messaging: {
    displayName: 'Messaging',
    alternatives: [
      { name: 'Signal', url: 'https://signal.org', reason: 'Gold standard for privacy', icon: '🔵' },
      { name: 'Element', url: 'https://element.io', reason: 'Decentralized, end-to-end encrypted', icon: '💎' },
      { name: 'Session', url: 'https://getsession.org', reason: 'No phone number required', icon: '🟢' }
    ]
  },
  search: {
    displayName: 'Search Engine',
    alternatives: [
      { name: 'DuckDuckGo', url: 'https://duckduckgo.com', reason: 'No tracking, no profiling', icon: '🦆' },
      { name: 'Brave Search', url: 'https://search.brave.com', reason: 'Independent index, no tracking', icon: '🦁' },
      { name: 'Startpage', url: 'https://startpage.com', reason: 'Google results, no tracking', icon: '🔍' }
    ]
  },
  default: {
    displayName: 'Privacy Tools',
    alternatives: [
      { name: 'Privacy Guides', url: 'https://privacyguides.org', reason: 'Expert privacy recommendations', icon: '📖' },
      { name: 'AlternativeTo', url: 'https://alternativeto.net', reason: 'Find privacy alternatives', icon: '🔀' }
    ]
  }
};

/**
 * Severity level configuration
 */
const SEVERITY_CONFIG = {
  0: {
    name: 'Standard',
    status: 'safe',
    icon: '✅',
    title: 'Terms Look Good',
    message: 'Standard, industry-normal terms. You\'re good to go!',
    cardClass: 'safe'
  },
  1: {
    name: 'Notable',
    status: 'notable',
    icon: '📝',
    title: 'Notable Terms',
    message: 'Some terms worth knowing about, but common practice.',
    cardClass: 'notable'
  },
  2: {
    name: 'Cautionary',
    status: 'caution',
    icon: '⚠️',
    title: 'Proceed with Caution',
    message: 'Unusual terms detected. Review before accepting.',
    cardClass: 'caution'
  },
  3: {
    name: 'Critical',
    status: 'danger',
    icon: '🚨',
    title: 'Critical Terms Detected',
    message: 'Aggressive terms found. A warning has been shown on the page.',
    cardClass: 'danger'
  }
};

/**
 * Clause type icons and names - expanded for new types
 */
const CLAUSE_INFO = {
  DATA_SELLING: { icon: '💰', name: 'Data Selling/Sharing' },
  ARBITRATION: { icon: '⚖️', name: 'Arbitration Clause' },
  NO_CLASS_ACTION: { icon: '🚫', name: 'No Class Action' },
  TOS_CHANGES: { icon: '📝', name: 'Terms Changes' },
  CONTENT_RIGHTS: { icon: '©️', name: 'Content Rights' },
  LIABILITY: { icon: '⚡', name: 'Liability Waiver' },
  UNILATERAL_CHANGES: { icon: '📝', name: 'Unilateral Changes' },
  OTHER: { icon: '📋', name: 'Other' },
  DEFAULT: { icon: '⚠️', name: 'Concerning Clause' }
};

/**
 * Get severity CSS class color
 */
function getSeverityColor(severity) {
  const colors = {
    0: '#22c55e', // Green
    1: '#eab308', // Yellow
    2: '#f97316', // Orange
    3: '#ef4444'  // Red
  };
  return colors[severity] || colors[0];
}

/**
 * Convert severity level to letter grade
 */
function severityToGrade(severity) {
  const grades = { 0: 'A', 1: 'B', 2: 'C', 3: 'F' };
  return grades[severity] ?? 'A';
}

/**
 * Render the trust score badge
 */
function renderTrustBadge(severity, hostname) {
  if (!trustBadge) return;

  const grade = severityToGrade(severity);
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG[0];

  // Update grade display
  trustGrade.textContent = grade;
  trustGrade.className = `trust-grade grade-${grade.toLowerCase()}`;

  // Update progress bar
  trustProgress.className = `trust-progress progress-${grade.toLowerCase()}`;

  // Update status text
  trustStatus.textContent = config.name;

  // Show the badge
  trustBadge.classList.remove('hidden');
}

/**
 * Hide trust badge
 */
function hideTrustBadge() {
  if (trustBadge) {
    trustBadge.classList.add('hidden');
  }
}

/**
 * Generate shareable text from scan result
 */
function generateShareableText(result, hostname) {
  const severity = result.overallSeverity ?? 0;
  const grade = severityToGrade(severity);
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG[0];
  const clauses = result.clauses || [];

  let text = `Blind-Sight Privacy Report\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `Grade: ${grade} (${config.name})\n`;
  text += `Site: ${hostname}\n`;
  text += `Issues Found: ${clauses.length}\n\n`;

  if (clauses.length > 0) {
    clauses.slice(0, 5).forEach(clause => {
      const info = CLAUSE_INFO[clause.type] || CLAUSE_INFO.DEFAULT;
      text += `${info.icon} ${info.name} - ${clause.explanation?.slice(0, 60) || 'No details'}...\n`;
    });
    if (clauses.length > 5) {
      text += `... and ${clauses.length - 5} more\n`;
    }
  }

  text += `\n━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `Analyzed by Blind-Sight`;

  return text;
}

/**
 * Copy text to clipboard and show toast
 */
async function copyToClipboard() {
  if (!currentScanResult) return;

  try {
    const hostname = currentScanResult.hostname || 'unknown';
    const text = generateShareableText(currentScanResult, hostname);
    await navigator.clipboard.writeText(text);
    showToast();
  } catch (err) {
    console.error('Failed to copy:', err);
  }
}

/**
 * Show toast notification
 */
function showToast() {
  if (!toast) return;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2000);
}

/**
 * Update the status indicator
 * @param {'idle' | 'scanning' | 'safe' | 'notable' | 'caution' | 'danger' | 'error' | 'warning'} status 
 * @param {string} message 
 */
function updateStatus(status, message) {
  const indicator = statusArea.querySelector('.status-indicator');
  const statusText = statusArea.querySelector('.status-text');

  // Remove all status classes
  indicator.className = 'status-indicator';
  indicator.classList.add(`status-${status}`);
  statusText.textContent = message;
}

/**
 * Show results in the results area
 * @param {'safe' | 'notable' | 'caution' | 'danger' | 'warning'} type 
 * @param {string} title 
 * @param {string} message 
 * @param {Array} clauses - Optional array of detected clauses
 * @param {boolean} showRetry - Whether to show retry button
 */
function showResults(type, title, message, clauses = null, showRetry = false) {
  const resultCard = resultsArea.querySelector('.result-card');

  resultCard.className = 'result-card';
  resultCard.classList.add(type);
  resultTitle.textContent = title;
  resultMessage.textContent = message;

  // Handle clause list
  if (clauses && clauses.length > 0) {
    renderClauseList(clauses);
    clauseList.classList.remove('hidden');
  } else {
    clauseList.classList.add('hidden');
    clauseList.innerHTML = '';
  }

  // Handle retry button
  if (showRetry) {
    retryBtn.classList.remove('hidden');
  } else {
    retryBtn.classList.add('hidden');
  }

  resultsArea.classList.remove('hidden');
}

/**
 * Render clause list HTML with severity indicators
 * @param {Array} clauses 
 */
function renderClauseList(clauses) {
  clauseList.innerHTML = clauses.map(clause => {
    const info = CLAUSE_INFO[clause.type] || CLAUSE_INFO.DEFAULT;
    const severity = clause.severity || 1;
    const severityColor = getSeverityColor(severity);
    const mitigationHtml = clause.mitigation
      ? `<div class="clause-mitigation">💡 ${escapeHtml(clause.mitigation)}</div>`
      : '';

    return `
      <div class="clause-item" style="border-left-color: ${severityColor}">
        <div class="clause-item-header">
          <span class="clause-icon">${info.icon}</span>
          <span class="clause-type">${info.name}</span>
          <span class="clause-severity" style="color: ${severityColor}">
            ${SEVERITY_CONFIG[severity]?.name || 'Unknown'}
          </span>
        </div>
        <div class="clause-explanation">${escapeHtml(clause.explanation || 'No explanation provided')}</div>
        ${mitigationHtml}
      </div>
    `;
  }).join('');
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Hide results area
 */
function hideResults() {
  resultsArea.classList.add('hidden');
  clauseList.classList.add('hidden');
  retryBtn.classList.add('hidden');
  gotoTosBtn.classList.add('hidden');
  alternativesSection.classList.add('hidden');
  hideTrustBadge();
  pendingTosUrl = null;
  currentScanResult = null;
}

/**
 * Render alternatives in the alternatives section
 */
function renderAlternatives(category, serviceName) {
  const altData = ALTERNATIVES_DATABASE[category] || ALTERNATIVES_DATABASE.default;
  if (!altData || !altData.alternatives) {
    alternativesSection.classList.add('hidden');
    return;
  }

  const serviceLabel = serviceName || altData.displayName;
  alternativesTitle.textContent = `Privacy-Friendly Alternatives${serviceLabel ? ` to ${serviceLabel}` : ''}`;

  alternativesList.innerHTML = altData.alternatives.slice(0, 3).map(alt => `
    <a href="${alt.url}" target="_blank" rel="noopener noreferrer" class="alternative-card">
      <span class="alternative-icon">${alt.icon}</span>
      <div class="alternative-info">
        <span class="alternative-name">${escapeHtml(alt.name)}</span>
        <span class="alternative-reason">${escapeHtml(alt.reason)}</span>
      </div>
      <span class="alternative-arrow">→</span>
    </a>
  `).join('');

  alternativesSection.classList.remove('hidden');
}

/**
 * Show API key missing alert
 */
function showApiKeyAlert() {
  apiKeyAlert.classList.remove('hidden');
  scanBtn.classList.add('hidden');
}

/**
 * Hide API key alert
 */
function hideApiKeyAlert() {
  apiKeyAlert.classList.add('hidden');
  scanBtn.classList.remove('hidden');
}

/**
 * Set scanning state
 * @param {boolean} isScanning 
 */
function setScanningState(isScanning) {
  if (isScanning) {
    scanBtn.classList.add('scanning');
    scanBtn.disabled = true;
    scanBtnText.textContent = 'Scanning...';
  } else {
    scanBtn.classList.remove('scanning');
    scanBtn.disabled = false;
    scanBtnText.textContent = 'Scan This Page';
  }
}

/**
 * Check if API key is configured
 * @returns {Promise<boolean>}
 */
async function hasApiKey() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['geminiApiKey', 'openaiApiKey'], (result) => {
      resolve(!!result.geminiApiKey || !!result.openaiApiKey);
    });
  });
}

/**
 * Send message to content script in active tab
 * @param {Object} message 
 * @returns {Promise<Object>}
 */
async function sendToContentScript(message) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab || !tab.id) {
    throw new Error('No active tab found');
  }

  try {
    return await chrome.tabs.sendMessage(tab.id, message);
  } catch (error) {
    if (error.message.includes('Receiving end does not exist')) {
      throw new Error('Cannot scan this page. Try a regular webpage with a sign-up form.');
    }
    throw error;
  }
}

/**
 * Get page status from content script
 * @returns {Promise<Object>}
 */
async function getPageStatus() {
  try {
    return await sendToContentScript({ type: 'GET_PAGE_STATUS' });
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Handle scan results with tiered severity
 * @param {Object} response - Analysis response from content script
 */
function handleScanResult(response) {
  // Handle errors - CRITICAL: Never show green when we couldn't analyze
  if (response.error) {
    // Specific handling for fetch failures - show "Go to ToS" button
    if (response.fetchFailed) {
      updateStatus('error', 'Fetch failed');
      showResults('danger', '🚫 Could Not Retrieve ToS',
        `Unable to fetch Terms of Service. The site blocks external requests.`,
        null, true);

      // Show "Go to ToS" button if we have the URL
      if (response.url) {
        pendingTosUrl = response.url;
        gotoTosBtn.classList.remove('hidden');
      }
      return;
    }

    if (response.error.includes('API key') || response.error.includes('API Key')) {
      updateStatus('error', 'API key issue');
      showResults('danger', '🔑 API Key Error', response.error, null, true);
    } else if (response.error.includes('No ToS') || response.error.includes('no terms') || response.error.includes('No Terms')) {
      updateStatus('warning', 'No ToS found');
      showResults('warning', '⚠️ No Terms Found', 'Could not find a Terms of Service link on this page.', null, true);
    } else if (response.error.includes('network') || response.error.includes('fetch') || response.error.includes('Failed to fetch')) {
      updateStatus('error', 'Network error');
      showResults('danger', '📡 Network Error', 'Failed to fetch the Terms of Service. The site may be blocking requests.', null, true);
    } else {
      updateStatus('error', 'Scan failed');
      showResults('danger', '❌ Error', response.error, null, true);
    }
    return;
  }

  // Get severity level (default to 0 if not present)
  const severity = response.overallSeverity ?? 0;
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG[0];
  const clauses = response.clauses || [];

  // Store result for copy functionality
  currentScanResult = {
    ...response,
    hostname: response.hostname || 'unknown'
  };

  // Build status message
  let statusMessage = config.name;
  if (clauses.length > 0 && severity > 0) {
    statusMessage = `${clauses.length} item${clauses.length > 1 ? 's' : ''} found`;
  }

  updateStatus(config.status, statusMessage);

  // Build result message
  let resultMessage = config.message;
  if (response.summary) {
    resultMessage = response.summary;
  }

  // Show results with appropriate styling
  showResults(
    config.cardClass,
    `${config.icon} ${config.title}`,
    resultMessage,
    severity > 0 ? clauses : null // Only show clause list for non-standard
  );

  // Render trust score badge
  renderTrustBadge(severity, currentScanResult.hostname);

  // Show alternatives for cautionary/critical severity
  if (severity >= 2 && response.category) {
    renderAlternatives(response.category, response.serviceName);
  } else {
    alternativesSection.classList.add('hidden');
  }
}

/**
 * Handle scan button click
 */
async function handleScan() {
  // Check for API key first
  const hasKey = await hasApiKey();
  if (!hasKey) {
    showApiKeyAlert();
    updateStatus('error', 'Setup required');
    return;
  }

  // Update UI to scanning state
  updateStatus('scanning', 'Analyzing Terms of Service...');
  setScanningState(true);
  hideResults();
  hideApiKeyAlert();

  try {
    // Send scan request to content script
    const response = await sendToContentScript({ type: 'MANUAL_SCAN' });
    handleScanResult(response);
    // Refresh history after scan
    await loadHistory();
  } catch (error) {
    console.error('Scan error:', error);
    updateStatus('error', 'Scan failed');
    showResults('danger', '❌ Error', error.message || 'An unexpected error occurred.', null, true);
  } finally {
    setScanningState(false);
  }
}

/**
 * Open settings page
 */
function openSettings(e) {
  if (e) e.preventDefault();
  chrome.runtime.openOptionsPage();
}

/**
 * Initialize popup with current page status
 */
async function initializePopup() {
  const hasKey = await hasApiKey();
  if (!hasKey) {
    showApiKeyAlert();
    updateStatus('warning', 'Setup required');
    return;
  }

  hideApiKeyAlert();

  // Try to get page status
  const status = await getPageStatus();

  if (status.error) {
    if (status.error.includes('Cannot scan')) {
      updateStatus('idle', 'Page cannot be scanned');
    } else {
      updateStatus('idle', 'Ready to scan');
    }
    return;
  }

  // Show detection status
  if (status.isSignup) {
    updateStatus('warning', 'Signup page detected');
  } else {
    updateStatus('idle', 'Ready to scan');
  }

  // Show last scan result if available
  if (status.lastScanResult) {
    handleScanResult(status.lastScanResult);
  }

  // Load history
  await loadHistory();
}

/**
 * Load and display scan history
 */
async function loadHistory() {
  try {
    const history = await chrome.runtime.sendMessage({ type: 'GET_HISTORY' });
    renderHistory(history);
  } catch (error) {
    console.error('Failed to load history:', error);
    renderHistory([]);
  }
}

/**
 * Convert timestamp to "time ago" format
 */
function timeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

/**
 * Get severity label
 */
function getSeverityLabel(severity) {
  const labels = {
    0: 'Safe',
    1: 'Notable',
    2: 'Caution',
    3: 'Critical'
  };
  return labels[severity] || 'Unknown';
}

/**
 * Render history list
 */
function renderHistory(history) {
  if (!history || history.length === 0) {
    historyList.innerHTML = '<div class="history-empty">No scans yet</div>';
    return;
  }

  historyList.innerHTML = history.map(entry => `
    <div class="history-item" data-url="${escapeHtml(entry.url)}" title="${escapeHtml(entry.summary)}">
      <div class="history-severity severity-${entry.severity}"></div>
      <div class="history-info">
        <div class="history-hostname">${escapeHtml(entry.hostname)}</div>
        <div class="history-meta">
          <span class="history-time">${timeAgo(entry.timestamp)}</span>
          ${entry.clauseCount > 0 ? `<span class="history-clauses">${entry.clauseCount} clause${entry.clauseCount > 1 ? 's' : ''}</span>` : ''}
        </div>
      </div>
      <span class="history-arrow">→</span>
    </div>
  `).join('');

  // Add click handlers to open the URL
  historyList.querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', () => {
      const url = item.dataset.url;
      if (url) {
        chrome.tabs.create({ url });
      }
    });
  });
}

// Event Listeners
scanBtn.addEventListener('click', handleScan);
retryBtn.addEventListener('click', handleScan);
settingsLink.addEventListener('click', openSettings);
setupSettingsLink.addEventListener('click', openSettings);

// Copy button - copies shareable report to clipboard
if (copyBtn) {
  copyBtn.addEventListener('click', copyToClipboard);
}
// Go to ToS button - opens the ToS page directly so user can scan from there
gotoTosBtn.addEventListener('click', () => {
  if (pendingTosUrl) {
    chrome.tabs.create({ url: pendingTosUrl });
    window.close(); // Close popup, user will scan from ToS page
  }
});

// Initialize
document.addEventListener('DOMContentLoaded', initializePopup);