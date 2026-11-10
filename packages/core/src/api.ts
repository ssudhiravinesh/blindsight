/**
 * Copyright (c) 2026 Sudhir Avinesh. All rights reserved.
 * Proprietary and Confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 */

import type { ScanResult } from './types';
import { parseScanResult, truncateText } from './openai';

// @ts-ignore -- import.meta.env is provided by Vite at build time.
const env: Record<string, string | undefined> = (typeof import.meta !== 'undefined' && import.meta.env) || {};

export const API_BASE_URL: string = (
    env.VITE_BLINDSIGHT_API_URL || 'https://ywwlgayxhothmtvsbwlg.supabase.co/functions/v1'
).replace(/\/+$/, '');

export interface DeviceCredentials {
    deviceId: string;
    deviceSecret: string;
}

export interface ServerNotification {
    id: string;
    domain: string;
    service_name: string | null;
    old_severity: number | null;
    new_severity: number | null;
    change_summary: string | null;
    created_at: string;
}

/** Stable error codes surfaced to callers; messages from the server are never shown raw. */
export type ApiErrorCode = 'RATE_LIMITED' | 'UNAUTHORIZED' | 'BAD_REQUEST' | 'SERVER_ERROR' | 'NETWORK_ERROR';

export class ApiError extends Error {
    constructor(public readonly code: ApiErrorCode, message: string, public readonly status?: number) {
        super(message);
        this.name = 'ApiError';
    }
}

const DEFAULT_TIMEOUT_MS = 45_000;

async function request<T>(
    path: string,
    init: RequestInit & { credentials?: never },
    device: DeviceCredentials | null,
    timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<T> {
    const headers = new Headers(init.headers);
    if (init.body) headers.set('Content-Type', 'application/json');
    if (device) {
        headers.set('X-Device-Id', device.deviceId);
        headers.set('X-Device-Secret', device.deviceSecret);
    }

    let response: Response;
    try {
        response = await fetch(`${API_BASE_URL}${path}`, {
            ...init,
            headers,
            credentials: 'omit',
            cache: 'no-store',
            signal: AbortSignal.timeout(timeoutMs),
        });
    } catch (err) {
        throw new ApiError('NETWORK_ERROR', `Blind-Sight server unreachable: ${(err as Error).message}`);
    }

    if (!response.ok) {
        const status = response.status;
        if (status === 429) throw new ApiError('RATE_LIMITED', 'RATE_LIMITED', status);
        if (status === 401) throw new ApiError('UNAUTHORIZED', 'Device credentials rejected', status);
        if (status >= 500) throw new ApiError('SERVER_ERROR', `Blind-Sight server error (${status})`, status);
        throw new ApiError('BAD_REQUEST', `Blind-Sight server rejected the request (${status})`, status);
    }
    return (await response.json()) as T;
}

export async function registerDevice(): Promise<DeviceCredentials> {
    const res = await request<{ device_id?: unknown; device_secret?: unknown }>(
        '/register-device',
        { method: 'POST' },
        null,
        15_000,
    );
    if (typeof res.device_id !== 'string' || typeof res.device_secret !== 'string') {
        throw new ApiError('SERVER_ERROR', 'Malformed registration response');
    }
    return { deviceId: res.device_id, deviceSecret: res.device_secret };
}

export async function analyzeOnServer(
    device: DeviceCredentials,
    tosText: string,
    sourceUrl?: string,
): Promise<ScanResult> {
    const text = truncateText(tosText.trim());
    if (!text) throw new ApiError('BAD_REQUEST', 'No ToS text provided');

    let domain = 'unknown';
    if (sourceUrl) {
        try {
            domain = new URL(sourceUrl).hostname.replace(/^www\./, '');
        } catch {
            // keep 'unknown'
        }
    }

    const MAX_ATTEMPTS = 2;
    for (let attempt = 1; ; attempt++) {
        try {
            const data = await request<{ analysis_result?: unknown }>(
                '/analyze',
                { method: 'POST', body: JSON.stringify({ tos_text: text, domain }) },
                device,
            );
            // The server wraps the model output; parsing the wrapper itself silently
            // dropped every clause.
            return parseScanResult(JSON.stringify(data.analysis_result ?? {}));
        } catch (err) {
            const retryable = err instanceof ApiError && (err.code === 'SERVER_ERROR' || err.code === 'NETWORK_ERROR');
            if (!retryable || attempt >= MAX_ATTEMPTS) throw err;
            await new Promise((r) => setTimeout(r, 3000));
        }
    }
}

export async function trackService(device: DeviceCredentials, domain: string, tosUrl?: string): Promise<void> {
    await request('/track-service', { method: 'POST', body: JSON.stringify({ domain, tos_url: tosUrl }) }, device, 15_000);
}

export async function untrackService(device: DeviceCredentials, domain: string): Promise<void> {
    await request('/track-service', { method: 'DELETE', body: JSON.stringify({ domain }) }, device, 15_000);
}

export async function fetchNotifications(device: DeviceCredentials): Promise<ServerNotification[]> {
    const res = await request<{ notifications?: ServerNotification[] }>('/get-notifications', { method: 'GET' }, device, 15_000);
    return Array.isArray(res.notifications) ? res.notifications : [];
}
