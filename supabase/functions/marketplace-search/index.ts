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

  let body: { page?: number; user_id?: string; password?: string; status?: string; reason?: string; marketplace?: string; query?: string; request_id?: string; action?: string; cache_ttl_minutes?: number; refresh_enabled?: boolean; force_refresh?: boolean };
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


  if (body.action === "list_users") {
    if (!isOwner) return json({ error: "Owner permission required." }, 403);
    const page = Number.isInteger(body.page) ? Math.max(1, Math.min(20, body.page as number)) : 1;
    const usersResponse = await fetch(new URL(`/auth/v1/admin/users?page=${page}&per_page=100`, supabaseUrl), { headers: adminHeaders });
    if (!usersResponse.ok) return json({ error: "Could not load users." }, 502);
    const usersPayload = await usersResponse.json();
    const authUsers: Array<{ id: string; email?: string; created_at?: string; last_sign_in_at?: string; email_confirmed_at?: string; role: string }> =
      Array.isArray(usersPayload.users) ? usersPayload.users.map((u: Record<string, unknown>) => {
        const metadata = (u.app_metadata ?? {}) as Record<string, unknown>;
        return {
          id: String(u.id ?? ""),
          email: typeof u.email === "string" ? u.email : undefined,
          created_at: typeof u.created_at === "string" ? u.created_at : undefined,
          last_sign_in_at: typeof u.last_sign_in_at === "string" ? u.last_sign_in_at : undefined,
          email_confirmed_at: typeof u.email_confirmed_at === "string" ? u.email_confirmed_at : undefined,
          role: typeof metadata.role === "string" ? metadata.role : "seller",
        };
      }) : [];
    let profileById = new Map<string, { account_status: string; plan_code: string }>();
    if (authUsers.length) {
      const profileUrl = new URL("/rest/v1/profiles", supabaseUrl);
      profileUrl.searchParams.set("id", `in.(${authUsers.map((u: { id: string }) => u.id).join(",")})`);
      profileUrl.searchParams.set("select", "id,account_status,plan_code");
      const profileResponse = await fetch(profileUrl, { headers: adminHeaders });
      if (!profileResponse.ok) return json({ error: "Could not load seller account status." }, 502);
      const profileRows = await profileResponse.json();
      profileById = new Map(profileRows.map((p: { id: string; account_status: string; plan_code: string }) => [p.id, { account_status: p.account_status, plan_code: p.plan_code }]));
    }
    const users = authUsers.map((u: { id: string }) => ({
      ...u,
      account_status: profileById.get(u.id)?.account_status ?? "pending",
      plan_code: profileById.get(u.id)?.plan_code ?? "free",
    }));
    return json({ ok: true, users, page, total: users.length });
  }

  if (body.action === "set_user_status") {
    if (!isOwner) return json({ error: "Owner permission required." }, 403);
    const targetUserId = typeof body.user_id === "string" ? body.user_id : "";
    const newStatus = typeof body.status === "string" ? body.status : "";
    const allowedStatuses = ["pending", "active", "inactive", "suspended"];
    if (!targetUserId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(targetUserId) || !allowedStatuses.includes(newStatus)) {
      return json({ error: "Select a valid seller and account status." }, 400);
    }
    if (targetUserId === userId) return json({ error: "You cannot change your own owner account status." }, 403);

    const targetAuthResponse = await fetch(new URL(`/auth/v1/admin/users/${targetUserId}`, supabaseUrl), { headers: adminHeaders });
    if (!targetAuthResponse.ok) return json({ error: "Could not find the selected user." }, 404);
    const targetAuth = await targetAuthResponse.json();
    const targetMetadata = (targetAuth.app_metadata ?? {}) as Record<string, unknown>;
    if (targetMetadata.role === "owner" || targetMetadata.is_owner === true) {
      return json({ error: "Owner accounts cannot be changed from seller management." }, 403);
    }

    const profileUrl = new URL("/rest/v1/profiles", supabaseUrl);
    profileUrl.searchParams.set("id", `eq.${targetUserId}`);
    profileUrl.searchParams.set("select", "id,account_status");
    const profileResponse = await fetch(profileUrl, { headers: adminHeaders });
    if (!profileResponse.ok) return json({ error: "Could not load the selected seller profile." }, 502);
    const profileRows = await profileResponse.json();
    const profile = profileRows?.[0];
    if (!profile) return json({ error: "The seller profile has not been created yet." }, 404);
    if (profile.account_status === newStatus) return json({ ok: true, user_id: targetUserId, account_status: newStatus, unchanged: true });

    const updateUrl = new URL("/rest/v1/profiles", supabaseUrl);
    updateUrl.searchParams.set("id", `eq.${targetUserId}`);
    const updateResponse = await fetch(updateUrl, {
      method: "PATCH",
      headers: { ...adminHeaders, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ account_status: newStatus, updated_at: new Date().toISOString() }),
    });
    if (!updateResponse.ok) return json({ error: "Could not update seller account status." }, 502);

    const auditResponse = await fetch(new URL("/rest/v1/user_status_events", supabaseUrl), {
      method: "POST",
      headers: { ...adminHeaders, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({
        target_user_id: targetUserId,
        actor_user_id: userId,
        previous_status: profile.account_status,
        new_status: newStatus,
        reason: String(body.reason ?? "Owner account review").slice(0, 240),
      }),
    });
    if (!auditResponse.ok) {
      await fetch(updateUrl, {
        method: "PATCH",
        headers: { ...adminHeaders, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ account_status: profile.account_status, updated_at: new Date().toISOString() }),
      });
      return json({ error: "The status change could not be audited; the previous account status was restored." }, 502);
    }
    return json({ ok: true, user_id: targetUserId, account_status: newStatus });
  }

  if (body.action === "set_user_password") {
    if (!isOwner) return json({ error: "Owner permission required." }, 403);
    const targetUserId = typeof body.user_id === "string" ? body.user_id : "";
    const newPassword = typeof body.password === "string" ? body.password : "";
    if (!targetUserId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(targetUserId)) {
      return json({ error: "Select a valid user." }, 400);
    }
    if (newPassword.length < 12 || newPassword.length > 72) {
      return json({ error: "Password must be between 12 and 72 characters." }, 400);
    }
    const updateResponse = await fetch(new URL(`/auth/v1/admin/users/${targetUserId}`, supabaseUrl), {
      method: "PUT",
      headers: { ...adminHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });
    if (!updateResponse.ok) {
      const detail = await updateResponse.text();
      return json({ error: "Supabase could not update this user's password.", detail }, 502);
    }
    return json({ ok: true, user_id: targetUserId, message: "Password updated successfully." });
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

  const requestId = body.request_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.request_id)
    ? body.request_id : crypto.randomUUID();
  const charged = !isOwner;

  // Rate-limit and reserve a seller credit before serving cached or live results.
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

  if (charged) {
    const reserve = await fetch(new URL("/rest/v1/rpc/reserve_monthly_search_credit", supabaseUrl), {
      method: "POST",
      headers: { ...adminHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ p_user_id: userId, p_marketplace: marketplace, p_request_id: requestId }),
    });
    const reservation = reserve.ok ? await reserve.json() : null;
    if (!reserve.ok || reservation?.allowed !== true) {
      const reason = reservation?.reason ?? "CREDIT_RESERVATION_FAILED";
      return json({ error: reason === "MONTHLY_SEARCH_LIMIT" || reason === "FREE_SEARCH_LIMIT" ? "You have used all your available marketplace search credits." : "Your account or plan is not enabled for live searches.", code: reason, usage: reservation }, 402);
    }
    if (reservation.duplicate) {
      return json({ error: "This search request has already been processed. Please start a new search.", code: "DUPLICATE_REQUEST" }, 409);
    }
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
      const cachedProducts = cache.source_payload?.products ?? [];
      if (charged) {
        const rpc = cachedProducts.length > 0 ? "complete_monthly_search_credit" : "refund_monthly_search_credit";
        const settled = await fetch(new URL(`/rest/v1/rpc/${rpc}`, supabaseUrl), {
          method: "POST",
          headers: { ...adminHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ p_user_id: userId, p_request_id: requestId, p_marketplace: marketplace }),
        });
        if (!settled.ok || await settled.json() !== true) {
          await fetch(new URL("/rest/v1/rpc/refund_monthly_search_credit", supabaseUrl), {
            method: "POST",
            headers: { ...adminHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({ p_user_id: userId, p_request_id: requestId, p_marketplace: marketplace }),
          });
          return json({ error: "Could not safely settle the search credit. Please contact support before retrying.", code: "CREDIT_SETTLEMENT_FAILED" }, 503);
        }
      }
      return json({
        source: fresh ? "cache" : "stale-cache",
        marketplace,
        fetched_at: cache.fetched_at,
        products: cachedProducts,
        credit_charged: charged && cachedProducts.length > 0,
        refresh_paused: !fresh,
      });
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
        const rpc = products.length > 0 ? "complete_monthly_search_credit" : "refund_monthly_search_credit";
        const settled = await fetch(new URL(`/rest/v1/rpc/${rpc}`, supabaseUrl), {
          method: "POST",
          headers: { ...adminHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ p_user_id: userId, p_request_id: requestId, p_marketplace: marketplace }),
        });
        if (!settled.ok || await settled.json() !== true) {
          throw new Error("Could not safely settle the search credit.");
        }
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
      return json({ source: "live", marketplace, fetched_at: now.toISOString(), products, provider_meta: payload.meta ?? null, credit_charged: charged && products.length > 0 });
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
