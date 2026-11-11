# Shared marketplace price cache

## Policy

The cache is shared across all customers. A cache key is the marketplace plus the exact listing identifier (ASIN for Amazon, PLID/marketplace listing ID for Takealot) or a normalized search key. Never merge different variants or pack sizes solely because their titles look similar.

| Demand over the last 24 hours | Tier | Default TTL |
| --- | --- | ---: |
| 50+ searches | Popular | 30 minutes |
| 5–49 searches | Regular | 6 hours |
| 0–4 searches | Inactive | 24 hours |

Manual refresh has a 15-minute per-customer/product cooldown in the product policy. The server must also enforce a shared per-listing cooldown to prevent simultaneous customers from triggering duplicate provider calls.

## Request flow

1. Look up the shared cache using marketplace and exact listing/lookup key.
2. If fresh, return it immediately and record a cache-hit ledger event.
3. If expired, return the last successful value marked stale and enqueue one refresh job.
4. A worker claims jobs transactionally with row-level locking and SKIP LOCKED.
5. On provider success, normalize price, currency, stock, seller, variant, URL and fetched timestamp; update the cache and ledger.
6. Append history only when a meaningful value changes.
7. On provider failure, preserve the last good cache value, record the error and ledger event, and apply retry backoff.

## Cost controls

- Prefer batch endpoints when supported. Takealot batch lookup is more credit-efficient than one call per listing.
- Refresh products that customers actually search or save; do not crawl entire marketplaces.
- Keep search-result cache separate from exact listing-detail cache.
- Record provider action, charged credits, response count and request ID for reconciliation.
- Do not charge a customer for a shared cache hit. Apply plan quotas to live searches/refreshes at the application layer.

## Data quality

A matching GTIN is a candidate match, not proof that two listings are identical. Confirm model, pack size, colour, size and other material variants. Show source marketplace, seller where available, currency, listing link and exact last-checked timestamp. Prices are indicative and should be verified on the marketplace before purchasing.

## Database

Apply supabase/migrations/0002_price_intelligence_cache.sql after the reviewed core schema. Cache, queue, history and usage tables are restricted to the Supabase service_role; do not expose them directly to browser clients.
