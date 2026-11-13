import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
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
        weight_confidence: p.weight_confidence ?? null,
        length_cm: p.length_cm ?? p.dimensions?.length_cm ?? null,
        width_cm: p.width_cm ?? p.dimensions?.width_cm ?? null,
        height_cm: p.height_cm ?? p.dimensions?.height_cm ?? null,
        description: p.description ?? null,
      } });
    }
    return json({ mode: "photo", text: String(data.text ?? ""), confidence: data.mean_confidence ?? null, words: data.words ?? 0 });
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) return json({ error: "Product identification timed out. Please try again.", code: "IDENTIFICATION_TIMEOUT" }, 504);
    return json({ error: "Unable to identify this product.", detail: String(error) }, 500);
  }
});
