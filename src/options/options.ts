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

function updateModeIndicator(hasKey: boolean, provider?: string) {
    if (hasKey) {
        modeIndicator.className = 'mode-indicator byok';
        modeText.textContent = `Using: Your ${provider === 'gemini' ? 'Gemini' : 'OpenAI'} Key`;
    } else {
        modeIndicator.className = 'mode-indicator server';
        modeText.textContent = 'Using: Blind-Sight Server';
    }
}

function detectProvider(key: string): 'openai' | 'gemini' | null {
    if (key.startsWith('sk-')) return 'openai';
    if (key.startsWith('AIza')) return 'gemini';
    return null;
}

chrome.storage.local.get(['openaiApiKey', 'geminiApiKey'], (result) => {
    if (result.geminiApiKey) {
        apiKeyInput.value = result.geminiApiKey;
        updateModeIndicator(true, 'gemini');
    } else if (result.openaiApiKey) {
        apiKeyInput.value = result.openaiApiKey;
        updateModeIndicator(true, 'openai');
    } else {
        updateModeIndicator(false);
    }
});

saveBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (!key) {
        showToast('Please enter an API key', 'error');
        return;
    }
    const provider = detectProvider(key);
    if (!provider) {
        showToast('Invalid key format. Should start with "sk-" (OpenAI) or "AIza" (Gemini)', 'error');
        return;
    }
    const storageKey = provider === 'gemini' ? 'geminiApiKey' : 'openaiApiKey';
    const otherKey = provider === 'gemini' ? 'openaiApiKey' : 'geminiApiKey';
    chrome.storage.local.remove(otherKey, () => {
        chrome.storage.local.set({ [storageKey]: key }, () => {
            const label = provider === 'gemini' ? 'Gemini' : 'OpenAI';
            showToast(`✅ ${label} API key saved! Scans will now use your key.`);
            updateModeIndicator(true, provider);
        });
    });
});

clearBtn.addEventListener('click', () => {
    chrome.storage.local.remove(['openaiApiKey', 'geminiApiKey'], () => {
        apiKeyInput.value = '';
        showToast('🗑 API key removed. Using Blind-Sight server.');
        updateModeIndicator(false);
    });
});

let visible = false;
toggleBtn.addEventListener('click', () => {
    visible = !visible;
    apiKeyInput.type = visible ? 'text' : 'password';
    toggleBtn.textContent = visible ? 'HIDE' : 'SHOW';
});
