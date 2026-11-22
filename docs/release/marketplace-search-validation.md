# Marketplace Search Validation

## Branch facts

- Enabled in branch source: Takealot, Amazon South Africa and Makro.
- Disabled for live search: Bob Shop and Leroy Merlin.
- Relevance logic is in `supabase/functions/marketplace-search/search-relevance.ts`.
- Unit tests cover typo correction, brand/category inference, model conflicts, accessory separation, ranking, query-plan bounds and canonical URL/product-ID deduplication within a supplied result set.

## Important discovery gap

The relevance file exports `buildDiscoveryQueries` and `selectAdditionalDiscoveryQueries`. `supabase/functions/marketplace-search/index.ts` now imports and calls `selectAdditionalDiscoveryQueries` in the Takealot provider path. It runs one initial query and at most two targeted follow-ups, re-ranking after each response and preserving successful results if a follow-up fails.

This is implemented in branch source, not verified against a live ReefAPI service. Existing tests cover the query-selection helper, but mocked provider-orchestration tests are still required.

## Credit lifecycle observations

Source includes:
- `reserve_seller_pilot_search`
- `refund_seller_pilot_search`
- `reserve_monthly_search_credit`
- `complete_monthly_search_credit`
- `refund_monthly_search_credit`

The source currently reserves pilot or partner-support allowance before cache lookup, then releases those reservations on cache hits. Monthly seller credits are not reserved for cache hits; they are reserved on the live cache-miss path. A new service-role-only RPC migration releases partner support usage for a cache hit. The monthly refund migration records the original period and refunds that period. These source paths still need isolated database tests, including failure to release a partner allowance.

Takealot discovery is now enabled in branch source with one logical seller reservation and at most three provider attempts. Each Takealot attempt is written to the provider usage ledger separately, retaining provider request ID and reported charged credits when returned. No live provider cost is asserted. Add deterministic mocked adapter tests before production deployment.

## Cache/provider reliability

Existing cache handling and marketplace-specific Makro postal-code logic are present. The current automated tests do not establish:
- concurrent identical request protection end-to-end;
- timeout and retry behaviour for each provider;
- retaining successful provider results when another provider fails;
- provider request accounting across follow-up queries (source records each Takealot attempt; not yet integration-tested);
- end-to-end credit semantics for cache hits and provider failures.

## Validation decision

Search relevance helpers have unit coverage, but live query discovery and full provider/credit orchestration are not verified. No live marketplace calls were made. No provider cost is asserted.
