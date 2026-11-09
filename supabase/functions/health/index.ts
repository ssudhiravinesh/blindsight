import { handler, json, requireMethod } from "../_shared/http.ts";
import { hasCronSecret } from "../_shared/auth.ts";
import { serviceClient } from "../_shared/supabase.ts";

/**
 * Public callers get a bare liveness status. Dependency details (which reveal
 * configuration) are only returned to callers holding the cron secret.
 */
Deno.serve(handler(async (req) => {
  requireMethod(req, "GET");

  const supabase = serviceClient();
  const { error: dbError } = await supabase.from("tos_cache").select("id", { head: true, count: "exact" }).limit(1);

  let redis: "ok" | "error" | "not_configured" = "not_configured";
  const redisUrl = Deno.env.get("UPSTASH_REDIS_REST_URL");
  const redisToken = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");
  if (redisUrl && redisToken) {
    try {
      const res = await fetch(`${redisUrl}/ping`, {
        headers: { Authorization: `Bearer ${redisToken}` },
        signal: AbortSignal.timeout(3000),
      });
      redis = res.ok ? "ok" : "error";
    } catch {
      redis = "error";
    }
  }

  const healthy = !dbError && redis !== "error";
  const body: Record<string, unknown> = { status: healthy ? "healthy" : "degraded" };

  if (hasCronSecret(req)) {
    body.services = {
      database: dbError ? "error" : "ok",
      redis,
      groq: Deno.env.get("GROQ_API_KEY") ? "configured" : "missing",
      gemini: Deno.env.get("GEMINI_API_KEY") ? "configured" : "missing",
    };
  }

  return json(req, body, healthy ? 200 : 503);
}));
