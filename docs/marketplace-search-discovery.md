# Marketplace Search Discovery

## Current implementation status

The search relevance module now provides deterministic query normalisation, bounded query-plan generation and a conditional follow-up selector. These are pure functions and are covered by Deno regression tests.

- Original seller query is preserved as the first candidate.
- Normalised query follows, then brand/model and category-specific candidates.
- Query candidates are deduplicated after token normalisation.
- Query-plan size is clamped to a maximum of four candidates.
- Follow-up selection returns no additional query when at least three ranked results include an exact match with a score of 80 or higher; it permits one follow-up for moderate results and at most two for weak/empty results.

## Important integration limitation

The current `marketplace-search/index.ts` provider orchestration has **not yet been connected** to the discovery-plan functions. Live provider requests still use the single normalised query per marketplace (Amazon retains its existing retry for retryable errors). Therefore the query planner is an implemented and tested foundation, not a live multi-query discovery feature.

Do not describe conditional provider discovery as live until the provider orchestration consumes this plan, evaluates each response, enforces the request budget across retries/follow-ups, and merges/deduplicates listings.

## Provider and seller-credit safeguards

- One monthly search-credit reservation is performed per selected marketplace request, not per provider variation.
- Pilot usage reservation is also per selected marketplace request.
- Additional provider requests must never call seller credit reserve/complete/refund RPCs.
- Provider usage ledger entries must reflect actual provider metadata only. Do not infer ReefAPI costs.
- Existing cache keys currently use the seller query normalised for whitespace/case, plus Makro postal code when present. Semantically equivalent spelling-normalised queries are not yet guaranteed to share cache entries.
- Existing provider adapters and marketplace enablement must be preserved.

## Required next engineering steps

1. Integrate the query plan into each existing ReefAPI adapter without changing endpoint contracts.
2. Apply one explicit per-marketplace request budget, including retries.
3. Evaluate the initial response before selecting follow-ups.
4. Merge and deduplicate listings by stable marketplace identity/URL.
5. Preserve each response's metadata and log actual request/cost metadata per provider response.
6. Treat provider timeouts and partial failures independently; retain successful provider results.
7. Add mocked adapter tests proving request-budget enforcement and exactly one seller-credit lifecycle per selected marketplace.
8. Verify cache reuse and query-key compatibility before changing cache-key semantics.
