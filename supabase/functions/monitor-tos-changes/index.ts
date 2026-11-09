import * as Sentry from "@sentry/deno";
import { handler, json, requireMethod } from "../_shared/http.ts";
import { requireCronSecret } from "../_shared/auth.ts";
import { serviceClient } from "../_shared/supabase.ts";

Sentry.init({
  dsn: Deno.env.get("SENTRY_DSN"),
  enabled: Boolean(Deno.env.get("SENTRY_DSN")),
  tracesSampleRate: 0.1,
});

const SYSTEM_PROMPT = `You are an expert legal document analyzer specializing in Terms of Service (ToS) and Privacy Policy agreements. Your task is to meticulously analyze the provided text, identify concerning clauses, and classify the overall document into one of four severity tiers (0 through 3). Your analysis must be driven purely by the SUBSTANCE and BEHAVIOR described in the legal text, not by brand recognition, company size, or reputation.

─────────────────────────────────────────────
## SEVERITY TIER DEFINITIONS
─────────────────────────────────────────────

### TIER 0 — STANDARD (Severity 0) ✓
This tier represents services with genuinely privacy-respecting, minimal, and transparent terms.

**Boundary test — if ANY of the following are true, the service is NOT Tier 0:**
- The service runs any form of personalized advertising, even within its own ecosystem
- User data is shared with any "partners," "affiliates," or "third parties" for purposes beyond direct service delivery
- Content licensing grants extend beyond display/delivery on the platform itself

### TIER 1 — NOTABLE (Severity 1) ⚠
This tier represents services that are broadly industry-standard among large, established technology companies.

**Boundary test — if ANY of the following are true, the service is NOT Tier 1:**
- User data is shared with or sold to external third-party advertising networks, data aggregators, or brokers
- Content licensing extends to sublicensing to third parties or training AI/ML models without clear opt-out

### TIER 2 — CAUTIONARY (Severity 2) ⚡
This tier represents services with terms that go meaningfully beyond standard industry practice.

**Characteristics:**
- User data is shared with/sold to EXTERNAL third-party advertising networks or data brokers
- Aggressive licensing (sublicensing, AI training, perpetual exploitation)
- Deliberate cancellation friction

### TIER 3 — CRITICAL (Severity 3) 🚨
This tier represents services with truly predatory, exploitative terms designed to maximize extraction from users.

**Characteristics:**
- Granular user data sold with no functional opt-out
- OS-level extreme data harvesting
- Complete waiver of liability for gross negligence

─────────────────────────────────────────────
## RESPONSE FORMAT
─────────────────────────────────────────────
Respond ONLY with valid JSON:
{
  "overallSeverity": 0-3,
  "category": "vpn | email | cloud_storage | social_media | messaging | video_conferencing | search | browser | password_manager | notes | ai_assistant | file_sharing | ecommerce | design_tools | forums | unknown",
  "serviceName": "Name of the service",
  "summary": "Brief 1-sentence summary of the ToS",
  "clauses": [
    {
      "type": "DATA_SELLING | ARBITRATION | TOS_CHANGES | CONTENT_RIGHTS | LIABILITY | OTHER",
      "severity": 0-3,
      "quote": "exact relevant quote",
      "explanation": "human-readable explanation",
      "mitigation": "any opt-out or null"
    }
  ]
}`;

function extractTextFromHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeToS(rawText: string): string {
  if (!rawText) return "";
  return rawText
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s*\d{4}/gi, "")
    .replace(/\b\d{4}[-/]\d{2}[-/]\d{2}\b/g, "")
    .replace(/(?:last\s+(?:updated|modified|revised)|effective\s+(?:date|as\s+of))[\s:]*(?:\S+[\s,]*\d{0,4})?/gi, "")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

async function hashToS(normalizedText: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(normalizedText);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function severityToGrade(severity: number): string {
  const grades: Record<number, string> = { 0: "A", 1: "B", 2: "C", 3: "F" };
  return grades[severity] ?? "A";
}

async function callGroq(apiKey: string, tosText: string): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Analyze the following Terms of Service text:\n\n${tosText}` },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    throw new Error(`Groq API returned HTTP ${res.status}`);
  }

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from Groq");
  return content;
}

async function callGemini(apiKey: string, tosText: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `Analyze the following Terms of Service:\n\n${tosText}` }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    }),
  });

  if (!res.ok) {
    throw new Error(`Gemini API returned HTTP ${res.status}`);
  }

  const json = await res.json();
  const content = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error("Empty response from Gemini");
  return content;
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

    const groqKey = Deno.env.get("GROQ_API_KEY") ?? "";
    const geminiKey = Deno.env.get("GEMINI_API_KEY") ?? "";

    for (const entry of monitoredDomains) {
      const { domain, tos_url: tosUrl } = entry;
      if (!tosUrl) {
        results.errors.push(`No ToS URL for domain: ${domain}`);
        continue;
      }

      try {
        // 1. Crawl the page
        const response = await fetch(tosUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 BlindsightCrawler/1.0",
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch ${tosUrl}: HTTP ${response.status}`);
        }

        const html = await response.text();
        const plainText = extractTextFromHtml(html);
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

        // 4. Hash mismatch (or first time) -> Run LLM analysis
        let responseText = "";
        let modelUsed = "";

        try {
          if (!groqKey) throw new Error("Groq API key not configured");
          responseText = await callGroq(groqKey, normalized);
          modelUsed = "groq_llama-3.3-70b";
        } catch (groqError) {
          console.warn(`Groq failed for ${domain}, trying Gemini fallback:`, (groqError as Error).message);
          if (!geminiKey) throw new Error("Gemini API key not configured");
          responseText = await callGemini(geminiKey, normalized);
          modelUsed = "gemini-2.5-flash";
        }

        let cleanText = responseText.trim();
        const jsonMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          cleanText = jsonMatch[1].trim();
        }
        const analysisResult = JSON.parse(cleanText);
        const newSeverity = typeof analysisResult.overallSeverity === "number" ? analysisResult.overallSeverity : 0;

        // 5. Update cached details
        await supabase.from("tos_cache").upsert({
          tos_hash: newHash,
          domain: domain,
          service_name: analysisResult.serviceName || domain,
          analysis_result: analysisResult,
          overall_severity: newSeverity,
          clause_count: Array.isArray(analysisResult.clauses) ? analysisResult.clauses.length : 0,
          tos_length: normalized.length,
          model_used: modelUsed,
          prompt_version: "v3",
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
