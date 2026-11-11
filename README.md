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


## Price Checker search provider

The Price Checker supports DeepSeek Search API and SerpApi. DeepSeek is preferred when `DEEPSEEK_API_KEY` is configured; SerpApi remains available for comparison.

Add one provider key to your local `.env.local` file (never commit this file):

```env
PRICE_SEARCH_PROVIDER=deepseek
DEEPSEEK_API_KEY=your_deepseek_api_key
```

To compare against SerpApi, switch the provider setting:

```env
PRICE_SEARCH_PROVIDER=serpapi
SERPAPI_KEY=your_serpapi_api_key
```

Restart the Next.js development server after changing environment variables. The search API returns candidate listings only; users must verify the exact product and current retailer price. Search results are not official retailer feeds.
