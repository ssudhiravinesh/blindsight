/**
 * Copyright (c) 2026 Sudhir Avinesh. All rights reserved.
 * Proprietary and Confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 */

import type { ScanResult } from '../types';

const MAX_CACHE_SIZE = 50;

export async function getCachedScanResult(hash: string): Promise<ScanResult | null> {
    try {
        if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
            return null;
        }
        const data = await chrome.storage.local.get(['scanCache', 'scanCacheLru']);
        const cache = (data.scanCache as Record<string, { result: ScanResult; timestamp: number }>) || {};
        if (cache[hash]) {
            // Update LRU access order
            cache[hash].timestamp = Date.now();
            let lru = (data.scanCacheLru as string[]) || [];
            lru = lru.filter(h => h !== hash);
            lru.push(hash);
            await chrome.storage.local.set({ scanCache: cache, scanCacheLru: lru });
            return cache[hash].result;
        }
    } catch (e) {
        console.error('Failed to get cached scan result:', e);
    }
    return null;
}

export async function setCachedScanResult(hash: string, result: ScanResult): Promise<void> {
    try {
        if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
            return;
        }
        const data = await chrome.storage.local.get(['scanCache', 'scanCacheLru']);
        const cache = (data.scanCache as Record<string, { result: ScanResult; timestamp: number }>) || {};
        let lru = (data.scanCacheLru as string[]) || [];

        cache[hash] = { result, timestamp: Date.now() };
        lru = lru.filter(h => h !== hash);
        lru.push(hash);

        // Evict oldest if limit reached
        if (lru.length > MAX_CACHE_SIZE) {
            const oldestHash = lru.shift();
            if (oldestHash) {
                delete cache[oldestHash];
            }
        }

        await chrome.storage.local.set({ scanCache: cache, scanCacheLru: lru });
    } catch (e) {
        console.error('Failed to cache scan result:', e);
    }
}
