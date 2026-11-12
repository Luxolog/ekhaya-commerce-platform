# Marketplace data integrity and Makro integration plan

## Current customer-facing capability

- Takealot and Amazon South Africa are the currently enabled live-search providers.
- Search results are sourced through the configured ReefAPI integration and cached centrally.
- Cached results are clearly distinguished from live results.
- Profit calculations are estimates, not guaranteed marketplace settlement values.
- Makro is visible as a planned integration, but is not selectable as a live-search provider until an authorised and tested data source is approved.

## Makro safeguards

1. Do not scrape Makro pages or use undocumented endpoints as a production data source.
2. Do not display a Makro price, listing, seller, stock quantity, or availability unless it comes from an authorised source and has a recorded retrieval time.
3. Until access is approved, show the status as **Not connected — authorised data access pending**.
4. Do not charge seller search credits or make ReefAPI calls for Makro while its provider adapter is unavailable.
5. Do not substitute Takealot or Amazon products and label them as Makro results.
6. When a Makro source becomes available, distinguish seller-offer inventory from general retail stock. Availability may depend on fulfilment method, fulfilment centre, delivery area, and the buyer's location.

## Provider adapter contract

Implement Makro behind the same marketplace provider boundary used by Takealot and Amazon. The adapter should return a normalised product record only when the source supports the requested fields:

- marketplace product identifier / FSN where available
- title, brand, image and canonical product URL
- current displayed selling price and currency
- seller / offer identity where available
- stock or availability status, including the scope and location to which it applies
- fulfilment method
- source timestamp and source attribution

If a field is not supplied by the authorised source, return null and render it as unconfirmed. Never infer stock from a listing being visible.

## Activation checklist

- Obtain written confirmation from Makro about permitted API access and intended use.
- Obtain the current API specification, authentication method, rate limits and sandbox/test credentials if available.
- Confirm whether the API exposes public catalogue search, seller-specific offers, stock, or only seller inventory updates.
- Confirm whether price and availability are location- or fulfilment-specific.
- Build and test the adapter against approved endpoints.
- Validate category fees and fulfilment costs separately before including Makro profit estimates.
- Run end-to-end tests for cache hits, live requests, provider failures, stale data, and credit accounting.
- Enable the Makro selector only after the above checks pass.

## Demo positioning

The current demo should show live Takealot and Amazon comparisons and the same buying-price/profitability workflow. Makro should appear as **Integration planned**. This demonstrates the product roadmap without implying a working Makro connection.
