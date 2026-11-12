import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: cors });
const validMarketplaces = ["takealot", "amazon", "makro"];

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const reefKey = Deno.env.get("REEFAPI_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!reefKey || !supabaseUrl || !serviceKey) {
    return json({ error: "Server configuration incomplete" }, 503);
  }
  const authorization = req.headers.get("authorization") ?? "";
  const accessToken = authorization.replace(/^Bearer\s+/i, "");
  if (!accessToken || accessToken === authorization) {
    return json({ error: "Sign in to search marketplace listings.", code: "AUTH_REQUIRED" }, 401);
  }

  const adminHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  let user: Record<string, unknown>;
  try {
    const userResponse = await fetch(new URL("/auth/v1/user", supabaseUrl), {
      headers: { apikey: serviceKey, Authorization: `Bearer ${accessToken}` },
    });
    if (!userResponse.ok) return json({ error: "Your session is invalid or expired. Please sign in again.", code: "INVALID_SESSION" }, 401);
    user = await userResponse.json();
  } catch {
    return json({ error: "Could not verify your seller session." }, 503);
  }
  const userId = typeof user.id === "string" ? user.id : "";
  if (!userId) return json({ error: "Authentication required." }, 401);
  const appMetadata = (user.app_metadata ?? {}) as Record<string, unknown>;
  const isOwner = appMetadata.role === "owner" || appMetadata.is_owner === true;

  let body: { marketplace?: string; query?: string; request_id?: string; action?: string; cache_ttl_minutes?: number; refresh_enabled?: boolean; force_refresh?: boolean };
  try { body = await req.json(); } catch { return json({ error: "Valid JSON required" }, 400); }

  if (body.action === "get_cache_settings") {
    if (!isOwner) return json({ error: "Owner permission required." }, 403);
    const response = await fetch(new URL("/rest/v1/marketplace_cache_settings?id=eq.true&select=refresh_enabled,cache_ttl_minutes,updated_at", supabaseUrl), { headers: adminHeaders });
    if (!response.ok) return json({ error: "Could not load cache policy." }, 500);
    return json({ ok: true, settings: (await response.json())[0] ?? null });
  }
  if (body.action === "configure_cache") {
    if (!isOwner) return json({ error: "Owner permission required." }, 403);
    const ttl = body.cache_ttl_minutes;
    if (ttl !== undefined && (!Number.isInteger(ttl) || ttl < 5 || ttl > 10080)) {
      return json({ error: "Cache TTL must be between 5 and 10,080 minutes." }, 400);
    }
    const update: Record<string, unknown> = { updated_at: new Date().toISOString(), updated_by: userId };
    if (ttl !== undefined) update.cache_ttl_minutes = ttl;
    if (body.refresh_enabled !== undefined) update.refresh_enabled = body.refresh_enabled;
    const saved = await fetch(new URL("/rest/v1/marketplace_cache_settings?id=eq.true", supabaseUrl), {
      method: "PATCH",
      headers: { ...adminHeaders, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(update),
    });
    if (!saved.ok) return json({ error: "Could not save cache policy.", detail: await saved.text() }, 500);
    return json({ ok: true, settings: (await saved.json())[0] });
  }

  const marketplace = body.marketplace;
  const query = typeof body.query === "string" ? body.query.trim().slice(0, 160) : "";
  if (!validMarketplaces.includes(marketplace ?? "") || query.length < 2) {
    return json({ error: "Choose a supported marketplace and enter at least 2 search characters." }, 400);
  }
  if (marketplace === "makro") {
    return json({ error: "Makro live product search is not connected yet. We are validating an authorised South African data source before enabling it.", code: "MARKETPLACE_UNAVAILABLE" }, 501);
  }
  if (body.force_refresh && !isOwner) return json({ error: "Only the Ekhaya owner can force a live cache refresh." }, 403);

  const lookupKey = query.toLowerCase().replace(/\s+/g, " ");
  const cacheUrl = new URL("/rest/v1/marketplace_price_cache", supabaseUrl);
  cacheUrl.searchParams.set("marketplace", `eq.${marketplace}`);
  cacheUrl.searchParams.set("lookup_key", `eq.search:${lookupKey}`);
  cacheUrl.searchParams.set("select", "*");

  try {
    const [cachedResponse, settingsResponse] = await Promise.all([
      fetch(cacheUrl, { headers: adminHeaders }),
      fetch(new URL("/rest/v1/marketplace_cache_settings?id=eq.true&select=refresh_enabled,cache_ttl_minutes", supabaseUrl), { headers: adminHeaders }),
    ]);
    const cachedRows = cachedResponse.ok ? await cachedResponse.json() : [];
    const cache = Array.isArray(cachedRows) ? cachedRows[0] : null;
    const settingsRows = settingsResponse.ok ? await settingsResponse.json() : [];
    const settings = settingsRows?.[0] ?? { refresh_enabled: true, cache_ttl_minutes: 360 };
    const fresh = cache && new Date(cache.expires_at) > new Date();
    if (cache && !body.force_refresh && (fresh || settings.refresh_enabled === false)) {
      return json({
        source: fresh ? "cache" : "stale-cache",
        marketplace,
        fetched_at: cache.fetched_at,
        products: cache.source_payload?.products ?? [],
        refresh_paused: !fresh,
      });
    }

    const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const ipHash = await sha256(forwarded);
    const quotaResponse = await fetch(new URL("/rest/v1/rpc/consume_price_search_quota", supabaseUrl), {
      method: "POST",
      headers: { ...adminHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ p_ip_hash: ipHash, p_limit: 30 }),
    });
    if (!quotaResponse.ok || await quotaResponse.json() !== true) {
      return json({ error: "Search limit reached. Please try again in an hour." }, 429);
    }

    const requestId = body.request_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.request_id)
      ? body.request_id : crypto.randomUUID();
    const charged = !isOwner;
    if (charged) {
      const reserve = await fetch(new URL("/rest/v1/rpc/reserve_monthly_search_credit", supabaseUrl), {
        method: "POST",
        headers: { ...adminHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ p_user_id: userId, p_marketplace: marketplace, p_request_id: requestId }),
      });
      const reservation = reserve.ok ? await reserve.json() : null;
      if (!reserve.ok || reservation?.allowed !== true) {
        const reason = reservation?.reason ?? "CREDIT_RESERVATION_FAILED";
        return json({ error: reason === "MONTHLY_SEARCH_LIMIT" ? "You have used all your monthly marketplace search credits." : "Your account or plan is not enabled for live searches.", code: reason, usage: reservation }, 402);
      }
      if (reservation.duplicate) {
        return json({ error: "This search request has already been processed. Please start a new search.", code: "DUPLICATE_REQUEST" }, 409);
      }
    }

    try {
      const provider = marketplace;
      const params = marketplace === "takealot"
        ? { query, country: "za" }
        : { query, marketplace: "co.za", max_results: 24 };
      const upstream = await fetch(`https://api.reefapi.com/${provider}/v1/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${reefKey}` },
        body: JSON.stringify(params),
        signal: AbortSignal.timeout(12000),
      });
      const payload = await upstream.json();
      if (!upstream.ok || payload?.ok === false) throw new Error(payload?.error?.message ?? upstream.statusText ?? "Provider lookup failed");

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
      const ttl = Math.max(5, Math.min(10080, Number(settings.cache_ttl_minutes) || 360));
      const expires = new Date(now.getTime() + ttl * 60 * 1000);
      const cacheRow = {
        marketplace, lookup_key: `search:${lookupKey}`, product_title: `Search: ${query}`,
        price: null, currency: "ZAR", fetched_at: now.toISOString(), expires_at: expires.toISOString(),
        source_payload: { products, provider_meta: payload.meta ?? null }, last_error: null,
      };
      const cacheWrite = await fetch(new URL("/rest/v1/marketplace_price_cache?on_conflict=marketplace,lookup_key", supabaseUrl), {
        method: "POST",
        headers: { ...adminHeaders, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(cacheRow),
      });
      if (!cacheWrite.ok) throw new Error("Marketplace data was found but could not be saved to shared cache.");

      if (charged) {
        await fetch(new URL("/rest/v1/rpc/complete_monthly_search_credit", supabaseUrl), {
          method: "POST",
          headers: { ...adminHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ p_user_id: userId, p_request_id: requestId, p_marketplace: marketplace }),
        });
      }
      await fetch(new URL("/rest/v1/api_usage_ledger", supabaseUrl), {
        method: "POST",
        headers: { ...adminHeaders, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({
          provider: "reefapi", action: "search", marketplace, lookup_key: `search:${lookupKey}`,
          credits_charged: Number(payload.meta?.charged_credits ?? 0), request_status: "success",
          response_count: products.length, request_id: payload.meta?.request_id ?? null, actor_id: charged ? userId : null,
        }),
      });
      return json({ source: "live", marketplace, fetched_at: now.toISOString(), products, provider_meta: payload.meta ?? null, credit_charged: charged });
    } catch (error) {
      if (charged) {
        await fetch(new URL("/rest/v1/rpc/refund_monthly_search_credit", supabaseUrl), {
          method: "POST",
          headers: { ...adminHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ p_user_id: userId, p_request_id: requestId, p_marketplace: marketplace }),
        });
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      return json({ error: "Marketplace timed out. Your search credit has been refunded.", code: "PROVIDER_TIMEOUT" }, 504);
    }
    return json({ error: "Unable to complete marketplace lookup. Your search credit has been refunded if it was reserved.", detail: String(error) }, 502);
  }
});
