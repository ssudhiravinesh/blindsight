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

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const deviceId = body.device_id;

      if (!deviceId) {
        return new Response(JSON.stringify({ error: "Missing device_id parameter" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      const { data: user, error } = await supabase
        .from("anon_users")
        .update({ tier: "pro" })
        .eq("device_id", deviceId)
        .select("device_id, tier")
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({
          success: true,
          device_id: deviceId,
          tier: user.tier,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // GET Request
    const url = new URL(req.url);
    const deviceId = url.searchParams.get("device_id");

    if (!deviceId) {
      return new Response(JSON.stringify({ error: "Missing device_id parameter" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const { data: user, error } = await supabase
      .from("anon_users")
      .select("scans_today, tier, last_scan_date")
      .eq("device_id", deviceId)
      .maybeSingle();

    if (error) throw error;
    if (!user) {
      return new Response(JSON.stringify({ error: "Device not registered" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    const limit = user.tier === "pro" ? 999999 : 5;
    const canScan = user.scans_today < limit;

    return new Response(
      JSON.stringify({
        device_id: deviceId,
        scans_today: user.scans_today,
        limit,
        tier: user.tier,
        can_scan: canScan,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
