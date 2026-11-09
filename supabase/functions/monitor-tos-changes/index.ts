import * as Sentry from "@sentry/deno";
import { handler, json, requireMethod } from "../_shared/http.ts";
import { requireCronSecret } from "../_shared/auth.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { safeFetchText } from "../_shared/safe-fetch.ts";
import { analyzeTos } from "../_shared/llm.ts";
import { PROMPT_VERSION } from "../_shared/prompt.ts";
import { hashToS, htmlToText, normalizeToS } from "../_shared/tos-text.ts";

Sentry.init({
  dsn: Deno.env.get("SENTRY_DSN"),
  enabled: Boolean(Deno.env.get("SENTRY_DSN")),
  tracesSampleRate: 0.1,
});

function severityToGrade(severity: number): string {
  const grades: Record<number, string> = { 0: "A", 1: "B", 2: "C", 3: "F" };
  return grades[severity] ?? "A";
}

// Triggered only by pg_cron, which presents the shared CRON_SECRET. Without
// this guard anyone could force a full crawl + LLM re-analysis on our budget.
Deno.serve(handler(async (req) => {
  requireMethod(req, "POST");
  requireCronSecret(req);

  try {
    const supabase = serviceClient();

    // Get all unique domains tracked by users
    const { data: monitoredDomains, error: dbError } = await supabase
      .from("monitored_domains")
      .select("*");

    if (dbError) throw dbError;

    const results = {
      total: monitoredDomains?.length ?? 0,
      processed: 0,
      changed: 0,
      errors: [] as string[],
    };

    if (!monitoredDomains || monitoredDomains.length === 0) {
      return json(req, { message: "No tracked domains to monitor", results });
    }


    for (const entry of monitoredDomains) {
      const { domain, tos_url: tosUrl } = entry;
      if (!tosUrl) {
        results.errors.push(`No ToS URL for domain: ${domain}`);
        continue;
      }

      try {
        // 1. Crawl the page. tos_url is user-supplied, so it goes through the
        // SSRF guard (public hosts only, DNS + redirect re-validation, size cap).
        const { text: html } = await safeFetchText(tosUrl, {
          headers: { "User-Agent": "BlindsightCrawler/1.0 (+https://github.com/blind-sight)" },
        });
        const plainText = htmlToText(html);
        const normalized = normalizeToS(plainText);

        if (normalized.length < 200) {
          throw new Error(`Crawled content is too short (${normalized.length} chars)`);
        }

        const newHash = await hashToS(normalized);

        // 2. Fetch the latest version in database
        const { data: latestVersion, error: versionError } = await supabase
          .from("tos_versions")
          .select("tos_hash, overall_severity")
          .eq("domain", domain)
          .order("detected_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (versionError) {
          console.error(`Error querying latest version for ${domain}:`, versionError);
        }

        results.processed++;

        // 3. Compare hashes
        if (latestVersion && latestVersion.tos_hash === newHash) {
          // Unchanged, skip LLM re-analysis
          continue;
        }

        results.changed++;

        // 4. Hash mismatch (or first time) -> Run LLM analysis (same budget cap as analyze)
        const { analysis: analysisResult, model: modelUsed } = await analyzeTos(normalized.slice(0, 30_000));
        const newSeverity = analysisResult.overallSeverity;

        // 5. Update cached details
        await supabase.from("tos_cache").upsert({
          tos_hash: newHash,
          domain: domain,
          service_name: analysisResult.serviceName || domain,
          analysis_result: analysisResult,
          overall_severity: newSeverity,
          clause_count: analysisResult.clauses.length,
          tos_length: normalized.length,
          model_used: modelUsed,
          prompt_version: PROMPT_VERSION,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        }, { onConflict: "tos_hash" });

        // 6. Save version history
        await supabase.from("tos_versions").insert({
          domain: domain,
          tos_hash: newHash,
          tos_url: tosUrl,
          overall_severity: newSeverity,
          analysis_result: analysisResult,
        });

        // 7. Get users tracking this domain
        const { data: trackers } = await supabase
          .from("tracked_services")
          .select("user_id, last_severity")
          .eq("domain", domain);

        if (trackers && trackers.length > 0) {
          for (const tracker of trackers) {
            const oldSeverity = tracker.last_severity ?? 0;
            let summaryText = `Terms of Service updated for ${analysisResult.serviceName || domain}.`;
            
            if (newSeverity > oldSeverity) {
              summaryText = `Severity escalated from Grade ${severityToGrade(oldSeverity)} → ${severityToGrade(newSeverity)}. Tap to review details.`;
            }

            // Create notification entry
            await supabase.from("notifications").insert({
              user_id: tracker.user_id,
              domain: domain,
              service_name: analysisResult.serviceName || domain,
              old_severity: oldSeverity,
              new_severity: newSeverity,
              change_summary: summaryText,
              is_read: false,
            });

            // Update tracker state
            await supabase
              .from("tracked_services")
              .update({
                last_known_hash: newHash,
                last_severity: newSeverity,
              })
              .eq("user_id", tracker.user_id)
              .eq("domain", domain);
          }
        }
      } catch (err) {
        const errMsg = `Error monitoring ${domain}: ${(err as Error).message}`;
        console.error(errMsg);
        results.errors.push(errMsg);
        Sentry.captureException(err);
      }
    }

    return json(req, { message: "Monitoring cycle completed", results });
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
}));
