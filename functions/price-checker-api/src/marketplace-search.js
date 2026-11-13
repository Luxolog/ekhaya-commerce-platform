import { createHash } from "node:crypto";
import { createCreditService } from "./credit-service.js";
import { createAppwriteCreditStore } from "./appwrite-credit-store.js";
import { loadSellerCreditContext } from "./credit-context.js";

const DATABASE_ID = "ekhaya_price_checker";
const CACHE_TABLE = "marketplace_price_cache";
const VALID_MARKETPLACES = new Set(["takealot", "amazon", "makro"]);

function cacheRowId(marketplace, lookupKey) {
  return `mc_${createHash("sha256").update(JSON.stringify([marketplace, lookupKey])).digest("hex").slice(0, 32)}`;
}

function normalizeProducts(payload, marketplace) {
  const raw = payload?.data?.results;
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 24).map((product) => ({
    id: marketplace === "takealot" ? product.plid ?? null : product.asin ?? null,
    title: typeof product.title === "string" ? product.title : "Untitled product",
    brand: product.brand ?? null,
    price: typeof product.price === "number" ? product.price : null,
    currency: marketplace === "takealot" ? "ZAR" : (product.currency_code ?? "ZAR"),
    image: product.image ?? null,
    url: product.url ?? (typeof product.asin === "string" ? `https://www.amazon.co.za/dp/${product.asin}` : null),
    in_stock: typeof product.in_stock === "boolean" ? product.in_stock : null,
    rating: product.rating ?? null,
    review_count: product.review_count ?? product.rating_count ?? null,
    seller: product.seller_name ?? null,
    variant_selection_required: product.variant_selection_required ?? false,
  }));
}

async function readCache(tablesDB, rowId) {
  try {
    return await tablesDB.getRow({ databaseId: DATABASE_ID, tableId: CACHE_TABLE, rowId });
  } catch (error) {
    if (error?.code === 404 || error?.type === "row_not_found") return null;
    throw error;
  }
}

async function writeCache(tablesDB, rowId, data) {
  try {
    return await tablesDB.createRow({
      databaseId: DATABASE_ID,
      tableId: CACHE_TABLE,
      rowId,
      data,
    });
  } catch (error) {
    // A concurrent request may have created the deterministic cache row first.
    if (error?.code !== 409 && error?.type !== "row_already_exists") throw error;
    return tablesDB.updateRow({
      databaseId: DATABASE_ID,
      tableId: CACHE_TABLE,
      rowId,
      data,
    });
  }
}

export async function handleMarketplaceSearch({ body, authUserId, tablesDB, Query, env = process.env }) {
  const marketplace = body?.marketplace;
  const query = typeof body?.query === "string" ? body.query.trim().replace(/\s+/g, " ").slice(0, 160) : "";
  const requestId = typeof body?.request_id === "string" ? body.request_id : "";

  if (!VALID_MARKETPLACES.has(marketplace) || query.length < 2) {
    return { status: 400, body: { error: "Choose a supported marketplace and enter at least 2 search characters.", code: "INVALID_SEARCH" } };
  }
  if (marketplace === "makro") {
    return { status: 501, body: { error: "Makro live product search is not connected yet.", code: "MARKETPLACE_UNAVAILABLE" } };
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) {
    return { status: 400, body: { error: "A valid request_id UUID is required.", code: "INVALID_REQUEST_ID" } };
  }
  const context = await loadSellerCreditContext({ tablesDB, Query, authUserId, marketplace });
  if (!context.ok) return { status: context.status, body: { error: context.code, code: context.code } };

  const normalizedQuery = query.toLowerCase();
  const lookupKey = `search:${normalizedQuery}`;
  const rowId = cacheRowId(marketplace, lookupKey);
  const now = new Date();
  const cached = await readCache(tablesDB, rowId);
  if (cached && new Date(cached.expires_at).getTime() > now.getTime()) {
    let payload = {};
    try { payload = JSON.parse(cached.source_payload ?? "{}"); } catch { payload = {}; }
    return {
      status: 200,
      body: {
        source: "cache",
        marketplace,
        fetched_at: cached.fetched_at,
        products: Array.isArray(payload.products) ? payload.products : [],
        credit_charged: false,
      },
    };
  }

  if (!env.REEFAPI_KEY) {
    return { status: 503, body: { error: "Marketplace provider is not configured.", code: "PROVIDER_NOT_CONFIGURED" } };
  }

  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const store = createAppwriteCreditStore({ tablesDB, Query });
  const credits = createCreditService(store);
  const reservation = await credits.reserve({
    userId: context.value.userId,
    requestId,
    marketplace,
    periodStart,
    limit: context.value.monthlyLimit,
    now: now.toISOString(),
  });
  if (!reservation.allowed) {
    const status = reservation.reason === "MONTHLY_SEARCH_LIMIT" ? 402 : 400;
    return { status, body: { error: reservation.reason, code: reservation.reason, usage: reservation } };
  }
  if (reservation.duplicate) {
    return { status: 409, body: { error: "This search request has already been processed. Start a new search.", code: "DUPLICATE_REQUEST" } };
  }

  try {
    const provider = marketplace;
    const params = marketplace === "takealot"
      ? { query, country: "za" }
      : { query, marketplace: "co.za", max_results: 24 };
    const upstream = await fetch(`https://api.reefapi.com/${provider}/v1/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.REEFAPI_KEY}` },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(12000),
    });
    let payload;
    try { payload = await upstream.json(); } catch { throw new Error("Marketplace provider returned an invalid response."); }
    if (!upstream.ok || payload?.ok === false) {
      throw new Error(payload?.error?.message ?? `Marketplace provider returned HTTP ${upstream.status}.`);
    }

    const products = normalizeProducts(payload, marketplace);
    const fetchedAt = new Date();
    const expiresAt = new Date(fetchedAt.getTime() + 6 * 60 * 60 * 1000);
    const cacheData = {
      marketplace,
      lookup_key: lookupKey,
      product_title: `Search: ${query}`,
      currency: "ZAR",
      fetched_at: fetchedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      source_payload: JSON.stringify({ products, provider_meta: payload.meta ?? null }),
      updated_at: fetchedAt.toISOString(),
    };
    await writeCache(tablesDB, rowId, cacheData);
    const completed = await credits.complete({
      userId: context.value.userId,
      requestId,
      marketplace,
      now: fetchedAt.toISOString(),
    });
    if (!completed.ok) throw new Error(`Credit completion failed: ${completed.reason}`);

    return {
      status: 200,
      body: {
        source: "live",
        marketplace,
        fetched_at: fetchedAt.toISOString(),
        products,
        provider_meta: payload.meta ?? null,
        credit_charged: true,
        usage: { used: reservation.used, limit: reservation.limit },
      },
    };
  } catch (error) {
    await credits.refund({
      userId: context.value.userId,
      requestId,
      marketplace,
      now: new Date().toISOString(),
    });
    throw error;
  }
}
