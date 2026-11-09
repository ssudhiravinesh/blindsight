/**
 * Pure (runtime-agnostic) network guards shared by the edge functions and the
 * browser extension. Keep this file free of Deno/DOM APIs and imports so both
 * the Deno runtime and the Vite/Vitest toolchain can consume it.
 */

function parseIPv4(host: string): number[] | null {
  const parts = host.split(".");
  if (parts.length !== 4) return null;
  const octets = parts.map((p) => (/^\d{1,3}$/.test(p) ? Number(p) : NaN));
  return octets.every((o) => Number.isInteger(o) && o >= 0 && o <= 255) ? octets : null;
}

/** True for loopback, private, link-local, CGNAT, multicast, reserved and documentation ranges. */
export function isNonPublicIPv4(host: string): boolean {
  const o = parseIPv4(host);
  if (!o) return false;
  const [a, b, c] = o;
  return (
    a === 0 || // "this" network
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    (a === 169 && b === 254) || // link-local, cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && (c === 0 || c === 2)) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) || // benchmarking
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224 // multicast + reserved + broadcast
  );
}

function expandIPv6(host: string): number[] | null {
  let h = host.replace(/^\[|\]$/g, "").toLowerCase();
  const zone = h.indexOf("%");
  if (zone !== -1) h = h.slice(0, zone);
  if (!h.includes(":")) return null;

  // Embedded IPv4 tail (e.g. ::ffff:127.0.0.1)
  const lastColon = h.lastIndexOf(":");
  const tail = h.slice(lastColon + 1);
  if (tail.includes(".")) {
    const v4 = parseIPv4(tail);
    if (!v4) return null;
    h = `${h.slice(0, lastColon + 1)}${((v4[0] << 8) | v4[1]).toString(16)}:${((v4[2] << 8) | v4[3]).toString(16)}`;
  }

  const halves = h.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const rest = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - rest.length;
  if (halves.length === 1 ? missing !== 0 : missing < 1) return null;

  const groups = [...head, ...Array(halves.length === 2 ? missing : 0).fill("0"), ...rest];
  const parsed = groups.map((g) => (/^[0-9a-f]{1,4}$/.test(g) ? parseInt(g, 16) : NaN));
  return parsed.length === 8 && parsed.every((n) => !Number.isNaN(n)) ? parsed : null;
}

export function isNonPublicIPv6(host: string): boolean {
  const g = expandIPv6(host);
  if (!g) return false;
  const allZeroPrefix = (n: number) => g.slice(0, n).every((x) => x === 0);

  if (allZeroPrefix(7) && (g[7] === 0 || g[7] === 1)) return true; // :: and ::1
  // IPv4-mapped (::ffff:a.b.c.d) and NAT64 (64:ff9b::/96) inherit the IPv4 verdict.
  if ((allZeroPrefix(5) && g[5] === 0xffff) || (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((x) => x === 0))) {
    return isNonPublicIPv4(`${g[6] >> 8}.${g[6] & 255}.${g[7] >> 8}.${g[7] & 255}`);
  }
  return (
    (g[0] & 0xfe00) === 0xfc00 || // unique local fc00::/7
    (g[0] & 0xffc0) === 0xfe80 || // link-local fe80::/10
    (g[0] & 0xff00) === 0xff00 || // multicast
    (g[0] === 0x2001 && g[1] === 0x0db8) // documentation
  );
}

export function isIpLiteral(host: string): boolean {
  return parseIPv4(host) !== null || expandIPv6(host) !== null;
}

export function isNonPublicIp(host: string): boolean {
  return isNonPublicIPv4(host) || isNonPublicIPv6(host);
}

const BLOCKED_SUFFIXES = [".localhost", ".local", ".internal", ".intranet", ".lan", ".home.arpa", ".corp"];

/** Hostnames that must never be fetched regardless of DNS. */
export function isBlockedHostname(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/\.$/, "");
  if (!h || h === "localhost") return true;
  if (BLOCKED_SUFFIXES.some((s) => h.endsWith(s))) return true;
  if (isIpLiteral(h)) return isNonPublicIp(h);
  // Bare single-label names resolve via search domains to internal hosts.
  return !h.includes(".");
}

export type UrlCheck = { ok: true; url: URL } | { ok: false; reason: string };

/**
 * Validates that a URL is a plain public http(s) URL on a default port with
 * no embedded credentials. Does not resolve DNS; callers that can should also
 * check resolved addresses (see safe-fetch.ts).
 */
export function checkPublicHttpUrl(raw: string): UrlCheck {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: "invalid URL" };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return { ok: false, reason: "unsupported scheme" };
  if (url.username || url.password) return { ok: false, reason: "credentials in URL" };
  if (url.port && url.port !== "80" && url.port !== "443") return { ok: false, reason: "non-default port" };
  if (isBlockedHostname(url.hostname)) return { ok: false, reason: "non-public host" };
  return { ok: true, url };
}

/**
 * Approximate registrable domain ("site") without a public-suffix list:
 * handles common two-level ccTLD suffixes such as co.uk or com.au.
 */
export function siteOf(hostname: string): string {
  const labels = hostname.toLowerCase().replace(/\.$/, "").split(".");
  if (labels.length <= 2 || isIpLiteral(hostname)) return labels.join(".");
  const tld = labels[labels.length - 1];
  const sld = labels[labels.length - 2];
  const twoLevel = tld.length === 2 && ["co", "com", "net", "org", "gov", "ac", "edu", "ne", "or"].includes(sld);
  return labels.slice(twoLevel ? -3 : -2).join(".");
}

export function isSameSite(a: string, b: string): boolean {
  return siteOf(a) === siteOf(b);
}
