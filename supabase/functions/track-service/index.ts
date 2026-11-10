import { HttpError, handler, json, readJsonBody, requireMethod } from "../_shared/http.ts";
import { authenticateDevice } from "../_shared/auth.ts";
import { enforceRateLimits } from "../_shared/rate-limit.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { checkPublicHttpUrl, isBlockedHostname, isSameSite } from "../_shared/net-guard.ts";

const MAX_TRACKED_SERVICES = 50;
const HOSTNAME_RE = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,62}$/;

Deno.serve(handler(async (req) => {
  requireMethod(req, "POST", "DELETE");
  const supabase = serviceClient();
  const user = await authenticateDevice(req, supabase);

  await enforceRateLimits(supabase, [
    { name: "track:device", subject: user.deviceId, limit: 60, windowSeconds: 3600 },
  ]);

  const body = await readJsonBody(req, 4 * 1024);
  const domain = typeof body.domain === "string" ? body.domain.toLowerCase().replace(/^www\./, "") : "";
  if (!domain || isBlockedHostname(domain) || !HOSTNAME_RE.test(domain)) {
    throw new HttpError(400, "domain must be a public hostname");
  }

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

  // The nightly crawler fetches tos_url server-side, so only accept public
  // http(s) URLs on the tracked service's own site.
  let tosUrl: string | null = null;
  if (body.tos_url !== undefined && body.tos_url !== null) {
    const check = typeof body.tos_url === "string" && body.tos_url.length <= 2048
      ? checkPublicHttpUrl(body.tos_url)
      : { ok: false as const, reason: "invalid" };
    if (!check.ok || !isSameSite(check.url.hostname, domain)) {
      throw new HttpError(400, "tos_url must be a public http(s) URL on the tracked domain");
    }
    tosUrl = check.url.toString();
  }

  const { error } = await supabase
    .from("tracked_services")
    .upsert(
      {
        user_id: user.id,
        domain,
        tos_url: tosUrl,
        tracked_at: new Date().toISOString(),
      },
      { onConflict: "user_id,domain" },
    );
  if (error) throw error;

  return json(req, { success: true });
}));
