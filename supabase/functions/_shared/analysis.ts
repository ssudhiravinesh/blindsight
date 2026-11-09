/**
 * Validation for LLM output. Model responses are untrusted (the analysed ToS
 * text can contain prompt injection), so before anything is cached or shown we
 * coerce it into a strict shape: bounded severities, capped string lengths,
 * known enums and https-only links.
 */

export interface AnalysisClause {
  type: string;
  severity: number;
  quote?: string;
  explanation: string;
  mitigation: string | null;
}

export interface AnalysisAlternative {
  name: string;
  url: string;
  reason: string;
}

export interface Analysis {
  overallSeverity: number;
  category: string;
  serviceName?: string;
  summary?: string;
  clauses: AnalysisClause[];
  suggestedAlternatives: AnalysisAlternative[];
}

// The prompt lists ~40 categories; validate the format rather than duplicating the list.
const CATEGORY_RE = /^[a-z][a-z_]{1,39}$/;
const CLAUSE_TYPES = new Set([
  "DATA_SELLING", "ARBITRATION", "NO_CLASS_ACTION", "TOS_CHANGES", "CONTENT_RIGHTS", "LIABILITY",
  "UNILATERAL_CHANGES", "OTHER",
]);
const MAX_CLAUSES = 25;
const MAX_ALTERNATIVES = 5;

function str(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  // Strip C0 control characters (except tab/newline) that could corrupt rendering or logs.
  // deno-lint-ignore no-control-regex
  const trimmed = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

function severity(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(3, Math.round(value))) : fallback;
}

function httpsUrl(value: unknown): string | undefined {
  const s = str(value, 2048);
  if (!s) return undefined;
  try {
    const u = new URL(s);
    return u.protocol === "https:" && !u.username && !u.password ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

/** Extracts the JSON object from a model response, tolerating ``` fences. */
export function extractJson(text: string): unknown {
  let clean = text.trim();
  // indexOf instead of a regex: model output is untrusted and the regex backtracked polynomially.
  const open = clean.indexOf("```");
  if (open !== -1) {
    let start = open + 3;
    if (clean.startsWith("json", start)) start += 4;
    const close = clean.indexOf("```", start);
    if (close !== -1) clean = clean.slice(start, close).trim();
  }
  return JSON.parse(clean);
}

export function sanitizeAnalysis(raw: unknown): Analysis {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("analysis must be a JSON object");
  }
  const r = raw as Record<string, unknown>;

  const overall = typeof r.overallSeverity === "number"
    ? severity(r.overallSeverity, 0)
    : typeof r.lethal === "boolean" ? (r.lethal ? 3 : 0) : 0;

  const clauses = (Array.isArray(r.clauses) ? r.clauses : [])
    .filter((c): c is Record<string, unknown> => !!c && typeof c === "object")
    .slice(0, MAX_CLAUSES)
    .map((c) => {
      const type = str(c.type, 40)?.toUpperCase() ?? "OTHER";
      return {
        type: CLAUSE_TYPES.has(type) ? type : "OTHER",
        severity: severity(c.severity, 1),
        quote: str(c.quote, 1000),
        explanation: str(c.explanation, 1500) ?? "No explanation provided",
        mitigation: str(c.mitigation, 600) ?? null,
      };
    });

  const suggestedAlternatives = (Array.isArray(r.suggestedAlternatives) ? r.suggestedAlternatives : [])
    .filter((a): a is Record<string, unknown> => !!a && typeof a === "object")
    .map((a) => ({ name: str(a.name, 80), url: httpsUrl(a.url), reason: str(a.reason, 300) }))
    .filter((a): a is AnalysisAlternative => !!(a.name && a.url && a.reason))
    .slice(0, MAX_ALTERNATIVES);

  const category = str(r.category, 40)?.toLowerCase() ?? "unknown";

  return {
    overallSeverity: overall,
    category: CATEGORY_RE.test(category) ? category : "unknown",
    serviceName: str(r.serviceName, 120),
    summary: str(r.summary, 600),
    clauses,
    suggestedAlternatives,
  };
}

export function parseAnalysis(text: string): Analysis {
  return sanitizeAnalysis(extractJson(text));
}
