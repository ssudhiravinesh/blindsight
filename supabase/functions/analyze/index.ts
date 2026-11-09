import { HttpError, clientIp, handler, json, readJsonBody, requireMethod } from "../_shared/http.ts";
import { authenticateDevice } from "../_shared/auth.ts";
import { enforceRateLimits } from "../_shared/rate-limit.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { LlmUnavailableError, analyzeTos } from "../_shared/llm.ts";
import { PROMPT_VERSION } from "../_shared/prompt.ts";
import { type Analysis, sanitizeAnalysis } from "../_shared/analysis.ts";
import { hashToS, normalizeToS } from "../_shared/tos-text.ts";

// Matches the client-side truncation; anything longer is rejected outright.
const MAX_TOS_CHARS = 30_000;
const MAX_BODY_BYTES = 256 * 1024;
const HOSTNAME_RE = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

Deno.serve(handler(async (req) => {
  requireMethod(req, "POST");
  const supabase = serviceClient();
  const user = await authenticateDevice(req, supabase);

  await enforceRateLimits(supabase, [
    { name: "analyze:device", subject: user.deviceId, limit: 20, windowSeconds: 600 },
    { name: "analyze:ip", subject: clientIp(req), limit: 60, windowSeconds: 600 },
  ]);

  const body = await readJsonBody(req, MAX_BODY_BYTES);
  const tosText = typeof body.tos_text === "string" ? body.tos_text : "";
  const domain = typeof body.domain === "string" ? body.domain.toLowerCase().replace(/^www\./, "") : "";

  if (tosText.trim().length < 100) throw new HttpError(400, "tos_text is missing or too short");
  if (tosText.length > MAX_TOS_CHARS) throw new HttpError(413, `tos_text exceeds ${MAX_TOS_CHARS} characters`);
  if (!HOSTNAME_RE.test(domain)) throw new HttpError(400, "domain must be a valid hostname");

  const startTime = Date.now();

  const normalized = normalizeToS(tosText);
  const hash = await hashToS(normalized);

  const redisUrl = Deno.env.get("UPSTASH_REDIS_REST_URL");
  const redisToken = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");

  let cacheHit = false;
  let analysisResult: Analysis | null = null;
  // Cache keys are namespaced by prompt version so a prompt change never serves stale grades.
  const cacheKey = `${PROMPT_VERSION}:${hash}`;
  let cacheSource = "none";

  // Hot cache (Upstash Redis)
  if (redisUrl && redisToken) {
    try {
      const res = await fetch(`${redisUrl}/get/${cacheKey}`, {
        headers: { Authorization: `Bearer ${redisToken}` },
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        const cached = await res.json();
        if (cached.result) {
          analysisResult = sanitizeAnalysis(JSON.parse(cached.result));
          cacheHit = true;
          cacheSource = "hot_redis";
        }
      }
    } catch (err) {
      console.error("Hot cache lookup failed:", (err as Error).message);
    }
  }

  // Cold cache (Postgres)
  if (!cacheHit) {
    const { data: dbCache, error: dbCacheError } = await supabase
      .from("tos_cache")
      .select("id, analysis_result")
      .eq("tos_hash", hash)
      .eq("prompt_version", PROMPT_VERSION)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (!dbCacheError && dbCache) {
      analysisResult = sanitizeAnalysis(dbCache.analysis_result);
      cacheHit = true;
      cacheSource = "cold_postgres";

      if (redisUrl && redisToken && analysisResult) {
        fetch(`${redisUrl}/set/${cacheKey}?EX=2592000`, {
          method: "POST",
          headers: { Authorization: `Bearer ${redisToken}` },
          body: JSON.stringify(analysisResult),
        }).catch((e) => console.error("Failed to populate hot cache:", (e as Error).message));
      }

      // PostgrestBuilder is a thenable without .catch(); calling .catch() threw a
      // TypeError that turned every cold-cache hit into an error response.
      supabase.rpc("increment_cache_hit", { row_id: dbCache.id }).then(({ error }) => {
        if (error) console.error("Failed to increment cache hit:", error.message);
      });
    }
  }

  let modelUsed = "cache";

  if (!cacheHit) {
    let analysis: Analysis;
    try {
      ({ analysis, model: modelUsed } = await analyzeTos(normalized));
    } catch (err) {
      if (err instanceof LlmUnavailableError) {
        throw new HttpError(502, "Analysis providers are unavailable. Please try again later.");
      }
      throw err;
    }
    analysisResult = analysis;

    {
      const severity = analysis.overallSeverity;
      const { error: insertError } = await supabase
        .from("tos_cache")
        .upsert({
          tos_hash: hash,
          domain,
          service_name: analysis.serviceName || domain,
          analysis_result: analysis,
          overall_severity: severity,
          clause_count: analysis.clauses.length,
          tos_length: normalized.length,
          model_used: modelUsed,
          prompt_version: PROMPT_VERSION,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }, { onConflict: "tos_hash" });
      if (insertError) console.error("Failed to write to cold cache:", insertError.message);

      if (redisUrl && redisToken) {
        try {
          await fetch(`${redisUrl}/set/${cacheKey}?EX=2592000`, {
            method: "POST",
            headers: { Authorization: `Bearer ${redisToken}` },
            body: JSON.stringify(analysisResult),
            signal: AbortSignal.timeout(2000),
          });
        } catch (redisError) {
          console.error("Failed to write to hot cache:", (redisError as Error).message);
        }
      }
    }
  }

  const duration = Date.now() - startTime;
  const severity = analysisResult?.overallSeverity ?? 0;

  const [{ error: activityError }, { error: logError }] = await Promise.all([
    supabase.from("anon_users").update({ last_active_at: new Date().toISOString() }).eq("id", user.id),
    supabase.from("scan_log").insert({
      user_id: user.id,
      tos_hash: hash,
      domain,
      cache_hit: cacheHit,
      severity,
      model_used: modelUsed,
      latency_ms: duration,
    }),
  ]);
  if (activityError) console.error("Failed to update user activity:", activityError.message);
  if (logError) console.error("Failed to write to scan log:", logError.message);

  return json(req, {
    analysis_result: analysisResult,
    cache_hit: cacheHit,
    cache_source: cacheSource,
    overallSeverity: severity,
    scanDurationMs: duration,
  });
}));
