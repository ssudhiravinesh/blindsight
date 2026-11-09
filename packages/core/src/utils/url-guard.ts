/**
 * Copyright (c) 2026 Sudhir Avinesh. All rights reserved.
 * Proprietary and Confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 */

// Single source of truth shared with the Supabase edge functions.
import { checkPublicHttpUrl, isSameSite } from '../../../../supabase/functions/_shared/net-guard';

export { checkPublicHttpUrl, isBlockedHostname, isNonPublicIp, isSameSite, siteOf } from '../../../../supabase/functions/_shared/net-guard';

/** Hosted-policy providers that legitimately serve ToS for other sites. */
const TRUSTED_TOS_HOSTS = ['termsfeed.com', 'termly.io', 'iubenda.com', 'getterms.io', 'app.termly.io'];

const LEGAL_PATH_RE = /(terms|tos|privacy|legal|eula|agreement|conditions|policies)/i;

/**
 * Decides whether the background worker may fetch `rawUrl` on behalf of a
 * content script running on `senderTabUrl`. Requires a public http(s) URL and
 * either the sender's own site, a known ToS host, or a legal-looking path.
 */
export function isAllowedTosFetchUrl(rawUrl: string, senderTabUrl?: string): boolean {
    const check = checkPublicHttpUrl(rawUrl);
    if (!check.ok) return false;
    const host = check.url.hostname.toLowerCase();

    if (senderTabUrl) {
        try {
            if (isSameSite(host, new URL(senderTabUrl).hostname)) return true;
        } catch {
            // ignore malformed sender URL
        }
    }
    if (TRUSTED_TOS_HOSTS.some((d) => host === d || host.endsWith(`.${d}`))) return true;
    return LEGAL_PATH_RE.test(check.url.pathname);
}
