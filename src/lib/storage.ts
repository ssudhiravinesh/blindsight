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

export async function getApiKey(): Promise<string | null> {
    return new Promise((resolve) => {
        chrome.storage.local.get(['openaiApiKey'], (result) => {
            resolve((result.openaiApiKey as string) ?? null);
        });
    });
}
