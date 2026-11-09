import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are an expert legal document analyzer specializing in Terms of Service (ToS) and Privacy Policy agreements. Your task is to meticulously analyze the provided text, identify concerning clauses, and classify the overall document into one of four severity tiers (0 through 3). Your analysis must be driven purely by the SUBSTANCE and BEHAVIOR described in the legal text, not by brand recognition, company size, or reputation.

─────────────────────────────────────────────
## SEVERITY TIER DEFINITIONS
─────────────────────────────────────────────

### TIER 0 — STANDARD (Severity 0) ✓
This tier represents services with genuinely privacy-respecting, minimal, and transparent terms. These are services that collect only what is strictly necessary for functionality, employ strong encryption, and make no attempt to monetize user data.

**Core characteristics that MUST all be present for Tier 0:**
- Data collection is narrowly scoped to service functionality, security, or crash reporting only
- The service offers end-to-end encryption or zero-knowledge architecture where applicable
- No advertising ecosystem exists, OR the service is entirely ad-free
- User content is never licensed beyond what is needed for display/delivery within the platform
- Cookie usage is limited to functional/session cookies only
- Clear, reasonable account termination policies tied to specific TOS violations
- Arbitration clauses, if present, include a meaningful opt-out window (30+ days)
- The privacy policy is concise, readable, and does not contain vague or catch-all language

**Boundary test — if ANY of the following are true, the service is NOT Tier 0:**
- The service runs any form of personalized advertising, even within its own ecosystem
- User data is shared with any "partners," "affiliates," or "third parties" for purposes beyond direct service delivery
- Content licensing grants extend beyond display/delivery on the platform itself
- The privacy policy references "interest-based advertising," "personalized experiences," or "relevant content" based on behavioral profiles

---

### TIER 1 — NOTABLE (Severity 1) ⚠
This tier represents services that are broadly industry-standard among large, established technology companies. They collect substantial data and run advertising ecosystems, but they do so WITHIN their own platform boundaries, provide centralized privacy controls, and offer meaningful transparency. This is the expected baseline for major search engines, email providers, social media platforms, e-commerce marketplaces, and streaming services that are household names.

**CRITICAL DISTINCTION — Ecosystem-Internal Advertising vs. External Data Selling:**
The single most important factor separating Tier 1 from Tier 2 is WHERE the data stays and WHO controls the advertising:
- **Tier 1 (Ecosystem-Internal):** The platform operates its OWN advertising network. Advertisers target demographics/interests through the platform's ad-buying tools, but the platform does NOT hand over raw user data to those advertisers. The advertisers never see individual user profiles or personal data; they only see aggregated performance metrics. The user's data remains within the platform's ecosystem and is used to show ads ON the platform's own properties or partner properties within its ad network.
- **Tier 2 (External Selling/Sharing):** The platform sends, sells, or shares identifiable user data, behavioral profiles, device fingerprints, or browsing histories directly to EXTERNAL third-party companies, advertising networks that the platform does not own or control, or data brokers. The data leaves the platform's ecosystem.

