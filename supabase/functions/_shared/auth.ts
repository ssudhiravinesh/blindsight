import { HttpError } from "./http.ts";
import { sha256Hex, timingSafeEqual } from "./crypto.ts";
import type { SupabaseClient } from "./supabase.ts";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SECRET_RE = /^[A-Za-z0-9_-]{32,128}$/;

export interface DeviceUser {
  id: string;
  deviceId: string;
}

/**
 * Authenticates an anonymous device via the X-Device-Id / X-Device-Secret
 * pair issued by register-device. Only a SHA-256 of the secret is stored, so a
 * database leak does not let anyone impersonate devices. Possessing a bare
 * device id (which appears in logs and rows) is not enough.
 */
export async function authenticateDevice(
  req: Request,
  supabase: SupabaseClient,
): Promise<DeviceUser> {
  const deviceId = req.headers.get("x-device-id") ?? "";
  const secret = req.headers.get("x-device-secret") ?? "";
  if (!UUID_RE.test(deviceId) || !SECRET_RE.test(secret)) {
    throw new HttpError(401, "Missing or invalid device credentials");
  }

  const { data, error } = await supabase
    .from("anon_users")
    .select("id, secret_hash")
    .eq("device_id", deviceId)
    .maybeSingle();
  if (error) throw error;

  const presented = await sha256Hex(secret);
  // Compare against a dummy hash when the device is unknown so the response time
  // does not reveal which device ids exist.
  const stored = data?.secret_hash ?? "0".repeat(64);
  if (!timingSafeEqual(presented, stored) || !data) {
    throw new HttpError(401, "Missing or invalid device credentials");
  }
  return { id: data.id, deviceId };
}

/** Guards internal endpoints (cron jobs, diagnostics) with a shared bearer secret. */
export function requireCronSecret(req: Request): void {
  const expected = Deno.env.get("CRON_SECRET");
  if (!expected || expected.length < 32) {
    // Fail closed: an unset secret must never mean "open to everyone".
    throw new HttpError(503, "Endpoint not configured");
  }
  const header = req.headers.get("Authorization") ?? "";
  const presented = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!timingSafeEqual(presented, expected)) {
    throw new HttpError(401, "Unauthorized");
  }
}

export function hasCronSecret(req: Request): boolean {
  try {
    requireCronSecret(req);
    return true;
  } catch {
    return false;
  }
}
