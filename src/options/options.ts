const apiKeyInput = document.getElementById('apiKeyInput') as HTMLInputElement;
const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
const toggleBtn = document.getElementById('toggleBtn') as HTMLButtonElement;
const toast = document.getElementById('toast') as HTMLDivElement;

function showToast(message: string, type: 'success' | 'error' = 'success') {
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 3000);
}

// Load existing key
chrome.storage.local.get(['openaiApiKey'], (result) => {
    if (result.openaiApiKey) {
        apiKeyInput.value = result.openaiApiKey;
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
        showToast('✅ API key saved successfully!');
    });
});

// Toggle visibility
let visible = false;
toggleBtn.addEventListener('click', () => {
    visible = !visible;
    apiKeyInput.type = visible ? 'text' : 'password';
    toggleBtn.textContent = visible ? '🙈' : '👁️';
});
