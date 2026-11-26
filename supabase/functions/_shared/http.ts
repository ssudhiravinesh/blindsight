/**
 * HTTP helpers shared by every edge function: CORS allowlisting, security
 * headers, bounded JSON parsing and error responses that never leak internals.
 */

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly publicMessage: string,
    public readonly headers: Record<string, string> = {},
  ) {
    super(publicMessage);
  }
}

const SECURITY_HEADERS: Record<string, string> = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
};

const ALLOWED_HEADERS = "content-type, x-device-id, x-device-secret";

function allowedOrigins(): string[] {
  return (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

/**
 * Only allowlisted origins (the published extension ID, e.g.
 * chrome-extension://<id>) get CORS headers; arbitrary websites cannot read
 * responses. Extension service workers with host permissions are not subject
 * to CORS, so this blocks drive-by web pages without affecting the extension.
 */
export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin");
  if (!origin || !allowedOrigins().includes(origin)) return { Vary: "Origin" };
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

export function json(
  req: Request,
  body: unknown,
  status = 200,
  extra: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...SECURITY_HEADERS, ...corsHeaders(req), ...extra },
  });
}

export function preflight(req: Request): Response | null {
  if (req.method !== "OPTIONS") return null;
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}

export function requireMethod(req: Request, ...methods: string[]): void {
  if (!methods.includes(req.method)) {
    throw new HttpError(405, "Method not allowed", {
      Allow: methods.join(", "),
    });
  }
}

/** Parses a JSON object body, rejecting oversized or non-JSON payloads. */
export async function readJsonBody(
  req: Request,
  maxBytes: number,
): Promise<Record<string, unknown>> {
  const contentType = req.headers.get("Content-Type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new HttpError(415, "Content-Type must be application/json");
  }
  const declared = Number(req.headers.get("Content-Length") ?? "0");
  if (declared > maxBytes) throw new HttpError(413, "Request body too large");

  const raw = await req.text();
  if (new TextEncoder().encode(raw).byteLength > maxBytes) {
    throw new HttpError(413, "Request body too large");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new HttpError(400, "Malformed JSON body");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new HttpError(400, "JSON body must be an object");
  }
  return parsed as Record<string, unknown>;
}

/**
 * Wraps a handler with preflight handling and uniform error mapping. Unknown
 * errors are logged with a correlation id and reported generically.
 */
export function handler(
  fn: (req: Request) => Promise<Response>,
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    const pre = preflight(req);
    if (pre) return pre;
    try {
      return await fn(req);
    } catch (err) {
      if (err instanceof HttpError) {
        return json(req, { error: err.publicMessage }, err.status, err.headers);
      }
      const requestId = crypto.randomUUID();
      console.error(`[${requestId}]`, err);
      return json(req, {
        error: "Internal server error",
        request_id: requestId,
      }, 500);
    }
  };
}

export function clientIp(req: Request): string {
  // Supabase's edge gateway sets X-Forwarded-For; the left-most entry is the client.
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || "unknown";
}
