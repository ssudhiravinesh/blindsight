import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_TRACKED_SERVICES = 50;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { device_id: deviceId, domain, tos_url: tosUrl } = body;

    if (!deviceId || !domain) {
      return new Response(JSON.stringify({ error: "Missing device_id or domain" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Resolve user ID from device ID
    const { data: user, error: userError } = await supabase
      .from("anon_users")
      .select("id")
      .eq("device_id", deviceId)
      .single();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid device_id" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    if (req.method === "POST") {
      // Flat per-device cap: abuse protection for the nightly crawler, not a paid limit.
      const { count, error: countError } = await supabase
        .from("tracked_services")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (countError) throw countError;

      if ((count ?? 0) >= MAX_TRACKED_SERVICES) {
        return new Response(
          JSON.stringify({ error: `You can track up to ${MAX_TRACKED_SERVICES} services` }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 403,
          }
        );
      }

      const { error: insertError } = await supabase
        .from("tracked_services")
        .upsert(
          {
            user_id: user.id,
            domain: domain.toLowerCase().replace("www.", ""),
            tos_url: tosUrl,
            tracked_at: new Date().toISOString(),
          },
          { onConflict: "user_id,domain" }
        );

      if (insertError) throw insertError;

      return new Response(JSON.stringify({ success: true, tracked_count: (count ?? 0) + 1 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } else if (req.method === "DELETE") {
      const { error: deleteError } = await supabase
        .from("tracked_services")
        .delete()
        .eq("user_id", user.id)
        .eq("domain", domain.toLowerCase().replace("www.", ""));

      if (deleteError) throw deleteError;

      const { count } = await supabase
        .from("tracked_services")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      return new Response(JSON.stringify({ success: true, tracked_count: count ?? 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
