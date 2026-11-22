# Marketplace Search Validation

## Branch facts

- Enabled in branch source: Takealot, Amazon South Africa and Makro.
- Disabled for live search: Bob Shop and Leroy Merlin.
- Relevance logic is in `supabase/functions/marketplace-search/search-relevance.ts`.
- Unit tests cover typo correction, brand/category inference, model conflicts, accessory separation, ranking, query-plan bounds and canonical URL/product-ID deduplication within a supplied result set.

## Important discovery gap

The relevance file exports `buildDiscoveryQueries` and `selectAdditionalDiscoveryQueries`. The current `supabase/functions/marketplace-search/index.ts` imports only `understandProductQuery` and `rankMarketplaceProducts`. It does not call either discovery helper.

Therefore **bounded multi-query discovery is not live in provider orchestration**. Existing provider requests use the current normalized query flow; helper tests alone do not establish marketplace-level discovery.

## Credit lifecycle observations

Source includes:
- `reserve_seller_pilot_search`
- `refund_seller_pilot_search`
- `reserve_monthly_search_credit`
- `complete_monthly_search_credit`
- `refund_monthly_search_credit`

The source reserves a pilot search before cache/provider handling and separately reserves monthly credit for applicable non-pilot users. Cache empty-result paths include refunds; successful cache results complete monthly credit. This review did not prove all exceptional paths, concurrency or duplicate refund/completion behaviour with integration tests.

**Do not enable multi-query variations until one seller credit lifecycle per selected marketplace request is demonstrated by deterministic mocked adapter tests.** Provider request budgets and actual provider cost metadata must also be tested; do not infer ReefAPI cost.

## Cache/provider reliability

Existing cache handling and marketplace-specific Makro postal-code logic are present. The current automated tests do not establish:
- concurrent identical request protection end-to-end;
- timeout and retry behaviour for each provider;
- retaining successful provider results when another provider fails;
- provider request accounting across follow-up queries;
- end-to-end credit semantics for cache hits and provider failures.

## Validation decision

Search relevance helpers have unit coverage, but live query discovery and full provider/credit orchestration are not verified. No live marketplace calls were made. No provider cost is asserted.
