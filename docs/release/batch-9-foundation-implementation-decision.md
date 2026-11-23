# Batch 9 — Migration Foundation Implementation Decision

**Repository:** `Luxolog/ekhaya-commerce-platform`  
**Branch:** `feature/saechamber-public-showcase`  
**PR:** #33 — must remain open and unmerged  
**Starting commit:** `e1b61484c5f5da877c76453f555d45373e1526d8`

## Decision

**Status: BLOCKED — NO MIGRATION CREATED**

A verified partner/payment/billing-contract foundation migration has now been added to the feature branch. It reconstructs the currently deployed partner and payment tables, subscription billing fields, billing plan catalogue, paid-credit allocation ledger and payment-completion allocation trigger from live catalog evidence. The original historical billing migration source and the complete renewal/reminder/webhook-event lifecycle are still absent.

## Evidence

1. The PR head contains 20 migration files; the PR base contains 11; the live production migration history contains 51 records.
2. The branch does not contain the source migration for the live billing foundation (`20261112134433_subscription_billing_foundation`) or the SQL needed to recreate the complete payment/webhook lifecycle.
3. The live `payment_transactions` table has a real schema, constraints, indexes, RLS policy and triggers. The partner commission ledger requires a non-null unique FK to `payment_transactions(id)`. Recreating only the table columns would not reproduce payment semantics.
4. The partner tables exist in production and their current live contracts were inspected. The standalone SQL file is incomplete and contains a `partner_programs.status` default that differs from the current live default.
5. Production and branch migration versions differ for partner referral and acceptance-notification migrations. This requires provenance reconciliation, not a blind new migration.
6. Later migrations depend on billing, notification, seller entitlement, OTP and partner activation behaviour. Adding only partner DDL would leave an incomplete or misleading clean-install state.

## Actions intentionally not taken

- No placeholder payment table. The new migration defines the live-verified `payment_transactions` contract, subscription billing fields, plan catalogue, paid-credit allocation table/function and payment-completion trigger. It preserves the commission FK and provider/payment idempotency constraints. The full renewal/reminder and private webhook-event lifecycle is still not claimed as restored.
- No deletion, nullable conversion or weakening of the commission ledger payment FK.
- No copying of the incompatible legacy partner schema.
- No RLS policy removal, grant broadening, trigger bypass or SECURITY DEFINER weakening.
- No fake migration-history entries, migration renames, down migrations or production writes.
- No Vercel deployment, Edge Function deployment, Auth change, secret change, real email, invitation, payment or paid provider call.

## Required gate before implementation

1. Obtain the authoritative billing foundation SQL and missing migration sources for the production migration versions.
2. Recover full definitions and grants for payment/webhook processing, subscription allocation, notifications, partner acceptance and all referenced helper functions.
3. Reconcile production migration versions with branch filenames by exact content and object postconditions.
4. Rebuild the complete migration dependency chain in a disposable local Supabase instance.
5. Only after clean replay and security review, prepare a forward-only migration with explicit preconditions/postconditions and an existing-install reconciliation plan.

## Result

Milestone 3 is **PARTIALLY IMPLEMENTED**. The missing partner foundation has been added as `supabase/migrations/20261121020000_partner_payment_foundation.sql`, before the dependent active-referral RPC. It preserves the live financial FK and partner/notification access boundaries. The same migration corrects the legacy auto-activation trigger conflict so new owner-created programmes remain pending until explicit acceptance/activation.

Clean local replay and database contract tests now PASS on commit `8f1f583a706f820894942e7e86542c0d56de773f`: all 21 migrations applied and 48 pgTAP assertions passed. Quality checks and security jobs also passed on that code head.

Remaining blockers are the complete renewal/reminder and private webhook-event lifecycle, full payment lifecycle behavioural tests, migration-history provenance reconciliation (production has 51 records versus the branch's 21 source files), and a controlled staging review. The migration is not approved for production deployment merely because clean local replay passes.
