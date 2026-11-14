import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: cors });
const validMarketplaces = ["takealot"];
const testingMarketplaces: Record<string, string> = {
  amazon: "Amazon South Africa is in testing and is not available for live searches yet.",
  makro: "Makro is in testing and is not available for live searches yet.",
  bobshop: "Bob Shop is in testing and is not available for live searches yet.",
  leroy_merlin: "Leroy Merlin is in testing and is not available for live searches yet.",
};

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const reefKey = Deno.env.get("REEFAPI_KEY");
  const steadyApiKey = Deno.env.get("STEADYAPI_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
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

  if (body.action === "owner_update_pilot") {
    if (!isOwner) return json({ error: "Owner permission required." }, 403);
    const targetId = typeof body.target_user_id === "string" ? body.target_user_id : "";
    const operation = body.operation;
    if (!targetId || !["suspend","resume","extend"].includes(String(operation))) return json({ error: "Choose a seller and a valid management action." }, 400);
    const lookup = await fetch(new URL("/rest/v1/seller_pilot_access?user_id=eq."+encodeURIComponent(targetId)+"&select=user_id,status,ends_at,daily_limit,pilot_label",supabaseUrl), {headers:adminHeaders});
    const rows = lookup.ok ? await lookup.json() : [];
    if (!lookup.ok || !rows?.[0]) return json({error:"Pilot seller record not found."},404);
    const row = rows[0];
    const patch: Record<string,unknown> = {};
    if (operation === "suspend") patch.status = "suspended";
    if (operation === "resume") {
      if (new Date(row.ends_at) <= new Date()) return json({error:"This pilot has expired. A new activation is required."},409);
      patch.status = "active";
    }
    if (operation === "extend") {
      const days = Number(body.days);
      if (!Number.isInteger(days) || days < 1 || days > 30) return json({error:"Extension must be between 1 and 30 days."},400);
      const base = new Date(Math.max(Date.now(),new Date(row.ends_at).getTime()));
      patch.ends_at = new Date(base.getTime()+days*86400000).toISOString();
      patch.status = "active";
    }
    const saved = await fetch(new URL("/rest/v1/seller_pilot_access?user_id=eq."+encodeURIComponent(targetId),supabaseUrl), {
      method:"PATCH",headers:{...adminHeaders,"Content-Type":"application/json",Prefer:"return=representation"},body:JSON.stringify(patch)
    });
    if (!saved.ok) return json({error:"Could not update pilot seller.",detail:await saved.text()},500);
    return json({ok:true,seller:(await saved.json())[0]});
  }
  if (body.action === "owner_pilot_analytics") {
    if (!isOwner) return json({error:"Owner permission required."},403);
    const [activityResponse,feedbackResponse] = await Promise.all([
      fetch(new URL("/rest/v1/seller_pilot_activity?select=user_id,marketplace,query,result_count,result_status,source,created_at&order=created_at.desc&limit=10000",supabaseUrl),{headers:adminHeaders}),
      fetch(new URL("/rest/v1/seller_pilot_feedback?select=id,user_id,category,rating,message,status,created_at&order=created_at.desc&limit=500",supabaseUrl),{headers:adminHeaders})
    ]);
    if(!activityResponse.ok || !feedbackResponse.ok) return json({error:"Could not load pilot analytics."},502);
    const activity=await activityResponse.json();
    const feedback=await feedbackResponse.json();
    const bySeller:Record<string,{searches:number;failures:number;last_search:string|null}>={};
    const popular:Record<string,number>={};
    for(const item of activity){
      const entry=bySeller[item.user_id]??{searches:0,failures:0,last_search:null};
      entry.searches++; if(item.result_status!=="success") entry.failures++;
      if(!entry.last_search || item.created_at>entry.last_search) entry.last_search=item.created_at;
      bySeller[item.user_id]=entry;
      const key=String(item.query??"").trim(); if(key) popular[key]=(popular[key]??0)+1;
    }
    return json({ok:true,totals:{searches:activity.length,failures:activity.filter((x:Record<string,unknown>)=>x.result_status!=="success").length,feedback:feedback.length,open_feedback:feedback.filter((x:Record<string,unknown>)=>x.status==="open").length},by_seller:bySeller,popular_queries:Object.entries(popular).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([query,count])=>({query,count})),feedback,activity:activity.slice(0,200)});
  }
  if (body.action === "submit_pilot_feedback") {
    if (typeof body.message !== "string" || body.message.trim().length < 5 || body.message.trim().length > 2000) return json({error:"Feedback must be between 5 and 2,000 characters."},400);
    const category = ["bug","product_feedback","data_quality","other"].includes(String(body.category)) ? body.category : "other";
    const rating = body.rating == null ? null : Number(body.rating);
    if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) return json({error:"Rating must be between 1 and 5."},400);
    const saved=await fetch(new URL("/rest/v1/seller_pilot_feedback",supabaseUrl),{method:"POST",headers:{...adminHeaders,"Content-Type":"application/json",Prefer:"return=representation"},body:JSON.stringify({user_id:userId,category,rating,message:body.message.trim()})});
    if(!saved.ok) return json({error:"Could not submit feedback."},500);
    return json({ok:true,feedback:(await saved.json())[0]});
  }
  if (body.action === "owner_update_feedback") {
    if (!isOwner) return json({error:"Owner permission required."},403);
    const id=Number(body.feedback_id); const status=body.status;
    if(!Number.isInteger(id) || !["open","reviewing","resolved"].includes(String(status))) return json({error:"Invalid feedback update."},400);
    const saved=await fetch(new URL("/rest/v1/seller_pilot_feedback?id=eq."+id,supabaseUrl),{method:"PATCH",headers:{...adminHeaders,"Content-Type":"application/json",Prefer:"return=representation"},body:JSON.stringify({status})});
    if(!saved.ok) return json({error:"Could not update feedback."},500);
    return json({ok:true,feedback:(await saved.json())[0]});
  }
  if (body.action === "get_pilot_status") {
    const accessResponse = await fetch(new URL("/rest/v1/seller_pilot_access?user_id=eq." + encodeURIComponent(userId) + "&select=started_at,ends_at,status,daily_limit,pilot_label", supabaseUrl), { headers: adminHeaders });
    if (!accessResponse.ok) return json({ error: "Could not load your pilot allowance." }, 502);
    const accessRows = await accessResponse.json();
    const access = accessRows?.[0] ?? null;
    if (!access || access.status !== "active" || new Date(access.ends_at) <= new Date()) return json({ active: false, status: access?.status ?? "not_enrolled", ends_at: access?.ends_at ?? null });
    const usageDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(new Date());
    const usageResponse = await fetch(new URL("/rest/v1/seller_pilot_daily_usage?user_id=eq." + encodeURIComponent(userId) + "&usage_date=eq." + usageDate + "&select=searches_used", supabaseUrl), { headers: adminHeaders });
    if (!usageResponse.ok) return json({ error: "Could not load today's pilot usage." }, 502);
    const usageRows = await usageResponse.json();
    const used = Number(usageRows?.[0]?.searches_used ?? 0);
    return json({ active: true, ...access, usage_date: usageDate, searches_used: used, remaining: Math.max(0, Number(access.daily_limit)-used) });
  }
  if (body.action === "activate_seller_pilot") {
    if (!isOwner) return json({ error: "Owner permission required." }, 403);
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const dailyLimit = Number(body.daily_limit ?? 15);
    const label = typeof body.pilot_label === "string" ? body.pilot_label.trim().slice(0,80) : "";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Enter a valid seller email address." }, 400);
    if (![15,20].includes(dailyLimit)) return json({ error: "Pilot daily limit must be 15 or 20." }, 400);
    if (dailyLimit === 20 && label.toLowerCase() !== "beyond shopping") return json({ error: "The 20-search allocation is reserved for Beyond Shopping." }, 400);
    if (dailyLimit === 15 && label.toLowerCase() === "beyond shopping") return json({ error: "Beyond Shopping must use the 20-search allocation." }, 400);
    const usersResponse = await fetch(new URL("/auth/v1/admin/users?page=1&per_page=1000", supabaseUrl), { headers: adminHeaders });
    if (!usersResponse.ok) return json({ error: "Could not look up registered seller accounts." }, 502);
    const usersPayload = await usersResponse.json();
    const users = Array.isArray(usersPayload) ? usersPayload : usersPayload.users ?? [];
    const seller = users.find((candidate: Record<string, unknown>) => String(candidate.email ?? "").toLowerCase() === email);
    if (!seller || typeof seller.id !== "string") return json({ error: "No registered seller account was found for that email. Ask the seller to create their account first." }, 404);
    const activated = await fetch(new URL("/rest/v1/rpc/activate_seller_pilot", supabaseUrl), {
      method: "POST",
      headers: { ...adminHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ p_user_id: seller.id, p_admin_id: userId, p_daily_limit: dailyLimit, p_label: label || null }),
    });
    const result = activated.ok ? await activated.json() : null;
    if (!activated.ok) return json({ error: "Could not activate the seller pilot.", detail: await activated.text() }, 500);
    if (result?.ok !== true) {
      const messages: Record<string,string> = {
        PILOT_CAPACITY_REACHED: "All six pilot seats are occupied.",
        STANDARD_SEATS_FULL: "All five 15-search seller seats are occupied.",
        BEYOND_SHOPPING_SEAT_FULL: "The Beyond Shopping 20-search seat is already assigned.",
        USER_NOT_FOUND: "No registered seller account was found.",
      };
      return json({ error: messages[result?.reason] ?? "Pilot activation was not completed.", result }, 409);
    }
    return json({ ok: true, email, result });
  }
  if (body.action === "list_seller_pilots") {
    if (!isOwner) return json({ error: "Owner permission required." }, 403);
    const [accessResponse, usersResponse] = await Promise.all([
      fetch(new URL("/rest/v1/seller_pilot_access?select=user_id,started_at,ends_at,status,daily_limit,pilot_label&order=created_at.desc", supabaseUrl), { headers: adminHeaders }),
      fetch(new URL("/auth/v1/admin/users?page=1&per_page=1000", supabaseUrl), { headers: adminHeaders }),
    ]);
    if (!accessResponse.ok || !usersResponse.ok) return json({ error: "Could not load pilot seller records." }, 502);
    const access = await accessResponse.json();
    const usersPayload = await usersResponse.json();
    const users = Array.isArray(usersPayload) ? usersPayload : usersPayload.users ?? [];
    const byId = new Map(users.map((candidate: Record<string, unknown>) => [candidate.id, candidate.email]));
    return json({ sellers: (access ?? []).map((row: Record<string, unknown>) => ({ ...row, email: byId.get(row.user_id) ?? null })) });
  }
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
  if (query.length < 2) {
    return json({ error: "Enter at least 2 search characters." }, 400);
  }
  if (testingMarketplaces[marketplace ?? ""]) {
    return json({ error: testingMarketplaces[marketplace ?? ""], code: "MARKETPLACE_TESTING", marketplace }, 501);
  }
  if (!validMarketplaces.includes(marketplace ?? "")) {
    return json({ error: "Choose a supported marketplace." }, 400);
  }
  if (body.force_refresh && !isOwner) return json({ error: "Only the Ekhaya owner can force a live cache refresh." }, 403);

  let pilotCharged = false;
  const pilotUsageDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(new Date());
  if (!isOwner) {
    const pilotReserve = await fetch(new URL("/rest/v1/rpc/reserve_seller_pilot_search", supabaseUrl), {
      method: "POST", headers: { ...adminHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ p_user_id: userId, p_marketplace: marketplace }),
    });
    const pilot = pilotReserve.ok ? await pilotReserve.json() : null;
    if (!pilotReserve.ok) return json({ error: "Could not verify pilot search allowance. Please try again." }, 503);
    if (pilot?.allowed === true) pilotCharged = true;
    else if (pilot?.reason === "PILOT_DAILY_LIMIT") return json({ error: "You have used all your Takealot searches for today. Your allowance resets at midnight South African time.", code: "PILOT_DAILY_LIMIT", usage: pilot }, 429);
    else if (pilot?.reason === "PILOT_EXPIRED") return json({ error: "Your 10-day seller pilot has ended.", code: "PILOT_EXPIRED", usage: pilot }, 402);
    else if (pilot?.reason !== "PILOT_NOT_ACTIVE") return json({ error: "Your seller pilot access is not available for this marketplace.", code: pilot?.reason ?? "PILOT_ACCESS_ERROR", usage: pilot }, 403);
  }

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
      if (pilotCharged) {
        await fetch(new URL("/rest/v1/rpc/refund_seller_pilot_search", supabaseUrl), { method: "POST", headers: { ...adminHeaders, "Content-Type": "application/json" }, body: JSON.stringify({ p_user_id: userId, p_usage_date: pilotUsageDate }) });
        pilotCharged = false;
      }
      return json({ error: "Search limit reached. Please try again in an hour." }, 429);
    }

    const requestId = body.request_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.request_id)
      ? body.request_id : crypto.randomUUID();
    const charged = !isOwner && !pilotCharged;
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
      let payload: Record<string, any>;
      let providerName: string;
      let raw: Record<string, unknown>[];
      if (marketplace === "amazon") {
        if (!steadyApiKey) throw new Error("Amazon South Africa search is not configured yet. Add STEADYAPI_KEY to Supabase Edge Function secrets.");
        const searchUrl = new URL("https://api.steadyapi.com/v1/amazon/products/search");
        searchUrl.searchParams.set("search", query);
        searchUrl.searchParams.set("country", "ZA");
        searchUrl.searchParams.set("sort_by", "RELEVANCE");
        searchUrl.searchParams.set("page", "1");
        const upstream = await fetch(searchUrl, {
          method: "GET",
          headers: { Authorization: `Bearer ${steadyApiKey}`, Accept: "application/json" },
          signal: AbortSignal.timeout(20000),
        });
        payload = await upstream.json();
        if (!upstream.ok || Number(payload?.meta?.status ?? upstream.status) >= 400 || !Array.isArray(payload?.body)) {
          throw new Error(String(payload?.message ?? payload?.error ?? upstream.statusText ?? "SteadyAPI Amazon search failed"));
        }
        const marketplaceUrl = String(payload?.meta?.marketplace ?? "");
        const country = String(payload?.meta?.country ?? "ZA").toUpperCase();
        if ((marketplaceUrl && !marketplaceUrl.includes("amazon.co.za")) || country !== "ZA") {
          throw new Error("SteadyAPI returned a marketplace other than Amazon South Africa; results were rejected.");
        }
        providerName = "steadyapi";
        raw = payload.body as Record<string, unknown>[];
      } else {
        if (!reefKey) throw new Error("Takealot search is not configured. Add REEFAPI_KEY to Supabase Edge Function secrets.");
        const upstream = await fetch("https://api.reefapi.com/takealot/v1/search", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${reefKey}` },
          body: JSON.stringify({ query, country: "za" }),
          signal: AbortSignal.timeout(9000),
        });
        payload = await upstream.json();
        if (!upstream.ok || payload?.ok === false) throw new Error(payload?.error?.message ?? upstream.statusText ?? "Provider lookup failed");
        providerName = "reefapi";
        raw = payload?.data?.results ?? [];
      }

      const parsePrice = (value: unknown): number | null => {
        if (typeof value === "number" && Number.isFinite(value)) return value;
        if (typeof value !== "string") return null;
        const cleaned = value.replace(/,/g, "").replace(/[^0-9.]/g, "");
        if (!cleaned) return null;
        const parsed = Number(cleaned);
        return Number.isFinite(parsed) ? parsed : null;
      };
      const products = raw.map((p: Record<string, unknown>) => {
        const isAmazon = marketplace === "amazon";
        const asin = typeof p.asin === "string" ? p.asin : null;
        return {
          id: isAmazon ? asin : p.plid,
          title: (isAmazon ? p.product_title : p.title) ?? "Untitled product",
          brand: p.brand ?? null,
          price: parsePrice(isAmazon ? p.product_price : p.price),
          original_price: parsePrice(isAmazon ? p.product_original_price : p.original_price),
          currency: "ZAR",
          image: (isAmazon ? p.product_photo : p.image) ?? null,
          url: (isAmazon ? p.product_url : p.url) ?? (asin ? `https://www.amazon.co.za/dp/${asin}` : null),
          in_stock: p.in_stock ?? null,
          rating: isAmazon ? p.product_star_rating ?? null : p.rating ?? null,
          review_count: isAmazon ? p.product_num_ratings ?? null : p.review_count ?? p.rating_count ?? null,
          seller: p.seller_name ?? null,
          delivery: p.delivery ?? null,
          sales_volume: p.sales_volume ?? null,
          product_badge: p.product_badge ?? null,
          is_prime: p.is_prime ?? null,
          is_best_seller: p.is_best_seller ?? null,
          weight_grams: typeof p.weight_grams === "number" ? p.weight_grams : typeof p.weight === "number" ? p.weight : null,
          length_cm: typeof p.length_cm === "number" ? p.length_cm : null,
          width_cm: typeof p.width_cm === "number" ? p.width_cm : null,
          height_cm: typeof p.height_cm === "number" ? p.height_cm : null,
          variant_selection_required: p.variant_selection_required ?? p.has_variations ?? false,
        };
      });
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
          provider: providerName, action: "search", marketplace, lookup_key: `search:${lookupKey}`,
          credits_charged: Number(payload.meta?.charged_credits ?? 0), request_status: "success",
          response_count: products.length, request_id: payload.meta?.request_id ?? null, actor_id: charged ? userId : null,
        }),
      });
      return json({ source: "live", marketplace, fetched_at: now.toISOString(), products, provider_meta: payload.meta ?? null, credit_charged: charged });
    } catch (error) {
      if (marketplace === "takealot" && cache && Array.isArray(cache.source_payload?.products) && cache.source_payload.products.length > 0) {
        return json({ source: "stale-cache", marketplace, fetched_at: cache.fetched_at, products: cache.source_payload.products, refresh_paused: false, warning: "Live Takealot refresh failed; showing the last successfully cached results instead." });
      }
      if (pilotCharged) {
        await fetch(new URL("/rest/v1/rpc/refund_seller_pilot_search", supabaseUrl), {
          method: "POST", headers: { ...adminHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ p_user_id: userId, p_usage_date: pilotUsageDate }),
        });
      }
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
