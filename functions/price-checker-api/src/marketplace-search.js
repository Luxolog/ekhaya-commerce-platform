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
    price: typeof product.price === "number" && Number.isFinite(product.price) ? product.price : null,
    currency: marketplace === "takealot" ? "ZAR" : (product.currency_code ?? null),
    image: product.image ?? null,
    url: product.url ?? (typeof product.asin === "string" ? `https://www.amazon.co.za/dp/${product.asin}` : null),
    in_stock: typeof product.in_stock === "boolean" ? product.in_stock : null,
    rating: product.rating ?? null,
    review_count: product.review_count ?? product.rating_count ?? null,
    seller: product.seller_name ?? null,
    variant_selection_required: product.variant_selection_required ?? false,
    price_source: product.price_source ?? "marketplace_api",
    price_is_live: product.price_is_live ?? true,
    price_observed_at: product.price_observed_at ?? null,
  }));
}

// Search-index snippets can contain an explicit Amazon buy-box price, but they
// are not guaranteed to be refreshed at request time. Only publish a numeric
// price when the snippet explicitly contains a rand amount; otherwise return
// a product card with price:null and link to Amazon for confirmation.
export function extractAmazonZarPrice(snippet = "") {
  const text = String(snippet);
  const patterns = [
    /"priceAmount"\s*:\s*([0-9]+(?:\.[0-9]{1,2})?)/i,
    /"displayPrice"\s*:\s*"R\s*([0-9][0-9 ,]*(?:[.,][0-9]{2})?)"/i,
    /\bR\s*([0-9]{1,3}(?:[ ,][0-9]{3})*(?:[.,][0-9]{2}))/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const normalized = match[1].replace(/[ ,]/g, "").replace(",", ".");
    const value = Number(normalized);
    if (Number.isFinite(value) && value > 0 && value < 10_000_000) return value;
  }
  return null;
}

export function normalizeAmazonSearchResults(payload, observedAt = new Date().toISOString()) {
  const rows = Array.isArray(payload?.data?.organic_results) ? payload.data.organic_results : [];
  return rows
    .filter((row) => {
      try { return new URL(row.url).hostname.endsWith("amazon.co.za"); } catch { return false; }
    })
    .slice(0, 24)
    .map((row) => {
      const url = new URL(row.url);
      const asin = url.pathname.match(/\/dp\/([A-Z0-9]{10})(?:\/|$)/i)?.[1] ?? null;
      const snippet = String(row.snippet ?? "");
      const lower = snippet.toLowerCase();
      const image = typeof row.thumbnail === "string" && !row.thumbnail.includes("share-icons/previewdoh/amazon.png")
        ? row.thumbnail : null;
      return {
        id: asin ?? row.url,
        asin,
        title: String(row.title ?? "Amazon.co.za listing").replace(/\s*:\s*Amazon\.co\.za.*$/i, "").trim(),
        brand: null,
        price: extractAmazonZarPrice(snippet),
        currency: "ZAR",
        image,
        url: row.url,
        in_stock: /no featured offers|currently unavailable|out of stock/.test(lower)
          ? false
          : /in stock|only \d+ left|usually shipped|free delivery/.test(lower) ? true : null,
        rating: row.rating?.value ?? null,
        review_count: row.rating?.count ?? null,
        seller: lower.includes("sold by amazon.co.za") ? "Amazon.co.za" : null,
        price_source: "amazon_search_index",
        price_is_live: false,
        price_observed_at: observedAt,
        availability_note: /no featured offers/.test(lower) ? "No featured offer shown in indexed result" : null,
      };
    });
}

async function searchTakealot(query, key) {
  const response = await fetch("https://api.reefapi.com/takealot/v1/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ query, country: "za" }),
    signal: AbortSignal.timeout(12000),
  });
  let payload;
  try { payload = await response.json(); } catch { throw new Error("Takealot provider returned an invalid response."); }
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error?.message ?? `Takealot provider returned HTTP ${response.status}.`);
  return { products: normalizeProducts(payload, "takealot"), source: "takealot_live", providerMeta: payload.meta ?? null, ttlMinutes: 360 };
}

