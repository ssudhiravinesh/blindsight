import { handler, json, requireMethod } from "../_shared/http.ts";
import { authenticateDevice } from "../_shared/auth.ts";
import { enforceRateLimits } from "../_shared/rate-limit.ts";
import { serviceClient } from "../_shared/supabase.ts";

Deno.serve(handler(async (req) => {
  requireMethod(req, "GET");
  const supabase = serviceClient();
  const user = await authenticateDevice(req, supabase);

  await enforceRateLimits(supabase, [
    { name: "notifications:device", subject: user.deviceId, limit: 30, windowSeconds: 3600 },
  ]);

  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("id, domain, service_name, old_severity, new_severity, change_summary, created_at")
    .eq("user_id", user.id)
    .eq("is_read", false)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;

  // Mark exactly the rows being returned, so a notification inserted between
  // the read and the update is not silently swallowed.
  const ids = (notifications ?? []).map((n) => n.id);
  if (ids.length > 0) {
    const { error: updateError } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .in("id", ids);
    if (updateError) console.error("Failed to mark notifications as read:", updateError.message);
  }

  return json(req, { notifications: notifications ?? [] });
}));
