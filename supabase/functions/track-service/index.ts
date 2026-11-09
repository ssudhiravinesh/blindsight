import { HttpError, handler, json, readJsonBody, requireMethod } from "../_shared/http.ts";
import { authenticateDevice } from "../_shared/auth.ts";
import { enforceRateLimits } from "../_shared/rate-limit.ts";
import { serviceClient } from "../_shared/supabase.ts";

const MAX_TRACKED_SERVICES = 50;

Deno.serve(handler(async (req) => {
  requireMethod(req, "POST", "DELETE");
  const supabase = serviceClient();
  const user = await authenticateDevice(req, supabase);

  await enforceRateLimits(supabase, [
    { name: "track:device", subject: user.deviceId, limit: 60, windowSeconds: 3600 },
  ]);

  const body = await readJsonBody(req, 4 * 1024);
  const domain = typeof body.domain === "string" ? body.domain.toLowerCase().replace(/^www\./, "") : "";
  if (!domain) throw new HttpError(400, "Missing domain");

  if (req.method === "DELETE") {
    const { error } = await supabase
      .from("tracked_services")
      .delete()
      .eq("user_id", user.id)
      .eq("domain", domain);
    if (error) throw error;
    return json(req, { success: true });
  }

  // Flat per-device cap: abuse protection for the nightly crawler, not a paid limit.
  const { count, error: countError } = await supabase
    .from("tracked_services")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);
  if (countError) throw countError;
  if ((count ?? 0) >= MAX_TRACKED_SERVICES) {
    throw new HttpError(403, `You can track up to ${MAX_TRACKED_SERVICES} services`);
  }

  const { error } = await supabase
    .from("tracked_services")
    .upsert(
      {
        user_id: user.id,
        domain,
        tos_url: typeof body.tos_url === "string" ? body.tos_url : null,
        tracked_at: new Date().toISOString(),
      },
      { onConflict: "user_id,domain" },
    );
  if (error) throw error;

  return json(req, { success: true });
}));
