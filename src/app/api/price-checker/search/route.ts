import { NextResponse } from "next/server";

export const runtime = "nodejs";

type SerpResult = {
  title?: string;
  link?: string;
  snippet?: string;
};

type Marketplace = "Amazon SA" | "Takealot" | "Makro";

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query) return jsonError("Enter a barcode or product name.", 400);
  if (query.length > 180) return jsonError("Search is too long.", 400);

  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) {
    return jsonError(
      "Marketplace lookup is not configured yet. Add SERPAPI_KEY to the server environment to enable live search.",
      503,
    );
  }

  // Query each retailer independently so results can be grouped and validated.
  const groups = await Promise.all(
    MARKETPLACES.map(async ({ name, domain }) => {
      const params = new URLSearchParams({
        engine: "google",
        q: query + " site:" + domain,
        gl: "za",
        hl: "en",
        api_key: apiKey,
        num: "5",
      });

      try {
        const response = await fetch("https://serpapi.com/search.json?" + params, {
          cache: "no-store",
        });

        if (!response.ok) {
          return {
            marketplace: name,
            results: [],
            error: response.status === 429
              ? "Search limit reached. Try again later."
              : "This marketplace search is temporarily unavailable.",
          };
        }

        const data = (await response.json()) as {
          organic_results?: SerpResult[];
          error?: string;
        };

        const seen = new Set<string>();
        const results = (data.organic_results ?? [])
          .filter((item): item is SerpResult & { title: string; link: string } =>
            Boolean(item.title?.trim() && item.link && belongsToMarketplace(item.link, domain)),
          )
          .filter((item) => {
            const normalized = item.link.split("#")[0];
            if (seen.has(normalized)) return false;
            seen.add(normalized);
            return true;
          })
          .slice(0, 5)
          .map((item) => ({
            title: item.title.trim(),
            url: item.link,
            snippet: item.snippet?.trim() ?? "",
            marketplace: name,
            matchType: "candidate" as const,
          }));

        return {
          marketplace: name,
          results,
          ...(data.error ? { error: "Search provider returned an error." } : {}),
        };
      } catch {
        return {
          marketplace: name,
          results: [],
          error: "Could not reach the search provider. Check your connection and try again.",
        };
      }
    }),
  );

  return NextResponse.json({
    query,
    checkedAt: new Date().toISOString(),
    source:
      "Search-engine results via SerpApi. These are candidate listings, not verified exact matches, guaranteed current prices, or official retailer feeds. Open the listing to confirm the product and price.",
    results: groups,
  });
}
