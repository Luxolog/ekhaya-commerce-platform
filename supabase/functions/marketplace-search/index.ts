import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: cors });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const reefKey = Deno.env.get("REEFAPI_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!reefKey || !supabaseUrl || !serviceKey) {
    return json({ error: "Server configuration incomplete", missing: [
      ...(!reefKey ? ["REEFAPI_KEY"] : []),
      ...(!supabaseUrl ? ["SUPABASE_URL"] : []),
      ...(!serviceKey ? ["SUPABASE_SERVICE_ROLE_KEY"] : []),
    ] }, 503);
  }

  let body: { marketplace?: string; query?: string };
  try { body = await req.json(); } catch { return json({ error: "Valid JSON required" }, 400); }
  const marketplace = body.marketplace;
  const query = typeof body.query === "string" ? body.query.trim().slice(0, 160) : "";
  if (!["takealot", "amazon"].includes(marketplace ?? "") || query.length < 2) {
    return json({ error: "Choose takealot or amazon and enter at least 2 search characters" }, 400);
  }

  const lookupKey = query.toLowerCase().replace(/\\s+/g, " ");
  const cacheUrl = new URL("/rest/v1/marketplace_price_cache", supabaseUrl);
  cacheUrl.searchParams.set("marketplace", `eq.${marketplace}`);
  cacheUrl.searchParams.set("lookup_key", `eq.search:${lookupKey}`);
  cacheUrl.searchParams.set("select", "*");

  try {
    const cached = await fetch(cacheUrl, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } });
    if (cached.ok) {
      const rows = await cached.json();
      if (Array.isArray(rows) && rows.length && new Date(rows[0].expires_at) > new Date()) {
        return json({ source: "cache", marketplace, fetched_at: rows[0].fetched_at, products: rows[0].source_payload?.products ?? [] });
      }
    }

    const provider = marketplace === "takealot" ? "takealot" : "amazon";
    const params = marketplace === "takealot" ? { query, country: "za" } : { query, marketplace: "co.za", max_results: 24 };
    const upstream = await fetch(`https://api.reefapi.com/${provider}/v1/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${reefKey}` },
      body: JSON.stringify(params),
    });
    const payload = await upstream.json();
    if (!upstream.ok || payload?.ok === false) {
      return json({ error: "Marketplace lookup failed", detail: payload?.error?.message ?? upstream.statusText }, 502);
    }

    const raw = payload?.data?.results ?? [];
    const products = raw.map((p: Record<string, unknown>) => ({
      id: marketplace === "takealot" ? p.plid : p.asin,
      title: p.title ?? "Untitled product",
      brand: p.brand ?? null,
      price: typeof p.price === "number" ? p.price : null,
      currency: marketplace === "takealot" ? "ZAR" : (p.currency_code ?? "ZAR"),
      image: p.image ?? null,
      url: p.url ?? (typeof p.asin === "string" ? `https://www.amazon.co.za/dp/${p.asin}` : null),
      in_stock: p.in_stock ?? null,
      rating: p.rating ?? null,
      review_count: p.review_count ?? p.rating_count ?? null,
      seller: p.seller_name ?? null,
      variant_selection_required: p.variant_selection_required ?? false,
    }));

    const now = new Date();
    const expires = new Date(now.getTime() + 6 * 60 * 60 * 1000);
    const cacheRow = {
      marketplace, lookup_key: `search:${lookupKey}`, product_title: `Search: ${query}`,
      price: null, currency: "ZAR", fetched_at: now.toISOString(), expires_at: expires.toISOString(),
      source_payload: { products, provider_meta: payload.meta ?? null }, last_error: null,
    };
    await fetch(new URL("/rest/v1/marketplace_price_cache?on_conflict=marketplace,lookup_key", supabaseUrl), {
      method: "POST",
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(cacheRow),
    });
    return json({ source: "live", marketplace, fetched_at: now.toISOString(), products, provider_meta: payload.meta ?? null });
  } catch (error) {
    return json({ error: "Unable to complete marketplace lookup", detail: String(error) }, 500);
  }
});
