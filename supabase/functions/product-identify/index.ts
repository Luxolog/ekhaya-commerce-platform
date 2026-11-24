import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });

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
    const profileResponse = await fetch(new URL(`/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=account_status,plan_code`, supabaseUrl), { headers: adminHeaders });
    if (!profileResponse.ok) return json({ error: "Could not verify your seller account status." }, 503);
    const profiles = await profileResponse.json();
    if (!Array.isArray(profiles) || profiles[0]?.account_status !== "active") {
      return json({ error: "Your seller account is not active. Please contact support.", code: "ACCOUNT_INACTIVE" }, 403);
    }
    const planCode = String(profiles[0]?.plan_code ?? "beginner").trim().toLowerCase();
    // Photograph recognition is a paid-plan entitlement. Beginner accounts may
    // still use barcode lookup, but cannot invoke the paid photo/OCR provider.
    if (planCode === "beginner" && (await req.clone().json().catch(() => ({})))?.mode === "photo") {
      return json({ error: "Photograph search is not included in the Beginner plan. Upgrade to Starter or above to use this feature.", code: "PHOTO_SEARCH_PLAN_REQUIRED" }, 403);
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
  let body: { mode?: string; barcode?: string; file_b64?: string; filename?: string; mime_type?: string };
  try { body = await req.json(); } catch { return json({ error: "Valid JSON required" }, 400); }

  let endpoint = "";
  let reefKey = "";
  let params: Record<string, unknown> = {};
  if (body.mode === "barcode") {
    reefKey = Deno.env.get("REEFAPI_KEY") ?? "";
    if (!reefKey) return json({ error: "Server configuration incomplete", missing: ["REEFAPI_KEY"] }, 503);
    const barcode = String(body.barcode ?? "").replace(/[\s-]/g, "");
    if (!/^\d{8,14}$/.test(barcode)) return json({ error: "Enter a valid 8–14 digit barcode." }, 400);
    endpoint = "https://api.reefapi.com/barcode/v1/lookup";
    params = { barcode, source: "auto" };
  } else if (body.mode === "photo") {
    const geminiKey = Deno.env.get("GEMINI_API_KEY") ?? "";
    if (!geminiKey) return json({ error: "Photo recognition is not configured on this environment.", code: "PHOTO_PROVIDER_NOT_CONFIGURED" }, 503);
    const fileB64 = String(body.file_b64 ?? "").replace(/^data:[^;]+;base64,/i, "");
    if (!fileB64 || fileB64.length > 25_000_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(fileB64)) {
      return json({ error: "Please upload a valid image smaller than 18 MB.", code: "INVALID_IMAGE" }, 400);
    }
    const mimeType = String(body.mime_type ?? "image/jpeg").toLowerCase();
    if (!["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"].includes(mimeType)) {
      return json({ error: "Use a JPEG, PNG, WEBP or HEIC product photo.", code: "UNSUPPORTED_IMAGE_TYPE" }, 400);
    }
    const prompt = `You are a careful product identification assistant for a South African marketplace seller.
Inspect the actual image visually. Identify the complete product shown, not merely text detected by OCR.
Return exactly one JSON object with fields: identified (boolean), brand (string or null), product_name (string or null), model_or_variant (string or null), search_query (string), category (string or null), confidence (number 0 to 1), visual_evidence (string array), message (string).
Rules: identify from visible product shape, packaging, logo, label and text together. Never invent brand, model, size or variant. If unclear or not a product, identified=false, confidence below 0.5 and search_query="". If brand/model cannot be verified, leave null and use only a reliable generic description. Keep search_query concise for Takealot, Amazon South Africa and Makro. Return valid JSON only.`;
    try {
      const upstream = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: fileB64 } },
          ] }],
          generationConfig: { temperature: 0.1, responseMimeType: "application/json", maxOutputTokens: 700 },
        }),
        signal: AbortSignal.timeout(30000),
      });
      const result = await upstream.json();
      if (!upstream.ok) {
        if (upstream.status === 429) return json({ error: "Photo recognition is temporarily rate-limited by Gemini. Please try again shortly.", code: "PHOTO_PROVIDER_RATE_LIMITED" }, 429);
        if (upstream.status === 401 || upstream.status === 403) return json({ error: "The Gemini photo-recognition key was rejected. Check the server-side GEMINI_API_KEY.", code: "PHOTO_PROVIDER_AUTH_FAILED" }, 502);
        return json({ error: String(result?.error?.message ?? "Gemini could not process this image.").slice(0, 240), code: "PHOTO_PROVIDER_FAILED" }, 502);
      }
      const text = (result?.candidates?.[0]?.content?.parts ?? []).map((part: { text?: string }) => part.text ?? "").join("").trim();
      if (!text) return json({ identified: false, product: { search_query: "" }, message: "No product identification was returned. Try a clearer photo." });
      let identified;
      try { identified = JSON.parse(text); } catch {
        return json({ error: "Photo recognition returned an unreadable result. Please try again.", code: "INVALID_MODEL_RESPONSE" }, 502);
      }
      const confidence = Math.max(0, Math.min(1, Number(identified.confidence) || 0));
      const searchQuery = typeof identified.search_query === "string" ? identified.search_query.trim().slice(0, 180) : "";
      const isIdentified = identified.identified === true && Boolean(searchQuery) && confidence >= 0.5;
      return json({
        mode: "photo", identified: isIdentified,
        product: { search_query: isIdentified ? searchQuery : "", brand: identified.brand ?? null, product_name: identified.product_name ?? null, model_or_variant: identified.model_or_variant ?? null, category: identified.category ?? null, confidence },
        visual_evidence: Array.isArray(identified.visual_evidence) ? identified.visual_evidence.slice(0, 6).map((v: unknown) => String(v).slice(0, 120)) : [],
        message: isIdentified ? "Product visually recognised. Check or edit the suggested product name before searching." : String(identified.message ?? "We could not confidently identify this product. Try a clearer photo or enter the product name manually.").slice(0, 240),
      });
    } catch (error) {
      if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) return json({ error: "Photo recognition timed out. Please try again.", code: "IDENTIFICATION_TIMEOUT" }, 504);
      return json({ error: "Unable to identify this product right now.", code: "IDENTIFICATION_FAILED" }, 502);
    }
  } else return json({ error: "Choose barcode or photo identification." }, 400);

  try {
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${reefKey}` },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(18000),
    });
    const payload = await upstream.json();
    if (!upstream.ok || payload?.ok === false) {
      return json({ error: payload?.error?.message ?? payload?.error?.detail ?? "Product identification failed", code: payload?.error?.code ?? "IDENTIFICATION_FAILED" }, 422);
    }
    const data = payload?.data ?? {};
    const p = data.product ?? data;
    if (!p?.title) return json({ error: "No product record was found for this barcode. Try searching by product name.", code: "BARCODE_NOT_FOUND" }, 404);
    return json({ mode: "barcode", product: {
      barcode: p.barcode ?? body.barcode, title: p.title, brand: p.brand ?? null,
      category: p.category ?? null, image: p.image ?? null, weight_grams: p.weight_grams ?? null,
      weight_confidence: p.weight_confidence ?? null, description: p.description ?? null,
    } });
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) return json({ error: "Barcode lookup timed out. Please try again.", code: "IDENTIFICATION_TIMEOUT" }, 504);
    return json({ error: "Unable to look up this barcode.", code: "IDENTIFICATION_FAILED" }, 502);
  }
});
