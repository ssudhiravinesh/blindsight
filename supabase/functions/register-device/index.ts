import { clientIp, handler, json, requireMethod } from "../_shared/http.ts";
import { randomToken, sha256Hex } from "../_shared/crypto.ts";
import { enforceRateLimits } from "../_shared/rate-limit.ts";
import { serviceClient } from "../_shared/supabase.ts";

/**
 * Issues an anonymous device credential. The secret is returned exactly once;
 * the database keeps only its SHA-256.
 */
Deno.serve(handler(async (req) => {
  requireMethod(req, "POST");
  const supabase = serviceClient();

  await enforceRateLimits(supabase, [
    { name: "register:ip", subject: clientIp(req), limit: 10, windowSeconds: 3600 },
  ]);

  const deviceId = crypto.randomUUID();
  const deviceSecret = randomToken(32);

  const { error } = await supabase
    .from("anon_users")
    .insert({ device_id: deviceId, secret_hash: await sha256Hex(deviceSecret) });
  if (error) throw error;

  return json(req, { device_id: deviceId, device_secret: deviceSecret }, 201);
}));
