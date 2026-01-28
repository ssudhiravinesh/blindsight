/**
 * Blind-Sight Options Script
 * Handles OpenAI API key storage
 */

// DOM Elements
const form = document.getElementById('api-key-form');
const apiKeyInput = document.getElementById('api-key');
const toggleVisibilityBtn = document.getElementById('toggle-visibility');
const eyeIcon = document.getElementById('eye-icon');
const eyeOffIcon = document.getElementById('eye-off-icon');
const saveBtn = document.getElementById('save-btn');
const btnText = saveBtn.querySelector('.btn-text');
const checkIcon = document.getElementById('check-icon');
const statusMessage = document.getElementById('status-message');

/**
 * Toggle password visibility
 */
function toggleVisibility() {
    const isPassword = apiKeyInput.type === 'password';
    apiKeyInput.type = isPassword ? 'text' : 'password';
    eyeIcon.classList.toggle('hidden', !isPassword);
    eyeOffIcon.classList.toggle('hidden', isPassword);
}

/**
 * Show status message
 * @param {string} message 
 * @param {'success' | 'error'} type 
 */
function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;

    // Auto-hide after 3 seconds
    setTimeout(() => {
        statusMessage.classList.add('hidden');
    }, 3000);
}

/**
 * Show success animation on save button
 */
function showSaveSuccess() {
    saveBtn.classList.add('success');
    btnText.textContent = 'Saved!';
    checkIcon.classList.remove('hidden');

    setTimeout(() => {
        saveBtn.classList.remove('success');
        btnText.textContent = 'Save API Key';
        checkIcon.classList.add('hidden');
    }, 2000);
}

/**
 * Save API key to chrome.storage.local
 * @param {string} apiKey 
 */
async function saveApiKey(apiKey) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.set({ openaiApiKey: apiKey }, () => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve();
            }
        });
    });
}

/**
 * Load API key from chrome.storage.local
 * @returns {Promise<string|null>}
 */
async function loadApiKey() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['openaiApiKey'], (result) => {
            resolve(result.openaiApiKey || null);
        });
    });
}

/**
 * Handle form submission
 * @param {Event} e 
 */
async function handleSubmit(e) {
    e.preventDefault();

    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
        showStatus('Please enter an API key', 'error');
        return;
    }

    // Basic validation - OpenAI keys start with "sk-"
    if (!apiKey.startsWith('sk-')) {
        showStatus('OpenAI API keys should start with "sk-"', 'error');
        return;
    }

    if (apiKey.length < 20) {
        showStatus('API key seems too short. Please check and try again.', 'error');
        return;
    }

    try {
        await saveApiKey(apiKey);
        showSaveSuccess();
        showStatus('API key saved successfully!', 'success');
    } catch (error) {
        console.error('Error saving API key:', error);
        showStatus('Failed to save API key. Please try again.', 'error');
    }
}

/**
 * Initialize the options page
 */
async function init() {
    // Load existing API key
    const existingKey = await loadApiKey();
    if (existingKey) {
        apiKeyInput.value = existingKey;
    }
}

// Event Listeners
toggleVisibilityBtn.addEventListener('click', toggleVisibility);
form.addEventListener('submit', handleSubmit);

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);
