import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const status: Record<string, any> = {
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {}
  };

  try {
    // 1. Check Database
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: dbError } = await supabase.from("tos_cache").select("count").limit(1);
    status.services.database = dbError ? { status: "error", message: dbError.message } : "ok";

    // 2. Check Upstash Redis
    const redisUrl = Deno.env.get("UPSTASH_REDIS_REST_URL");
    const redisToken = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");
    
    if (redisUrl && redisToken) {
      try {
        const start = Date.now();
        const res = await fetch(`${redisUrl}/ping`, {
          headers: { Authorization: `Bearer ${redisToken}` }
        });
        if (res.ok) {
          status.services.redis = { status: "ok", latency_ms: Date.now() - start };
        } else {
          status.services.redis = { status: "error", message: `HTTP ${res.status}` };
        }
      } catch (err) {
        status.services.redis = { status: "error", message: (err as Error).message };
      }
    } else {
      status.services.redis = "not_configured";
    }

    // 3. Check LLM Keys Presence
    status.services.gemini = Deno.env.get("GEMINI_API_KEY") ? "configured" : "missing";
    status.services.groq = Deno.env.get("GROQ_API_KEY") ? "configured" : "missing";

    const overallHealthy = !dbError && (status.services.redis?.status !== "error");
    status.status = overallHealthy ? "healthy" : "degraded";

    return new Response(JSON.stringify(status), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: overallHealthy ? 200 : 500
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500
    });
  }
});
