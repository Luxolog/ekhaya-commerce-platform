# Price Checker subscription limits

## Agreed proposed plans

| Plan | Monthly price | Product comparisons / billing month | Maximum marketplace API calls |
|---|---:|---:|---:|
| Basic | R99 | 50 | 150 |
| Standard | R149 | 100 | 300 |
| Advanced | R199 | 150 | 450 |
| Premium | R249 | 250 | 750 |

A customer-facing product comparison is one allowance unit. The backend fans each new comparison out to three retailer searches: Amazon SA, Takealot and Makro. The customer is not charged three comparison units.

## Usage rules to implement

- Deduct one comparison only after a successful comparison request has produced a usable response.
- If the whole comparison fails, do not deduct allowance.
- If an individual marketplace provider fails, retain the successful marketplace results and expose the partial failure clearly; usage policy for partial results must be consistently applied. Recommended launch rule: count it as one comparison only when at least one marketplace returns a usable listing result.
- Cache identical normalized queries for a short, configurable period to reduce repeated provider calls. A cache hit should not consume a new comparison allowance.
- Enforce usage on the server, per authenticated account and active billing period. Never trust a client-side counter.
- Reset allowances at each subscriber's billing-period boundary, not at the start of each calendar month.
- Unused comparisons do not roll over.
- Premium is capped at 250 comparisons; there is no unlimited tier.
- Log provider calls separately from customer comparison usage so actual API costs can be monitored.

## Release status and prerequisites

The prices and limits are the agreed proposed commercial structure. They are not yet purchasable or enforced. The current MVP has no customer authentication, subscription billing, or durable usage ledger. Before advertising paid plans as active, implement and test:
1. User authentication and account ownership.
2. A durable server-side subscription and usage ledger.
3. Server-side quota checks before starting provider calls, with atomic usage reservation to prevent concurrent requests bypassing limits.
4. Provider-call accounting, cache, and failure/refund handling.
5. Payment gateway integration and verified payment webhooks.
6. Customer billing-period reset and plan-change handling.

Do not rely on browser local storage for quota enforcement. Keep all provider API keys on the server.