**Core characteristics of Tier 1:**
- Extensive data collection including search history, location, device info, and behavioral patterns — BUT this data is used within the platform's own advertising ecosystem, not sold externally
- The platform provides centralized, accessible privacy dashboards where users can view, download, and delete their data
- Content licensing grants the platform rights to display, reproduce, and distribute user-generated content — BUT only for the purpose of operating and promoting the platform itself (e.g., showing your post in a feed, including your review on a product page, displaying your photo on the platform)
- Binding arbitration with a class action waiver. The key question is whether an opt-out window exists of at least 30 days
- TOS changes with 30+ days advance notice via email or in-product notification
- Marketing communications with easy, one-click unsubscribe
- Standard indemnification clauses (user indemnifies the platform against claims arising from the user's own content or violations)
- Data sharing only with controlled "service providers" under contractual obligation to use the data solely for providing services to the platform (e.g., cloud hosting, payment processing, customer support)

**Boundary test — if ANY of the following are true, the service is NOT Tier 1 and should be Tier 2 or higher:**
- User data (behavioral profiles, browsing history, device fingerprints, location data) is explicitly shared with or sold to external third-party advertising networks, data aggregators, or data brokers that the platform does not own
- Content licensing extends to uses like "sublicensing to third parties," "use in any media now known or hereafter devised," training AI/ML models (without clear opt-out), or "creating derivative works" that the platform can sell or distribute independently
- TOS changes can take effect with fewer than 30 days notice, or "continued use constitutes acceptance" with no proactive notification
- Arbitration clause has NO opt-out mechanism whatsoever, or the opt-out window is shorter than 30 days
- The privacy policy references sharing data with "advertising partners" (as distinct from the platform running its own ads), "affiliate networks," or "marketing partners" who receive actual user-level data
- Cancellation or account deletion is deliberately obstructed (dark patterns, mandatory phone calls, multi-step retention flows, or early termination fees)

---

### TIER 2 — CAUTIONARY (Severity 2) ⚡
This tier represents services with terms that go meaningfully beyond standard industry practice. They impose unusual restrictions on user rights, aggressively monetize user data beyond the first-party ecosystem, make it difficult to leave, or claim rights to user content that exceed platform necessity.

**Core characteristics (one or more of the following elevate a service to Tier 2):**

**Data & Privacy:**
- User data is shared with or sold to EXTERNAL third-party advertising networks, data aggregators, or marketing partners that operate independently from the platform. This means the user's data LEAVES the platform's control
- The platform collects extensive biometric data (facial recognition, voiceprints, keystroke dynamics, gait analysis) AND shares this data broadly with affiliates or partners, even if an opt-out technically exists but is buried or difficult to execute
- Behavioral tracking extends significantly beyond the platform's core service (e.g., an e-commerce site tracking your browsing across unrelated websites, a social media app harvesting your contact list AND monitoring your device usage patterns)
- The privacy policy is deliberately vague about who receives user data, using terms like "business partners," "affiliates," or "third parties" without meaningful specificity, AND the data categories shared are broad (behavioral, device, location)
- Cross-device or cross-app tracking mechanisms are employed without clear, prominent disclosure and easy opt-out

**Content Rights:**
- Content licensing grants go beyond platform operation: the service claims the right to sublicense user content to third parties, use content for AI/ML model training (especially without a clear, accessible opt-out), create and commercially exploit derivative works, or use content in "any media or distribution channels now known or later developed"
- The platform reserves the right to use user-generated content in advertising or promotional materials without additional consent
- Content rights survive account deletion (the license is described as "perpetual" or "irrevocable" but the scope is somewhat bounded to the platform's business purposes)

**Terms & Cancellation:**
- TOS changes take effect with fewer than 30 days notice, or the platform reserves the right to change terms "at any time" with only a vague "we'll try to notify you" commitment
- Cancellation involves deliberate friction: designing to retain users, mandatory phone calls, or early termination fees
- Automatic renewal is the default and the cancellation process is not clearly documented

**Arbitration & Legal:**
- Binding arbitration with a class action waiver AND the opt-out window is very short (fewer than 30 days)
- The waiver of right to jury trial is combined with mandatory arbitration in a jurisdiction chosen by the company
- Indemnification clauses require the user to defend and hold harmless the platform for consequences of the PLATFORM'S own actions or negligence

**KEY CALIBRATION for Tier 2 — what separates it from Tier 1:**
- Tier 1 keeps data WITHIN its ecosystem; Tier 2 sends data OUTSIDE to parties the platform does not control
- Tier 1 licenses content for platform operation; Tier 2 licenses content for external commercial exploitation or AI training
- Tier 1 provides clear cancellation; Tier 2 makes cancellation deliberately difficult
- Tier 1 gives 30+ day notice for changes; Tier 2 gives less than 30 days or no guaranteed notice
- Tier 1's arbitration has reasonable opt-outs; Tier 2's opt-outs are absent or impractically short

**Boundary test — if ANY of the following are true, escalate to Tier 3:**
- Data is explicitly sold to named data brokers, or the ToS describes selling "any and all" user data to unspecified third parties with NO opt-out
- Content rights are perpetual, irrevocable, royalty-free, worldwide, fully sublicensable, AND extend beyond the platform's own business operations
- Multiple Tier 2 clauses stack up in the same document (3 or more distinct Tier 2 characteristics present simultaneously).

---

### TIER 3 — CRITICAL (Severity 3) 🚨
This tier represents services with truly predatory, exploitative terms designed to maximize extraction from users while minimizing their rights. These terms are fundamentally hostile to user privacy and autonomy.

**Core characteristics (one or more of the following mark a service as Tier 3):**

**Data — Extreme Harvesting & Selling:**
- The platform explicitly sells, trades, or shares granular, identifiable user data with external third-party data brokers, advertising networks, or marketing companies — AND provides NO functional opt-out
- OS-level or OS-adjacent data harvesting (clipboard, local storage/files, call logs, sensor readings, device fingerprinting, precise location history)
- Biometric sharing without narrow explicit consent

**Content — Perpetual Exploitation:**
- Sweeping, perpetual, irrevocable, fully sublicensable licensing rights that survive account deletion
- Platform reserves the right to use user content for training AI/ML models with no opt-out

**Terms & Liability:**
- TOS changes take effect immediately with no notice
- Complete waiver of liability for gross negligence, security breaches, or willful misconduct
- 3 or more distinct Tier 2 characteristics present simultaneously (The Stacking Rule)

─────────────────────────────────────────────
## SPECIFIC CLAUSE-TYPE GUIDANCE
─────────────────────────────────────────────
Identify which clauses are concerning. Focus on:
- DATA_SELLING, ARBITRATION, TOS_CHANGES, CONTENT_RIGHTS, LIABILITY, OTHER

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
      "quote": "exact relevant quote (keep brief)",
      "explanation": "human-readable explanation",
      "mitigation": "any opt-out or protection available, or null"
    }
  ]
}
Do not return any conversational text or formatting wrappers outside the raw JSON object.`;

function normalizeToS(rawText: string): string {
  return rawText
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/(?:last\s+(?:updated|modified|revised)|effective\s+(?:date|as\s+of))[\s:]*\S+[\s,]*\d{0,4}/gi, "")
    .replace(/\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s*\d{4}/gi, "")
    .replace(/\b\d{4}[-/]\d{2}[-/]\d{2}\b/g, "")
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

function parseLLMResponse(text: string): Record<string, any> {
  let cleanText = text.trim();
  const jsonMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    cleanText = jsonMatch[1].trim();
  }
  return JSON.parse(cleanText);
}

// Call Groq (Primary LLM)
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
    throw new Error(`Groq API returned HTTP ${res.status}: ${await res.text()}`);
  }

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from Groq");
  return content;
}

// Call Gemini (Secondary/Fallback LLM)
async function callGemini(apiKey: string, tosText: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        { parts: [{ text: `Analyze the following Terms of Service:\n\n${tosText}` }] }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }]
      }
    }),
  });

  if (!res.ok) {
    throw new Error(`Gemini API returned HTTP ${res.status}: ${await res.text()}`);
  }

  const json = await res.json();
  const content = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error("Empty response from Gemini");
  return content;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { tos_text, domain, device_id } = body;

    if (!tos_text || !domain || !device_id) {
      return new Response(JSON.stringify({ error: "Missing required parameters: tos_text, domain, or device_id" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const startTime = Date.now();

    // 1. User Resolution
    const { data: user, error: userError } = await supabase
      .from("anon_users")
      .select("id")
      .eq("device_id", device_id)
      .single();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Device not registered" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // 2. Normalization & Hashing
    const normalized = normalizeToS(tos_text);
    const hash = await hashToS(normalized);

    // Cache config
    const redisUrl = Deno.env.get("UPSTASH_REDIS_REST_URL");
    const redisToken = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");
    
    let cacheHit = false;
    let analysisResult: Record<string, any> | null = null;
    let cacheSource = "none";

    // 3. Hot Cache Check (Upstash Redis)
    if (redisUrl && redisToken) {
      try {
        const res = await fetch(`${redisUrl}/get/${hash}`, {
          headers: { Authorization: `Bearer ${redisToken}` }
        });
        if (res.ok) {
          const json = await res.json();
          if (json.result) {
            analysisResult = JSON.parse(json.result);
            cacheHit = true;
            cacheSource = "hot_redis";
          }
        }
      } catch (err) {
        console.error("Hot cache lookup failed:", err);
      }
    }

    // 4. Cold Cache Check (Supabase Database)
    if (!cacheHit) {
      const { data: dbCache, error: dbCacheError } = await supabase
        .from("tos_cache")
        .select("id, analysis_result, overall_severity")
        .eq("tos_hash", hash)
        .maybeSingle();

      if (!dbCacheError && dbCache) {
        analysisResult = dbCache.analysis_result;
        cacheHit = true;
        cacheSource = "cold_postgres";

        // populate hot cache asynchronously
        if (redisUrl && redisToken && analysisResult) {
          fetch(`${redisUrl}/set/${hash}?EX=2592000`, {
            method: "POST",
            headers: { Authorization: `Bearer ${redisToken}` },
            body: JSON.stringify(analysisResult)
          }).catch((e) => console.error("Failed to populate hot cache asynchronously:", e));
        }

        // Increment cache hit count
        supabase.rpc("increment_cache_hit", { row_id: dbCache.id }).catch(() => {});
      }
    }

    let modelUsed = "cache";

    // 5. Cache Miss - Analyze using LLM
    if (!cacheHit) {
      let responseText = "";
      const groqKey = Deno.env.get("GROQ_API_KEY");
      const geminiKey = Deno.env.get("GEMINI_API_KEY");

      try {
        if (!groqKey) throw new Error("Groq API key not configured");
        responseText = await callGroq(groqKey, normalized);
        modelUsed = "groq_llama-3.3-70b";
      } catch (groqError) {
        console.warn("Groq failed, falling back to Gemini:", (groqError as Error).message);
        
        try {
          if (!geminiKey) throw new Error("Gemini API key not configured");
          responseText = await callGemini(geminiKey, normalized);
          modelUsed = "gemini-2.5-flash";
        } catch (geminiError) {
          console.error("Gemini fallback failed:", geminiError);
          throw new Error(`LLM analysis failed. Primary: ${(groqError as Error).message}. Fallback: ${(geminiError as Error).message}`);
        }
      }

      try {
        analysisResult = parseLLMResponse(responseText);
      } catch (parseError) {
        console.error("Failed to parse JSON response from LLM:", responseText);
        throw new Error(`Analysis Failed: Invalid JSON returned by LLM. Parse error: ${(parseError as Error).message}`);
      }

      // Write results to hot & cold caches
      if (analysisResult) {
        const severity = typeof analysisResult.overallSeverity === "number" ? analysisResult.overallSeverity : 0;
        
        // Cold Cache Write
        const { error: insertError } = await supabase
          .from("tos_cache")
          .insert({
            tos_hash: hash,
            domain: domain.toLowerCase().replace("www.", ""),
            service_name: analysisResult.serviceName || domain,
            analysis_result: analysisResult,
            overall_severity: severity,
            clause_count: Array.isArray(analysisResult.clauses) ? analysisResult.clauses.length : 0,
            tos_length: normalized.length,
            model_used: modelUsed,
            prompt_version: "v3"
          });

        if (insertError) {
          console.error("Failed to write to cold cache:", insertError);
        }

        // Hot Cache Write (Upstash Redis, TTL 30 days)
        if (redisUrl && redisToken) {
          try {
            await fetch(`${redisUrl}/set/${hash}?EX=2592000`, {
              method: "POST",
              headers: { Authorization: `Bearer ${redisToken}` },
              body: JSON.stringify(analysisResult)
            });
          } catch (redisError) {
            console.error("Failed to write to hot cache:", redisError);
          }
        }
      }
    }

    const duration = Date.now() - startTime;

    // 6. Record activity
    const { error: activityError } = await supabase
      .from("anon_users")
      .update({ last_active_at: new Date().toISOString() })
      .eq("id", user.id);

    if (activityError) {
      console.error("Failed to update user activity:", activityError);
    }

    // 7. Log scan to audit logs
    const severity = typeof analysisResult?.overallSeverity === "number" ? analysisResult.overallSeverity : 0;
    const { error: logError } = await supabase
      .from("scan_log")
      .insert({
        user_id: user.id,
        tos_hash: hash,
        domain: domain.toLowerCase().replace("www.", ""),
        cache_hit: cacheHit,
        severity: severity,
        model_used: modelUsed,
        latency_ms: duration
      });

    if (logError) {
      console.error("Failed to write to scan log:", logError);
    }

    return new Response(
      JSON.stringify({
        analysis_result: analysisResult,
        cache_hit: cacheHit,
        cache_source: cacheSource,
        overallSeverity: severity,
        scanDurationMs: duration
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Analyze request error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
