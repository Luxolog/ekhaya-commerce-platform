import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Marketplace = "Amazon SA" | "Takealot" | "Makro";

type SearchCandidate = {
  title?: string;
  url?: string;
  snippet?: string;
  summary?: string;
  price?: string;
  source?: string;
  rating?: number;
  ratingCount?: number;
};

const MARKETPLACES: { name: Marketplace; domain: string }[] = [
  { name: "Amazon SA", domain: "amazon.co.za" },
  { name: "Takealot", domain: "takealot.com" },
  { name: "Makro", domain: "makro.co.za" },
];

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function belongsToMarketplace(link: string, domain: string) {
  try {
    const hostname = new URL(link).hostname.toLowerCase();
    return hostname === domain || hostname.endsWith("." + domain);
  } catch {
    return false;
  }
}

function uniqueCandidates(items: SearchCandidate[], domain: string, marketplace: Marketplace) {
  const seen = new Set<string>();

  return items
    .filter((item): item is SearchCandidate & { title: string; url: string } =>
      Boolean(item.title?.trim() && item.url && belongsToMarketplace(item.url, domain)),
    )
    .filter((item) => {
      const normalized = item.url.split("#")[0].replace(/\/$/, "");
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    })
    .slice(0, 5)
    .map((item) => ({
      title: item.title.trim(),
      url: item.url,
      snippet: (item.snippet || item.summary || "").trim(),
      marketplace,
      matchType: "candidate" as const,
    }));
}

async function searchSerperShopping(query: string, domain: string, marketplace: Marketplace) {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) throw new Error("SERPER_NOT_CONFIGURED");

  const response = await fetch("https://google.serper.dev/shopping", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: `${query} site:${domain}`,
      gl: "za",
      hl: "en",
      num: 20,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(response.status === 429 ? "RATE_LIMIT" : response.status === 401 ? "SERPER_UNAUTHORIZED" : `PROVIDER_HTTP_${response.status}`);
  }

  const data = (await response.json()) as {
    shopping?: {
      title?: string;
      link?: string;
      price?: string;
      source?: string;
      delivery?: string;
      rating?: number;
      ratingCount?: number;
    }[];
  };

  const seen = new Set<string>();
  return (data.shopping ?? [])
    .filter((item) => Boolean(item.title?.trim() && item.link && belongsToMarketplace(item.link, domain)))
    .filter((item) => {
      const normalized = item.link!.split("#")[0].replace(/\/$/, "");
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    })
    .slice(0, 5)
    .map((item) => ({
      title: item.title!.trim(),
      url: item.link!,
      snippet: [item.source, item.delivery].filter(Boolean).join(" · "),
      price: item.price ?? null,
      rating: item.rating ?? null,
      ratingCount: item.ratingCount ?? null,
      marketplace,
      matchType: "shopping-candidate" as const,
      priceSource: "Google Shopping result",
    }));
}

async function searchDeepSeek(query: string, domain: string) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_NOT_CONFIGURED");

  const response = await fetch("https://api.deepseek.com/v1/tools/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `${query} site:${domain} lang:en`,
      count: 10,
      need_content: false,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(response.status === 429 ? "RATE_LIMIT" : `PROVIDER_HTTP_${response.status}`);
  }

  const data = (await response.json()) as { results?: SearchCandidate[] };
  return data.results ?? [];
}

async function searchSerpApi(query: string, domain: string) {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) throw new Error("SERPAPI_NOT_CONFIGURED");

  const params = new URLSearchParams({
    engine: "google",
    q: `${query} site:${domain}`,
    gl: "za",
    hl: "en",
    api_key: apiKey,
    num: "10",
  });

  const response = await fetch("https://serpapi.com/search.json?" + params, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(response.status === 429 ? "RATE_LIMIT" : `PROVIDER_HTTP_${response.status}`);
  }

  const data = (await response.json()) as {
    organic_results?: { title?: string; link?: string; snippet?: string }[];
  };

  return (data.organic_results ?? []).map((item) => ({
    title: item.title,
    url: item.link,
    snippet: item.snippet,
  }));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query) return jsonError("Enter a barcode or product name.", 400);
  if (query.length > 180) return jsonError("Search is too long.", 400);

  const configuredProvider = process.env.PRICE_SEARCH_PROVIDER?.toLowerCase();
  const provider =
    configuredProvider === "serper"
      ? "serper"
      : configuredProvider === "serpapi"
        ? "serpapi"
        : configuredProvider === "deepseek"
          ? "deepseek"
          : process.env.SERPER_API_KEY
            ? "serper"
            : process.env.DEEPSEEK_API_KEY
              ? "deepseek"
              : "serpapi";

  if (provider === "serper" && !process.env.SERPER_API_KEY) {
    return jsonError("Serper is selected but SERPER_API_KEY is missing from the server environment.", 503);
  }
  if (provider === "deepseek" && !process.env.DEEPSEEK_API_KEY) {
    return jsonError("DeepSeek is selected but DEEPSEEK_API_KEY is missing from the server environment.", 503);
  }
  if (provider === "serpapi" && !process.env.SERPAPI_KEY) {
    return jsonError("No search provider is configured. Add SERPER_API_KEY, DEEPSEEK_API_KEY or SERPAPI_KEY to the server environment.", 503);
  }

  const groups = await Promise.all(
    MARKETPLACES.map(async ({ name, domain }) => {
      try {
        if (provider === "serper") {
          const results = await searchSerperShopping(query, domain, name);
          return {
            marketplace: name,
            results,
            priceCoverage: results.filter((item) => item.price).length,
          };
        }

        const candidates =
          provider === "deepseek"
            ? await searchDeepSeek(query, domain)
            : await searchSerpApi(query, domain);

        return {
          marketplace: name,
          results: uniqueCandidates(candidates, domain, name),
        };
      } catch (error) {
        const reason = error instanceof Error ? error.message : "UNKNOWN";
        return {
          marketplace: name,
          results: [],
          error:
            reason === "RATE_LIMIT"
              ? "Search limit reached. Try again later."
              : reason === "SERPER_UNAUTHORIZED"
                ? "Serper rejected the API key. Check the server environment variable."
              : reason === "DEEPSEEK_NOT_CONFIGURED" || reason === "SERPAPI_NOT_CONFIGURED" || reason === "SERPER_NOT_CONFIGURED"
                ? "The selected search provider is not configured."
                : "This marketplace search is temporarily unavailable.",
        };
      }
    }),
  );

  return NextResponse.json({
    query,
    checkedAt: new Date().toISOString(),
    provider,
    source:
      provider === "serper"
        ? "Google Shopping results retrieved through Serper. Prices are displayed as returned by the shopping index and must be checked on the retailer page before purchase; availability, variants and final checkout price may differ."
        : provider === "deepseek"
          ? "Search candidates from DeepSeek Search API. Results are not verified exact matches or guaranteed current prices; open each listing to confirm."
          : "Search-engine results via SerpApi. These are candidate listings, not verified exact matches, guaranteed current prices, or official retailer feeds. Open the listing to confirm.",
    results: groups,
  });
}
