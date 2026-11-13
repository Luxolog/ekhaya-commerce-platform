# Appwrite Schema Audit — Initial Findings

**Database:** `ekhaya_price_checker`  
**Appwrite project:** `6af62ccd0026265dd456`  
**Source of truth inspected:** Supabase migrations in `supabase/migrations` on `feature/appwrite-migration`  
**Audit date:** 2026-11-12  
**Status:** Initial structural comparison; not yet a complete constraints/permissions audit.

## Inventory

Appwrite confirms 18 tables. The 18-table inventory exists, but table count alone does not establish schema parity.

## Confirmed discrepancies requiring correction

| Appwrite table | Finding | Required action |
|---|---|---|
| `user_profiles` | Supabase source is `profiles`; mapping to Appwrite is intentional but needs documented ID mapping. The Appwrite profile includes email and marketplace access. | Confirm profile provisioning and stable Appwrite user ID mapping. |
| `marketplace_price_cache` | Missing source columns `variant_label`, `last_error`, and `updated_at`. `source_payload` is a string, while Supabase stores JSONB. | Add missing fields; store and validate JSON serialization, or use a supported structured JSON representation. |
| `subscriptions` | Appwrite `billing_mode` enum is `manual/recurring`; Supabase schema uses `manual/automatic`. Missing `intro_payment_completed_at` and `grace_period_ends_at`. Unique provider/subscription constraint and due index require review. | Align enum and add missing fields/indexes. |
| `monthly_search_usage` | Supabase source table is named `user_monthly_search_usage`. | Document the table mapping and verify all columns/indexes match. |
| `search_credit_events` | Supabase unique key is composite `(user_id, request_id, marketplace)`; Appwrite currently has a unique index on `request_id` alone. | Replace with composite uniqueness to avoid cross-user or cross-marketplace collisions. |
| `marketplace_price_history` | Supabase index orders by marketplace, lookup key, and recorded_at descending; Appwrite index currently only covers marketplace and lookup key. | Add recorded_at to the index with descending order. |
| `price_refresh_queue` | Supabase has a partial unique index for one active row per marketplace/lookup key and a due-order index including priority. Appwrite has only a status/scheduled index. | Implement duplicate-active protection in server logic and review index coverage. |
| `api_usage_ledger` | Supabase includes actor/time and provider/time indexes; Appwrite index set differs. | Align indexes used by owner reporting and audit queries. |
| `payment_transactions` | Appwrite uses `provider`, status `paid`, and lacks `merchant_reference` and `payment_kind`. Supabase source uses `payment_provider`, status `complete`, merchant reference uniqueness, and payment kind. | Align names, statuses, required fields and uniqueness before PayFast integration. |
| `payment_webhook_events` | Appwrite table exists; compare all webhook fields and uniqueness to the private Supabase source. | Verify provider/event id uniqueness and idempotent processing fields. |
| `billing_notification_queue` | Appwrite table exists; Supabase source is private and has a partial due index where sent_at is null. | Keep server-only and verify due queue semantics/indexes. |
| `billing_plans` | Appwrite seed uses intro price 0 while the checked-in migration seed sets 49.00. Current business pricing decisions may have changed since that migration. | Confirm authoritative current intro price before changing live seeded data. |
| `plan_search_allowances` | Supabase allowance migration initially inserts Starter 100 credits; current seeded plan data has the more recent plan allowances. | Confirm current plan/allowance business rules and keep both tables consistent. |

## Other schema risks

- Appwrite tables use row security, but empty table-level permissions do not by themselves prove that authenticated user access is configured correctly.
- Appwrite does not automatically reproduce PostgreSQL CHECK constraints, foreign keys, partial indexes, triggers, stored procedures or transaction semantics.
- Search credit reservation, completion and refunds must be implemented with concurrency-safe server logic. A naive read-then-write sequence can overspend credits.
- The Appwrite schema uses strings for dates such as `usage_date` and `period_start`; this needs consistent ISO date validation.
- Supabase `private` schema tables must remain server-only in Appwrite.
- The 18-table Appwrite inventory may intentionally combine or rename Supabase tables. All mappings must be explicit in migration code and documentation.

