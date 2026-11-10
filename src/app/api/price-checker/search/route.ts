import { NextResponse } from "next/server";

export const runtime = "nodejs";

type SearchResult = {
  title: string;
  link: string;
  snippet?: string;
};

type Marketplace = "Amazon SA" | "Takealot" | "Makro";

const MARKETPLACES: { name: Marketplace; domains: string[] }[] = [
  { name: "Amazon SA", domains: ["amazon.co.za"] },
  { name: "Takealot", domains: ["takealot.com"] },
  { name: "Makro", domains: ["makro.co.za"] },
];

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q) return jsonError("Enter a barcode or product name.", 400);
  if (q.length > 180) return jsonError("Search is too long.", 400);

  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) {
    return jsonError(
      "Marketplace lookup is not configured yet. Add SERPAPI_KEY to the server environment to enable live search.",
      503,
    );
  }

  const searches = await Promise.all(
    MARKETPLACES.map(async ({ name, domains }) => {
      const params = new URLSearchParams({
        engine: "google",
        q: `${q} site:${domains.map((domain) => `\${domain}`).join(" OR site:")}`,
        gl: "za",
        hl: "en",
        api_key: apiKey,
        num: "5",
      });

      try {
        const response = await fetch(`https://serpapi.com/search.json?${params}`, {
          cache: "no-store",
        });
        if (!response.ok) return { marketplace: name, results: [], error: "Search source unavailable" };
        const data = (await response.json()) as { organic_results?: SearchResult[] };
        const results = (data.organic_results ?? [])
          .filter((item) => item.title && item.link)
          .slice(0, 5)
          .map((item) => ({
            title: item.title,
            url: item.link,
            snippet: item.snippet ?? "",
            marketplace: name,
            matchType: "candidate" as const,
            checkedAt: new Date().toISOString(),
          }));
        return { marketplace: name, results };
      } catch {
        return { marketplace: name, results: [], error: "Could not reach search source" };
      }
    }),
  );

  return NextResponse.json({
    query: q,
    source: "Google results via SerpApi; results are candidates, not verified exact product matches or official marketplace price feeds.",
    results: searches,
  });
}
