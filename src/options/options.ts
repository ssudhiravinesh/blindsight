const apiKeyInput = document.getElementById('apiKeyInput') as HTMLInputElement;
const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
const clearBtn = document.getElementById('clearBtn') as HTMLButtonElement;
const toggleBtn = document.getElementById('toggleBtn') as HTMLButtonElement;
const toast = document.getElementById('toast') as HTMLDivElement;
const modeIndicator = document.getElementById('modeIndicator') as HTMLDivElement;
const modeText = document.getElementById('modeText') as HTMLSpanElement;

function showToast(message: string, type: 'success' | 'error' = 'success') {
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 3000);
}

function updateModeIndicator(hasKey: boolean) {
    if (hasKey) {
        modeIndicator.className = 'mode-indicator byok';
        modeText.textContent = 'Using: Your API Key';
    } else {
        modeIndicator.className = 'mode-indicator server';
        modeText.textContent = 'Using: Blind-Sight Server';
    }
}

// Load existing key and set mode
chrome.storage.local.get(['openaiApiKey'], (result) => {
    if (result.openaiApiKey) {
        apiKeyInput.value = result.openaiApiKey;
        updateModeIndicator(true);
    } else {
        updateModeIndicator(false);
    }
});

// Save
saveBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (!key) {
        showToast('Please enter an API key', 'error');
        return;
    }
    if (!key.startsWith('sk-')) {
        showToast('Invalid key format. Should start with "sk-"', 'error');
        return;
    }
    chrome.storage.local.set({ openaiApiKey: key }, () => {
        showToast('✅ API key saved! Scans will now use your key.');
        updateModeIndicator(true);
    });
});

// Clear
clearBtn.addEventListener('click', () => {
    chrome.storage.local.remove('openaiApiKey', () => {
        apiKeyInput.value = '';
        showToast('🗑 API key removed. Using Blind-Sight server.');
        updateModeIndicator(false);
    });
});

// Toggle visibility
let visible = false;
toggleBtn.addEventListener('click', () => {
    visible = !visible;
    apiKeyInput.type = visible ? 'text' : 'password';
    toggleBtn.textContent = visible ? '🙈' : '👁️';
});
