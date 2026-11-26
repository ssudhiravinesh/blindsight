/**
 * Copyright (c) 2026 Sudhir Avinesh. All rights reserved.
 * Proprietary and Confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 */

import { t } from '@blindsight/core';

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
        const label = provider === 'gemini' ? 'Gemini' : 'OpenAI';
        modeText.textContent = t('usingKey', 'Using: Your $1 Key', [label]);
    } else {
        modeIndicator.className = 'mode-indicator server';
        modeText.textContent = t('usingServer', 'Using: Blind-Sight Server');
    }
}

function detectProvider(key: string): 'openai' | 'gemini' | null {
    if (key.startsWith('sk-')) return 'openai';
    if (key.startsWith('AIza')) return 'gemini';
    return null;
}

function localizeDOM() {
    document.querySelectorAll('[data-i18n]').forEach((elem) => {
        const key = elem.getAttribute('data-i18n');
        if (key) {
            const fallback = elem.textContent || '';
            elem.textContent = t(key, fallback);
        }
    });
    toggleBtn.textContent = visible ? t('hide', 'HIDE') : t('show', 'SHOW');
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
        showToast(t('pleaseEnterKey', 'Please enter an API key'), 'error');
        return;
    }
    const provider = detectProvider(key);
    if (!provider) {
        showToast(t('invalidKeyFormat', 'Invalid key format. Should start with "sk-" (OpenAI) or "AIza" (Gemini)'), 'error');
        return;
    }
    const storageKey = provider === 'gemini' ? 'geminiApiKey' : 'openaiApiKey';
    const otherKey = provider === 'gemini' ? 'openaiApiKey' : 'geminiApiKey';
    chrome.storage.local.remove(otherKey, () => {
        chrome.storage.local.set({ [storageKey]: key }, () => {
            const label = provider === 'gemini' ? 'Gemini' : 'OpenAI';
            showToast(t('apiKeySaved', '✅ $1 API key saved! Scans will now use your key.', [label]));
            updateModeIndicator(true, provider);
        });
    });
});

clearBtn.addEventListener('click', () => {
    chrome.storage.local.remove(['openaiApiKey', 'geminiApiKey'], () => {
        apiKeyInput.value = '';
        showToast(t('apiKeyRemoved', '🗑 API key removed. Using Blind-Sight server.'));
        updateModeIndicator(false);
    });
});

let visible = false;
toggleBtn.addEventListener('click', () => {
    visible = !visible;
    apiKeyInput.type = visible ? 'text' : 'password';
    toggleBtn.textContent = visible ? t('hide', 'HIDE') : t('show', 'SHOW');
});

const versionValue = document.getElementById('versionValue');
if (versionValue) versionValue.textContent = chrome.runtime.getManifest().version;

// Run localization
localizeDOM();
