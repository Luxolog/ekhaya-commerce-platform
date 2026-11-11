import { NextResponse } from "next/server";

export const runtime = "nodejs";

type TakealotProduct = {
  plid?: string;
  product_id?: number;
  title?: string;
  brand?: string | null;
  url?: string;
  image?: string | null;
  price?: number | null;
  price_max?: number | null;
  currency?: string;
  rating?: number | null;
  review_count?: number | null;
  in_stock?: boolean;
  availability?: string;
  stock_status?: string;
  delivery_estimate?: string | null;
  gtin?: string | null;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function formatZar(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 2,
  }).format(value);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query) return jsonError("Enter a barcode or product name.", 400);
  if (query.length > 180) return jsonError("Search is too long.", 400);

  const apiKey = process.env.REEFAPI_KEY;
  if (!apiKey) {
    return jsonError("Takealot search is not configured yet. Add REEFAPI_KEY to the server environment.", 503);
  }

  try {
    const response = await fetch("https://api.reefapi.com/takealot/v1/search", {
      method: "POST",
      headers: {
        "x-reefapi-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, country: "za", sort: "relevance" }),
      cache: "no-store",
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) {
      const providerMessage = typeof payload?.error === "string" ? payload.error : "";
      const message = response.status === 401 || response.status === 403
        ? "ReefAPI rejected the server key. Check REEFAPI_KEY."
        : response.status === 429
          ? "Takealot search is temporarily rate-limited. Please try again shortly."
          : providerMessage || "Takealot search is temporarily unavailable.";
      return jsonError(message, response.status === 401 || response.status === 403 ? 502 : response.status === 429 ? 503 : 502);
    }

    const data = payload.data ?? {};
    const products: TakealotProduct[] = Array.isArray(data.results) ? data.results : [];
    const results = products.map((product) => ({
      id: product.plid ?? String(product.product_id ?? product.url ?? product.title ?? ""),
      title: product.title?.trim() || "Untitled Takealot listing",
      url: product.url ?? null,
      image: product.image ?? null,
      price: formatZar(product.price),
      priceAmount: typeof product.price === "number" ? product.price : null,
      currency: product.currency ?? "ZAR",
      brand: product.brand ?? null,
      rating: product.rating ?? null,
      ratingCount: product.review_count ?? null,
      inStock: product.in_stock ?? false,
      availability: product.availability ?? "unknown",
      stockStatus: product.stock_status ?? "Availability not confirmed",
      deliveryEstimate: product.delivery_estimate ?? null,
      barcode: product.gtin ?? null,
      marketplace: "Takealot",
      matchType: "live-retailer-listing",
      priceSource: "Live Takealot catalogue via ReefAPI",
    }));

    return NextResponse.json({
      query,
      checkedAt: payload.meta?.fetched_at ?? new Date().toISOString(),
      provider: "reefapi",
      source: "Live Takealot catalogue results retrieved through ReefAPI. Confirm the exact model, variant, stock and checkout price on Takealot before purchasing.",
      results: [
        {
          marketplace: "Takealot",
          results,
          totalResults: data.total_results ?? results.length,
          hasMore: Boolean(data.has_more),
          nextCursor: data.next_cursor ?? null,
          creditsUsed: payload.meta?.charged_credits ?? null,
        },
        {
          marketplace: "Amazon SA",
          results: [],
          unavailable: true,
          message: "Amazon SA integration is not connected yet.",
        },
        {
          marketplace: "Makro",
          results: [],
          unavailable: true,
          message: "Makro integration is not connected yet.",
        },
      ],
      usage: {
        creditsUsed: payload.meta?.charged_credits ?? null,
        cacheHit: Boolean(payload.meta?.cache_hit),
        requestId: payload.meta?.request_id ?? null,
      },
    });
  } catch {
    return jsonError("Could not reach ReefAPI. Please try again.", 502);
  }
}
