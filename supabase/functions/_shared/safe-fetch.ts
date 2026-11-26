import { checkPublicHttpUrl, isNonPublicIp } from "./net-guard.ts";

export class UnsafeUrlError extends Error {}

const MAX_REDIRECTS = 5;
const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = ["text/html", "text/plain", "application/xhtml+xml"];

let dnsUnavailableLogged = false;

/**
 * Resolves the hostname and rejects it if any A/AAAA record is non-public, so
 * names like `internal.attacker.tld -> 10.0.0.5` cannot reach private networks.
 */
async function assertResolvesPublic(hostname: string): Promise<void> {
  if (typeof Deno.resolveDns !== "function") {
    if (!dnsUnavailableLogged) {
      console.warn("Deno.resolveDns unavailable; relying on hostname/IP-literal checks only");
      dnsUnavailableLogged = true;
    }
    return;
  }
  const lookups = await Promise.allSettled([
    Deno.resolveDns(hostname, "A"),
    Deno.resolveDns(hostname, "AAAA"),
  ]);
  const addresses = lookups.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  if (addresses.length === 0) throw new UnsafeUrlError(`could not resolve ${hostname}`);
  if (addresses.some((ip) => isNonPublicIp(ip))) {
    throw new UnsafeUrlError(`${hostname} resolves to a non-public address`);
  }
}

export interface SafeFetchOptions {
  maxBytes?: number;
  timeoutMs?: number;
  headers?: HeadersInit;
}

/**
 * SSRF-hardened GET for user-influenced URLs: public http(s) only, DNS-checked,
 * every redirect hop re-validated, size- and time-bounded, text content only.
 */
export async function safeFetchText(rawUrl: string, opts: SafeFetchOptions = {}): Promise<{ url: string; text: string }> {
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;
  const signal = AbortSignal.timeout(opts.timeoutMs ?? 15_000);
  let current = rawUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const check = checkPublicHttpUrl(current);
    if (!check.ok) throw new UnsafeUrlError(`${check.reason}: ${current}`);
    await assertResolvesPublic(check.url.hostname);

    const res = await fetch(check.url, { redirect: "manual", headers: opts.headers, signal });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("Location");
      await res.body?.cancel();
      if (!location) throw new Error(`redirect without Location from ${current}`);
      current = new URL(location, check.url).toString();
      continue;
    }
    if (!res.ok) {
      await res.body?.cancel();
      throw new Error(`HTTP ${res.status} from ${current}`);
    }

    const type = (res.headers.get("Content-Type") ?? "").split(";")[0].trim().toLowerCase();
    if (type && !ALLOWED_CONTENT_TYPES.includes(type)) {
      await res.body?.cancel();
      throw new UnsafeUrlError(`unexpected content type ${type}`);
    }
    if (Number(res.headers.get("Content-Length") ?? 0) > maxBytes) {
      await res.body?.cancel();
      throw new UnsafeUrlError("response too large");
    }

    const reader = res.body?.getReader();
    if (!reader) return { url: current, text: "" };
    const chunks: Uint8Array[] = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > maxBytes) {
        await reader.cancel();
        throw new UnsafeUrlError("response too large");
      }
      chunks.push(value);
    }
    const body = new Uint8Array(received);
    let offset = 0;
    for (const c of chunks) {
      body.set(c, offset);
      offset += c.byteLength;
    }
    return { url: current, text: new TextDecoder().decode(body) };
  }
  throw new UnsafeUrlError("too many redirects");
}