## Next actions

1. Resolve the authoritative plan intro price and credit allowances from the current application/business configuration.
2. Apply additive Appwrite schema changes only after the exact mutation APIs and index constraints are verified.
3. Add schema contract tests that compare expected table columns, types, required/default settings and indexes.
4. Implement concurrency-safe credit operations in Appwrite Functions.
5. Run access-control tests with unauthenticated, seller and owner identities before enabling frontend access.

No production Supabase schema or data has been changed by this audit.

## Additive corrections applied to the isolated Appwrite database

The following operations were accepted by Appwrite and subsequently verified with column listing (status `available`):

- `marketplace_price_cache.variant_label` (optional string)
- `marketplace_price_cache.updated_at` (optional datetime)
- `subscriptions.intro_payment_completed_at` (optional datetime)
- `subscriptions.grace_period_ends_at` (optional datetime)
- `payment_transactions.merchant_reference` (optional string)
- `payment_transactions.payment_kind` (optional enum: introductory, renewal, manual_renewal, one_off)
- `payment_transactions.payment_provider` (optional string defaulting to payfast)

A unique index on `payment_transactions.merchant_reference` was accepted by Appwrite and entered processing. Its final availability still needs a follow-up index listing.

**Blocked:** Appwrite rejected adding `marketplace_price_cache.last_error` with `column_limit_exceeded`. The table is at its maximum column/size allowance. Do not try to bypass this by dropping existing fields. Preserve the error in the function log/ledger until a schema redesign or plan limit change is approved.

**Still unresolved:** the `subscriptions.billing_mode` enum remains `manual/recurring`, not the source's `manual/automatic`; the search-credit unique index remains overly restrictive on `request_id` alone; payment status vocabulary remains different (`paid` vs source `complete`); and several source indexes/partial uniqueness rules need server-side equivalents. These are release blockers, not completed parity.


## 2026-11-13 targeted live re-check

The Appwrite TablesDB API was queried directly for the three highest-risk tables. This section supersedes earlier uncertainty where explicitly noted.

- `payment_transactions.merchant_reference_unique` is now **available** (unique index on `merchant_reference`). It is safe to rely on the index's existence, but payment processing is still not implemented.
- `subscriptions` has 16 columns; both `intro_payment_completed_at` and `grace_period_ends_at` are available. Its `billing_mode` enum is still `manual/recurring`, while the source migration defines `manual/automatic`. No destructive enum rewrite was attempted.
- `search_credit_events` has 7 columns and its unique index is still only `request_id`. Source uniqueness is `(user_id, request_id, marketplace)`. This mismatch is a hard blocker for correct idempotency; do not deploy credit reservation until the unique-key behavior is redesigned and tested.
- `payment_transactions` still has the legacy required `provider` column and status enum `created/pending/paid/failed/cancelled/refunded`; the source migration uses `payment_provider` and `complete` rather than `paid`. The additive `payment_provider` and `payment_kind` fields exist, and the merchant-reference unique index is available. The server adapter must normalize provider/status fields consistently before any payment flow is enabled.
- Appwrite currently offers Node.js 22 runtime (`node-22`), matching the function validation workflow's Node 22 toolchain. This confirms runtime availability only; it does not validate the function deployment package or invocation contract.

### Safe implementation constraints

1. Do not remove or rename legacy columns or indexes while the Appwrite database may contain data.
2. Until schema parity is achieved, keep these tables server-only and treat the discrepancies as release blockers.
3. If compatibility mapping is used temporarily, centralize it in a tested adapter; never scatter `recurring`/`automatic` or `paid`/`complete` conversions through handlers.
4. Credit reservation must be atomic or use a concurrency-safe transaction/locking strategy. A preflight duplicate query followed by a separate insert is not sufficient.
5. No Appwrite Functions are deployed as of this check.
