import { HttpError } from "./http.ts";
import { sha256Hex } from "./crypto.ts";
import type { SupabaseClient } from "./supabase.ts";

export interface RateLimitRule {
  /** Logical bucket, e.g. "analyze:device". */
  name: string;
  /** Subject being limited (device id, client IP, ...). Hashed before storage. */
  subject: string;
  limit: number;
  windowSeconds: number;
}

/**
 * Atomic fixed-window rate limiting backed by Postgres (consume_rate_limit).
 * This is abuse protection for the shared LLM budget, not a usage quota.
 * Fails closed: if the limiter is unavailable, expensive work is refused.
 */
export async function enforceRateLimits(
  supabase: SupabaseClient,
  rules: RateLimitRule[],
): Promise<void> {
  for (const rule of rules) {
    // Salted so stored keys cannot be reversed to IPs by brute-forcing the IPv4 space.
    const salt = Deno.env.get("RATE_LIMIT_SALT") ?? "";
    const key = `${rule.name}:${await sha256Hex(`${salt}:${rule.subject}`)}`;
    const { data, error } = await supabase.rpc("consume_rate_limit", {
      p_key: key,
      p_limit: rule.limit,
      p_window_seconds: rule.windowSeconds,
    });
    if (error) {
      console.error("Rate limiter unavailable:", error.message);
      throw new HttpError(503, "Service temporarily unavailable");
    }
    if (data !== true) {
      throw new HttpError(429, "Too many requests", {
        "Retry-After": String(rule.windowSeconds),
      });
    }
  }
}