async function searchAmazonZA(query, key) {
  // The dedicated Amazon scraper currently returns TARGET_BLOCKED on amazon.co.za.
  // Brave's ZA search can still find Amazon.co.za product pages and explicit
  // rand buy-box prices in indexed snippets. Never assume USD or invent a price.
  const searchQuery = `site:amazon.co.za ${query}`;
  const response = await fetch("https://api.reefapi.com/brave/v1/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ q: searchQuery, country: "za", page: 1 }),
    signal: AbortSignal.timeout(12000),
  });
  let payload;
  try { payload = await response.json(); } catch { throw new Error("Amazon.co.za search provider returned an invalid response."); }
  if (!response.ok || payload?.ok === false) throw new Error(payload?.error?.message ?? `Amazon.co.za search returned HTTP ${response.status}.`);
  const observedAt = payload.meta?.fetched_at ?? new Date().toISOString();
  const products = normalizeAmazonSearchResults(payload, observedAt);
  return {
    products,
    source: "amazon.co.za_search_index",
    providerMeta: payload.meta ?? null,
    ttlMinutes: 15,
  };
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
    return await tablesDB.createRow({ databaseId: DATABASE_ID, tableId: CACHE_TABLE, rowId, data });
  } catch (error) {
    if (error?.code !== 409 && error?.type !== "row_already_exists") throw error;
    return tablesDB.updateRow({ databaseId: DATABASE_ID, tableId: CACHE_TABLE, rowId, data });
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

  const lookupKey = `search:${query.toLowerCase()}`;
  const rowId = cacheRowId(marketplace, lookupKey);
  const now = new Date();
  const cached = await readCache(tablesDB, rowId);
  if (cached && new Date(cached.expires_at).getTime() > now.getTime()) {
    let payload = {};
    try { payload = JSON.parse(cached.source_payload ?? "{}"); } catch { payload = {}; }
    return {
      status: 200,
      body: {
        source: payload.source ?? "cache",
        marketplace,
        fetched_at: cached.fetched_at,
        products: Array.isArray(payload.products) ? payload.products : [],
        credit_charged: false,
      },
    };
  }

  if (!env.REEFAPI_KEY) return { status: 503, body: { error: "Marketplace provider is not configured.", code: "PROVIDER_NOT_CONFIGURED" } };

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
    const result = marketplace === "amazon"
      ? await searchAmazonZA(query, env.REEFAPI_KEY)
      : await searchTakealot(query, env.REEFAPI_KEY);
    const products = result.products;
    const fetchedAt = new Date();
    const expiresAt = new Date(fetchedAt.getTime() + result.ttlMinutes * 60 * 1000);
    const cacheData = {
      marketplace,
      lookup_key: lookupKey,
      product_title: `Search: ${query}`,
      currency: "ZAR",
      fetched_at: fetchedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      source_payload: JSON.stringify({ products, source: result.source, provider_meta: result.providerMeta }),
      updated_at: fetchedAt.toISOString(),
    };
    await writeCache(tablesDB, rowId, cacheData);
    const completed = await credits.complete({ userId: context.value.userId, requestId, marketplace, now: fetchedAt.toISOString() });
    if (!completed.ok) throw new Error(`Credit completion failed: ${completed.reason}`);

    return {
      status: 200,
      body: {
        source: result.source,
        marketplace,
        fetched_at: fetchedAt.toISOString(),
        products,
        provider_meta: result.providerMeta,
        credit_charged: true,
        usage: { used: reservation.used, limit: reservation.limit },
        price_notice: marketplace === "amazon"
          ? "Amazon.co.za results are sourced from South African search-index snippets. Prices are not guaranteed live; confirm the current price on Amazon before purchasing."
          : undefined,
      },
    };
  } catch (error) {
    await credits.refund({ userId: context.value.userId, requestId, marketplace, now: new Date().toISOString() });
    throw error;
  }
}
