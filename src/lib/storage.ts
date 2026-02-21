export type ApiProvider = 'openai' | 'gemini';

export interface ApiKeyInfo {
    key: string;
    provider: ApiProvider;
}

export async function getStorageItem<T>(key: string): Promise<T | null> {
    return new Promise((resolve) => {
        chrome.storage.local.get([key], (result) => {
            resolve((result[key] as T) ?? null);
        });
    });
}

export async function setStorageItem<T>(key: string, value: T): Promise<void> {
    return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [key]: value }, () => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve();
            }
        });
    });
}

export async function hasApiKey(): Promise<boolean> {
    return new Promise((resolve) => {
        chrome.storage.local.get(['geminiApiKey', 'openaiApiKey'], (result) => {
            resolve(!!result.geminiApiKey || !!result.openaiApiKey);
        });
    });
}

export async function getApiKey(): Promise<ApiKeyInfo | null> {
    return new Promise((resolve) => {
        chrome.storage.local.get(['geminiApiKey', 'openaiApiKey'], (result) => {
            if (result.geminiApiKey) {
                resolve({ key: result.geminiApiKey as string, provider: 'gemini' });
            } else if (result.openaiApiKey) {
                resolve({ key: result.openaiApiKey as string, provider: 'openai' });
            } else {
                resolve(null);
            }
        });
    });
}
