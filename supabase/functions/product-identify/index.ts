import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });

// Extract only literal facts present in OCR text. These are suggestions, never
// verified product specifications; the seller must review them before use.
function extractOcrAttributes(text: string): Record<string, { value: string; source: "ocr"; confirmed: false }> {
  const attributes: Record<string, { value: string; source: "ocr"; confirmed: false }> = {};
  const add = (key: string, match: RegExpMatchArray | null) => {
    if (match?.[0]) attributes[key] = { value: match[0].trim(), source: "ocr", confirmed: false };
  };
  add("wattage", text.match(/\\b\\d{1,3}\\s?W\\b/i));
  add("cable_length", text.match(/\\b\\d+(?:[.,]\\d+)?\\s?(?:m|cm)\\b/i));
  add("capacity", text.match(/\\b\\d+(?:[.,]\\d+)?\\s?(?:mAh|Ah|GB|TB|MB)\\b/i));
  add("pack_quantity", text.match(/\\b(?:pack of|set of|\\d+\\s?[- ]?pack|\\d+\\s?(?:pcs|pieces|units))\\b/i));
  add("model_or_sku", text.match(/\\b(?:model|model no\\.?|sku|item no\\.?|p\\/n)\\s*[:#-]?\\s*[A-Z0-9][A-Z0-9._/-]{2,}\\b/i));
  add("connector_types", text.match(/\\b(?:USB[- ]?C\\s*(?:to|[-–])\\s*USB[- ]?C|USB[- ]?A\\s*(?:to|[-–])\\s*USB[- ]?C|USB[- ]?C|USB[- ]?A|Lightning|Micro[- ]?USB)\\b/i));
  if (/\\bwall charger\\b|\\bpower adapter\\b|\\bcharging adapter\\b/i.test(text)) attributes.product_type = { value: "wall charger / power adapter", source: "ocr", confirmed: false };
  else if (/\\bcharging cable\\b|\\bUSB cable\\b|\\bdata cable\\b/i.test(text)) attributes.product_type = { value: "cable", source: "ocr", confirmed: false };
  return attributes;
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // Product identification uses a paid upstream provider. Require a verified
  // Supabase session and apply the same server-side IP rate limit as searches.
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "Server configuration incomplete" }, 503);

  const authorization = req.headers.get("authorization") ?? "";
  const accessToken = authorization.replace(/^Bearer\s+/i, "");
  if (!accessToken || accessToken === authorization) {
    return json({ error: "Sign in to identify products.", code: "AUTH_REQUIRED" }, 401);
  }

  try {
    const userResponse = await fetch(new URL("/auth/v1/user", supabaseUrl), {
      headers: { apikey: serviceKey, Authorization: `Bearer ${accessToken}` },
    });
    if (!userResponse.ok) {
      return json({ error: "Your session is invalid or expired. Please sign in again.", code: "INVALID_SESSION" }, 401);
    }
    const user = await userResponse.json();
    const userId = typeof user.id === "string" ? user.id : "";
    if (!userId) return json({ error: "Authentication required.", code: "AUTH_REQUIRED" }, 401);

    const adminHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
    const profileResponse = await fetch(new URL(`/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=account_status`, supabaseUrl), { headers: adminHeaders });
    if (!profileResponse.ok) return json({ error: "Could not verify your seller account status." }, 503);
    const profiles = await profileResponse.json();
    if (!Array.isArray(profiles) || profiles[0]?.account_status !== "active") {
      return json({ error: "Your seller account is not active. Please contact support.", code: "ACCOUNT_INACTIVE" }, 403);
    }

    const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const ipHash = await sha256(`${userId}:${forwarded}`);
    const quotaResponse = await fetch(new URL("/rest/v1/rpc/consume_price_search_quota", supabaseUrl), {
      method: "POST",
      headers: { ...adminHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ p_ip_hash: ipHash, p_limit: 30 }),
    });
  if (!quotaResponse.ok || await quotaResponse.json() !== true) {
    return json({ error: "Product identification limit reached. Please try again in an hour.", code: "RATE_LIMITED" }, 429);
  }
  } catch {
    return json({ error: "Could not verify your seller account or rate limit." }, 503);
  }
  const key = Deno.env.get("REEFAPI_KEY");
  if (!key) return json({ error: "Server configuration incomplete", missing: ["REEFAPI_KEY"] }, 503);
  let body: { mode?: string; barcode?: string; file_b64?: string; filename?: string };
  try { body = await req.json(); } catch { return json({ error: "Valid JSON required" }, 400); }

  let endpoint = "";
  let params: Record<string, unknown> = {};
  if (body.mode === "barcode") {
    const barcode = String(body.barcode ?? "").replace(/[\s-]/g, "");
    if (!/^\d{8,14}$/.test(barcode)) return json({ error: "Enter a valid 8–14 digit barcode." }, 400);
    endpoint = "https://api.reefapi.com/barcode/v1/lookup";
    params = { barcode, source: "auto" };
  } else if (body.mode === "photo") {
    const fileB64 = String(body.file_b64 ?? "");
    if (!fileB64 || fileB64.length > 34_000_000) return json({ error: "Please upload an image smaller than 25 MB." }, 400);
    endpoint = "https://api.reefapi.com/file-convert/v1/ocr_image";
    params = { file_b64: fileB64, filename: String(body.filename ?? "product-photo.jpg").slice(0, 120), language: ["eng"] };
  } else return json({ error: "Choose barcode or photo identification." }, 400);

  try {
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(18000),
    });
    const payload = await upstream.json();
    if (!upstream.ok || payload?.ok === false) {
      return json({ error: payload?.error?.message ?? payload?.error?.detail ?? "Product identification failed", code: payload?.error?.code ?? "IDENTIFICATION_FAILED" }, 422);
    }
    const data = payload?.data ?? {};
    if (body.mode === "barcode") {
      const p = data.product ?? data;
      if (!p?.title) return json({ error: "No product record was found for this barcode. Try searching by product name.", code: "BARCODE_NOT_FOUND" }, 404);
      return json({ mode: "barcode", product: {
        barcode: p.barcode ?? body.barcode, title: p.title, brand: p.brand ?? null,
        category: p.category ?? null, image: p.image ?? null, weight_grams: p.weight_grams ?? null,
        weight_confidence: p.weight_confidence ?? null, description: p.description ?? null,
      } });
    }
    const text = String(data.text ?? "");
    return json({ mode: "photo", text, confidence: data.mean_confidence ?? null, words: data.words ?? 0, attributes: extractOcrAttributes(text) });
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) return json({ error: "Product identification timed out. Please try again.", code: "IDENTIFICATION_TIMEOUT" }, 504);
    return json({ error: "Unable to identify this product.", detail: String(error) }, 500);
  }
});
