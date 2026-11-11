# Ekhaya Commerce Platform

A custom multi-store commerce platform for Ekhaya Scents and future independent merchants.

## Phase 1 — foundation

This repository establishes the application structure and tenancy-first architecture. It is intentionally not connected to production hosting, payment credentials, or customer data yet.

### Planned foundation
- Store-aware routing and configuration
- Separate merchant/store records
- Domain mapping and verification workflow
- Tenant-scoped catalog and orders
- Role-based access and server-side authorization
- PostgreSQL/Supabase integration after schema and access policies are reviewed

## Development

Install Node.js 20+ and run:

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Safety

Never commit API keys, payment secrets, database credentials, customer data, or `.env` files. Production tenant isolation must be enforced in the database—not only in the UI.


## Price Checker search providers

The Price Checker supports Serper Shopping, DeepSeek Search API and SerpApi. Serper is preferred when `SERPER_API_KEY` is configured, unless `PRICE_SEARCH_PROVIDER` explicitly selects another provider.

Add the Serper key to your local `.env.local` file (never commit this file):

```env
PRICE_SEARCH_PROVIDER=serper
SERPER_API_KEY=your_serper_api_key
```

Serper Shopping requests use the South Africa country setting and return structured shopping candidates where Google Shopping has indexed them. The API filters results to Amazon SA, Takealot and Makro domains. A returned shopping price is an indexed price, not a retailer-authoritative quote; the seller must confirm the exact variant, stock, delivery and final checkout price on the retailer page.

Serper Shopping endpoint: `POST https://google.serper.dev/shopping`, authenticated with the `X-API-KEY` header. The implementation issues one query per marketplace, so one customer comparison uses up to three provider queries.

To use DeepSeek instead:

```env
PRICE_SEARCH_PROVIDER=deepseek
DEEPSEEK_API_KEY=your_deepseek_api_key
```

To use SerpApi instead:

```env
PRICE_SEARCH_PROVIDER=serpapi
SERPAPI_KEY=your_serpapi_api_key
```

Restart the Next.js development server after changing environment variables. API keys must remain server-side and must never be committed to Git.
