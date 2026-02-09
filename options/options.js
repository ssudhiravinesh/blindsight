const form = document.getElementById('api-key-form');
const apiKeyInput = document.getElementById('api-key');
const toggleVisibilityBtn = document.getElementById('toggle-visibility');
const eyeIcon = document.getElementById('eye-icon');
const eyeOffIcon = document.getElementById('eye-off-icon');
const saveBtn = document.getElementById('save-btn');
const btnText = saveBtn.querySelector('.btn-text');
const checkIcon = document.getElementById('check-icon');
const statusMessage = document.getElementById('status-message');

function toggleVisibility() {
    const isPassword = apiKeyInput.type === 'password';
    apiKeyInput.type = isPassword ? 'text' : 'password';
    eyeIcon.classList.toggle('hidden', !isPassword);
    eyeOffIcon.classList.toggle('hidden', isPassword);
}

function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;

    setTimeout(() => {
        statusMessage.classList.add('hidden');
    }, 3000);
}

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

async function loadApiKey() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['openaiApiKey'], (result) => {
            resolve(result.openaiApiKey || null);
        });
    });
}

async function handleSubmit(e) {
    e.preventDefault();

    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
        showStatus('Please enter an API key', 'error');
        return;
    }

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

async function init() {
    const existingKey = await loadApiKey();
    if (existingKey) {
        apiKeyInput.value = existingKey;
    }
}

toggleVisibilityBtn.addEventListener('click', toggleVisibility);
form.addEventListener('submit', handleSubmit);

document.addEventListener('DOMContentLoaded', init);