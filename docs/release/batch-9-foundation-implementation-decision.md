# Batch 9 — Migration Foundation Implementation Decision

**Repository:** `Luxolog/ekhaya-commerce-platform`  
**Branch:** `feature/saechamber-public-showcase`  
**PR:** #33 — must remain open and unmerged  
**Starting commit:** `e1b61484c5f5da877c76453f555d45373e1526d8`

## Decision

**Status: BLOCKED — NO MIGRATION CREATED**

A verified partner/payment-table foundation migration has now been added to the feature branch. The complete subscription billing/webhook/paid-credit foundation remains blocked because its original source chain and dependencies are not all present in this repository.

## Evidence

1. The PR head contains 20 migration files; the PR base contains 11; the live production migration history contains 51 records.
2. The branch does not contain the source migration for the live billing foundation (`20261112134433_subscription_billing_foundation`) or the SQL needed to recreate the complete payment/webhook lifecycle.
3. The live `payment_transactions` table has a real schema, constraints, indexes, RLS policy and triggers. The partner commission ledger requires a non-null unique FK to `payment_transactions(id)`. Recreating only the table columns would not reproduce payment semantics.
4. The partner tables exist in production and their current live contracts were inspected. The standalone SQL file is incomplete and contains a `partner_programs.status` default that differs from the current live default.
5. Production and branch migration versions differ for partner referral and acceptance-notification migrations. This requires provenance reconciliation, not a blind new migration.
6. Later migrations depend on billing, notification, seller entitlement, OTP and partner activation behaviour. Adding only partner DDL would leave an incomplete or misleading clean-install state.

## Actions intentionally not taken

- No placeholder payment table. The new migration defines the live-verified `payment_transactions` contract and preserves its constraints and commission FK. The complete billing lifecycle is still not claimed as restored.
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

The full payment/webhook/paid-credit allocation subsystem and complete production migration-history reconciliation remain blockers. The migration is not approved for production deployment until clean local replay, pgTAP, payment lifecycle regression and migration-history reconciliation are complete.
