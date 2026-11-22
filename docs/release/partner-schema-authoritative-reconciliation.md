# Partner Schema — Authoritative Reconciliation (Batch 9)

**Repository:** `Luxolog/ekhaya-commerce-platform`  
**Branch / PR:** `feature/saechamber-public-showcase` / [#33](https://github.com/Luxolog/ekhaya-commerce-platform/pull/33)  
**Audited source head:** `e1b61484c5f5da877c76453f555d45373e1526d8`  
**Production project:** `itxxnhcjjiynrmivexcb`  
**Inspection mode:** read-only Supabase project metadata, migration history, table metadata and PostgreSQL catalog SELECTs. No production mutation was performed.

## 1. Executive finding

The live production catalog is the strongest current evidence for the deployed partner and billing schema. It confirms that the current partner model exists and that the commission ledger is linked to a real `payment_transactions` table. The standalone SQL file `docs/sa-echamber-partner-portal-schema.sql` documents a substantial part of that model, but it is not a complete, ordered migration source for the current PR branch.

The current PR branch has no migration creating `partner_programs`, `partner_invitations`, `partner_owner_access`, `user_notifications` or `payment_transactions`. The live production migration history contains 51 records, while the branch contains only 20 migration files. The live database contains 52 tables. The production history and source migration filenames also differ for partner acceptance/referral migrations.

**Decision:** Milestone 2 has recovered and documented the live object contracts, but migration provenance and a clean-install dependency chain remain unresolved. Milestone 3 must stop: do not create a new foundation migration from partial metadata or invent the missing billing/payment foundation.

## 2. Sources and confidence

| Source | Evidence | Confidence / limitation |
|---|---|---|
| Live production PostgreSQL catalog (read-only) | Columns, data types, nullability, defaults, constraints, indexes, FKs, policies, grants, triggers, function owner/security metadata | Authoritative for the current live shape; does not alone reconstruct the original migration sequence or historical intent |
| Supabase production migration history (read-only) | 51 applied version/name records | Authoritative for recorded versions; source SQL for many records is absent from the PR tree |
| `docs/sa-echamber-partner-portal-schema.sql` | Partner programmes, referrals, commission ledger, statements, rate schedule, referral/payment triggers and policies | Useful deployed-design record; incomplete for invitations, owner access, notifications and payment foundation; some defaults differ from current live state |
| Current PR source/migrations | OTP policies, partner notification and support logic, referral/acceptance flows | Authoritative for current code usage, but assumes earlier schema objects exist |
| Older `partner-program-foundation` branch | Legacy partners/applications/commissions/payouts model | Incompatible; explicitly excluded from current design |

## 2A. Related branch recovery search

The following currently available related branches were inspected by their Git trees:

- `feature/partner-admin-account-routing` — contains the same core/search migration family and the standalone partner schema document; no current partner foundation migration and no payment/billing foundation migration.
- `feature/sa-echamber-partner-portal` — contains the same core/search migration family and the standalone partner schema document; no current partner foundation migration and no payment/billing foundation migration.
- `partner-program-foundation` — contains the legacy `0002_partner_program.sql` model; it is incompatible with the current `partner_programs` / `payment_transactions` model and was excluded.
- PR base `feature/partner-admin-email-otp` — 11 migration files; no partner foundation or billing foundation migration.

A repository-wide GitHub commit search for `subscription_billing_foundation`, `payment_transactions` and `partner_programs` did not return a recoverable source commit. This does not prove no source exists in a deleted/private archive, but no compatible authoritative migration source was recoverable from the currently available repository branches and commit search.

## 3. Entity-by-entity reconciliation

### 3.1 `public.partner_programs`

**Live columns**

| Column | Type | Nullability / default |
|---|---|---|
| id | uuid | NOT NULL, `gen_random_uuid()` |
| partner_name | text | NOT NULL |
| partner_slug | text | NOT NULL |
| referral_code | text | NOT NULL |
| partner_user_id | uuid | NULL |
| status | text | NOT NULL, default `'active'` |
| program_live_at | timestamptz | NULL |
| created_at | timestamptz | NOT NULL, `now()` |
| updated_at | timestamptz | NOT NULL, `now()` |

**Keys and rules**
- Primary key: `id`.
- Unique: `partner_slug`, `referral_code`, and `partner_user_id`.
- FK: `partner_user_id -> auth.users(id) ON DELETE SET NULL`.
- Status check: `pending | active | suspended`.
- Indexes: PK and unique indexes for slug, referral code and partner user.
- RLS enabled. Authenticated SELECT policies: Ekhaya owners via `partner_owner_access`; linked partner via `partner_user_id = auth.uid()`. A restrictive OTP policy applies to all authenticated commands.
- Grants observed: authenticated SELECT; service_role full table privileges; postgres owner privileges.
- Triggers: BEFORE INSERT `private.ensure_partner_program_active()`; AFTER INSERT/UPDATE `private.deactivate_partner_seller_profile()`.
- Trigger functions are owned by postgres. `ensure_partner_program_active()` is SECURITY INVOKER with a non-empty search_path; `deactivate_partner_seller_profile()` is SECURITY DEFINER with empty search_path.

**Drift:** the standalone SQL file declares default status `pending`; live production has default `active`, consistent with production migration `20261122100610_activate_all_partner_programs_by_default`. Owner-created programmes in the current app explicitly start as pending, and later activation is controlled. Do not copy the standalone default blindly.

### 3.2 `public.partner_invitations`

**Live columns:** `id uuid NOT NULL DEFAULT gen_random_uuid()`; `partner_id uuid NOT NULL`; `invited_email text NOT NULL`; `invited_by uuid NOT NULL`; `status text NOT NULL DEFAULT 'pending'`; `invited_at timestamptz NOT NULL DEFAULT now()`; `accepted_at timestamptz NULL`; `expires_at timestamptz NOT NULL DEFAULT now() + interval '14 days'`; `contact_name text NULL`.

**Keys and rules**
- PK: `id`.
- FK: `partner_id -> partner_programs(id) ON DELETE CASCADE`.
- FK: `invited_by -> auth.users(id)`.
- Unique: `(partner_id, invited_email)`.
- Status check: `pending | accepted | expired | revoked`.
- Index: `(partner_id, invited_at DESC)`.
- RLS enabled. Ekhaya-owner SELECT policy; restrictive authenticated OTP policy. Authenticated SELECT grant; service_role full privileges.
- AFTER UPDATE trigger `trg_notify_partner_invitation_accepted` invokes `private.notify_partner_invitation_accepted()`.
- Acceptance logic is additionally implemented through the `accept_saechamber_partner_invitation` RPC and the `accept-saechamber-partner-invitation` Edge Function. The RPC definition and its full privilege contract must be preserved during migration recovery.

### 3.3 `public.partner_owner_access`

**Live columns:** `user_id uuid NOT NULL` (PK); `email text NOT NULL`; `created_at timestamptz NOT NULL DEFAULT now()`.

- FK: `user_id -> auth.users(id) ON DELETE CASCADE`.
- RLS enabled. Authenticated SELECT only for `user_id = auth.uid()`, plus restrictive OTP policy.
- Authenticated SELECT grant; service_role full privileges.
- Edge Functions use this table for owner authorization. Do not broaden client write grants.

### 3.4 `public.user_notifications`

**Live columns:** `id uuid NOT NULL DEFAULT gen_random_uuid()`; `user_id uuid NOT NULL`; `event_key text NOT NULL`; `notification_type text NOT NULL`; `title text NOT NULL`; `message text NOT NULL`; `action_url text NULL`; `email_status text NOT NULL DEFAULT 'not_requested'`; `email_error text NULL`; `email_sent_at timestamptz NULL`; `read_at timestamptz NULL`; `created_at timestamptz NOT NULL DEFAULT now()`; `email_attempted_at timestamptz NULL`.

- PK: `id`; FK `user_id -> auth.users(id) ON DELETE CASCADE`.
- Unique idempotency key: `(user_id, event_key)`.
- Email status check: `not_requested | pending | sent | failed | skipped`.
- Indexes: PK; `(user_id, created_at DESC)`; partial unread index `(user_id, created_at DESC) WHERE read_at IS NULL`.
- RLS enabled. Authenticated users can SELECT their own rows and UPDATE their own rows with both USING and WITH CHECK predicates. Authenticated SELECT/UPDATE grants; service_role full privileges.
- Partner acceptance trigger inserts owner and partner notifications with deterministic event keys and `ON CONFLICT (user_id,event_key) DO NOTHING`.
- Notification worker uses this queue/state contract. Do not remove the unique key or change email status semantics without a separately tested idempotency migration.

### 3.5 `public.payment_transactions` — critical financial dependency

**Live columns**

| Column | Type | Nullability / default |
|---|---|---|
| id | uuid | NOT NULL, `gen_random_uuid()` |
| user_id | uuid | NOT NULL |
| subscription_id | uuid | NULL |
| payment_provider | text | NOT NULL, default `'payfast'` |
| provider_payment_id | text | NULL |
| merchant_reference | text | NOT NULL |
| payment_kind | text | NOT NULL |
| billing_mode | text | NOT NULL |
| amount | numeric | NOT NULL |
| currency | char(3) | NOT NULL, default `'ZAR'` |
| status | text | NOT NULL |
| paid_at | timestamptz | NULL |
| provider_response | jsonb | NOT NULL, default `'{}'::jsonb` |
| created_at | timestamptz | NOT NULL, `now()` |
| updated_at | timestamptz | NOT NULL, `now()` |

**Keys, constraints and indexes**
- PK: `id`.
- FK: `user_id -> auth.users(id) ON DELETE CASCADE`.
- FK: `subscription_id -> subscriptions(id) ON DELETE SET NULL`.
- Positive amount check: `amount > 0`.
- Billing mode check: `manual | automatic`.
- Payment kind check: `introductory | renewal | manual_renewal | one_off`.
- Status check: `created | pending | complete | failed | cancelled | refunded`.
- Unique: `merchant_reference`; `(payment_provider, provider_payment_id)`.
- Indexes: PK; `(subscription_id, created_at DESC)`; `(user_id, created_at DESC)`.
- RLS enabled. Authenticated SELECT only for the current user's rows; service_role full privileges. No client write policy was observed.
- Triggers: AFTER INSERT/UPDATE `private.allocate_search_credits_after_payment()`; AFTER UPDATE `private.queue_payment_status_notification()`; AFTER INSERT/UPDATE `private.mark_partner_first_payment()`.
- `private.mark_partner_first_payment()` is SECURITY DEFINER, postgres-owned, empty search_path, and updates `partner_referrals.first_paid_at` when a payment is complete and has `paid_at`.
- `private.payment_webhook_events` is the provider event/idempotency support table. Its full policy/grant and webhook processing contract must be recovered together with the billing foundation.

**Financial integrity rule:** `partner_commission_ledger.payment_transaction_id` is NOT NULL, UNIQUE and FK-references `payment_transactions(id)`. Do not remove, weaken, nullable-convert or replace this relationship. Do not create a placeholder payment table.

### 3.6 `public.partner_commission_ledger`

**Live columns:** `id uuid PK DEFAULT gen_random_uuid()`; `partner_id uuid NOT NULL`; `referral_id uuid NOT NULL`; `referred_user_id uuid NOT NULL`; `payment_transaction_id uuid NOT NULL UNIQUE`; `payment_month date NOT NULL`; `plan_code text NOT NULL`; `qualifying_amount numeric(12,2) NOT NULL`; `active_referred_sellers integer NOT NULL`; `commission_band smallint NOT NULL`; `commission_rate numeric(5,4) NOT NULL`; `commission_amount numeric(12,2) NOT NULL`; `status text NOT NULL DEFAULT 'pending'`; `paid_at timestamptz NULL`; `created_at timestamptz NOT NULL DEFAULT now()`.

- FKs: partner -> `partner_programs(id)`; referral -> `partner_referrals(id)`; referred user -> `auth.users(id)`; payment transaction -> `payment_transactions(id)`.
- Checks: qualifying amount and commission amount >= 0; active referred sellers >= 1; commission band 1–4; commission rate 0–0.20; status `pending | approved | paid | reversed`.
- Indexes: PK; unique payment transaction; `(partner_id, payment_month)`.
- RLS enabled. SELECT policies for linked partner and Ekhaya owners; restrictive OTP policy. Authenticated SELECT; service_role full privileges.
- BEFORE INSERT/UPDATE trigger `prevent_partner_owner_commission` invokes `private.prevent_partner_owner_commission()`, preventing self/owner commission. Preserve this financial guard.

### 3.7 `public.partner_monthly_statements`

**Live columns:** `id uuid PK DEFAULT gen_random_uuid()`; `partner_id uuid NOT NULL`; `statement_month date NOT NULL`; `active_referred_sellers integer NOT NULL DEFAULT 0`; `qualifying_revenue numeric(12,2) NOT NULL DEFAULT 0`; `commission_total numeric(12,2) NOT NULL DEFAULT 0`; `adjustment_total numeric(12,2) NOT NULL DEFAULT 0`; `payment_due_date date NOT NULL`; `status text NOT NULL DEFAULT 'prepared'`; `paid_at timestamptz NULL`; `created_at timestamptz NOT NULL DEFAULT now()`.

- FK: `partner_id -> partner_programs(id)`.
- Unique: `(partner_id, statement_month)`.
- Status check: `prepared | approved | paid`.
- RLS enabled. Partner-own and Ekhaya-owner SELECT policies plus restrictive OTP policy. Authenticated SELECT; service_role full privileges.
- No statement-generation or payment-settlement trigger was observed on this table in the targeted trigger inventory. Do not infer the calculation or payment workflow from its columns.

### 3.8 Referral attribution

The live `partner_referrals` table contains `id`, `partner_id`, `referred_user_id`, `referral_code`, `registered_at`, `first_paid_at`, `created_at`.

- PK: `id`.
- FKs: `partner_id -> partner_programs(id)`; `referred_user_id -> auth.users(id) ON DELETE CASCADE`.
- Unique: `referred_user_id` (one attribution row per referred user).
- Index: `(partner_id, registered_at)`.
- RLS enabled. Partner-own and Ekhaya-owner SELECT policies plus restrictive OTP policy. Authenticated SELECT; service_role full privileges.
- `private.capture_partner_referral()` is owned by postgres, SECURITY DEFINER, empty search_path. The standalone schema defines an AFTER INSERT trigger on `auth.users`; the live trigger should be preserved and verified by replay.
- `private.prevent_partner_self_referral()` is a postgres-owned SECURITY DEFINER trigger function on INSERT/UPDATE of `partner_referrals`.
- First paid timestamp is set by `private.mark_partner_first_payment()` from completed payment rows.

## 4. Cross-cutting policies, grants and ownership

- All eight listed public partner/billing tables have RLS enabled in the live catalog.
- Partner/owner table SELECT access is row-scoped by partner linkage or membership in `partner_owner_access`.
- Privileged partner tables also have a restrictive `email_otp_required_for_privileged_session` policy for authenticated access; this policy denies unless `private.email_otp_gate_passed()` is true.
- `private.email_otp_gate_passed()` is SECURITY DEFINER, owned by postgres, with empty search_path. It checks account OTP settings and the current session's verified-session row.
- Service-role writes are used for owner workflows and system processing. Authenticated users receive SELECT only on partner tables, except the explicit user-owned notification UPDATE and notification SELECT policies.
- Function owners for the inspected partner trigger/RPC functions are postgres. Preserve SECURITY DEFINER status only where it exists and preserve safe search_path configuration. Do not introduce broader function EXECUTE grants.

## 5. Notification and invitation idempotency

- Invitation acceptance notifications are emitted only on a transition into `accepted`; the trigger checks old/new status.
- Owner and partner notification keys are deterministic per invitation and protected by `UNIQUE(user_id,event_key)`.
- Both notification inserts use `ON CONFLICT DO NOTHING`.
- The same notification record supports in-app visibility and asynchronous email delivery via `email_status`; do not create duplicate notifications or bypass the worker's status transitions.

## 6. Exact unresolved items blocking a migration

1. **Missing billing foundation migration source.** Production history records `20261112134433_subscription_billing_foundation`, but the PR branch tree contains no corresponding source. The live payment table shape is known, but the full original migration chain, webhook event processing, payment status transition functions, subscription linkage, ownership, grants, and any dependent objects are not recoverable from the PR tree alone.
2. **Production migration history is not represented in this branch.** Production has 51 migration records; PR head has 20 migration files. Multiple support desk, billing, notification and seller entitlement migrations are missing from the source branch. A one-off partner migration would not make a clean database equivalent to production.
3. **Version/name drift.** Production versions for public referral partner and acceptance notification migrations differ from the source filenames. Reconcile exact SQL hashes/content and migration provenance before deciding whether to add, rename or supersede anything.
4. **Current partner schema is partly hand-documented.** The standalone schema has no invitation, owner-access or notification table DDL and its partner programme status default differs from live production. The production migrations `20261122100610` onward also change partner activation and seller exclusion semantics.
5. **RPC/function source and dependency completeness.** Recover complete definitions and grants for `accept_saechamber_partner_invitation`, `private.allocate_search_credits_after_payment()`, `private.queue_payment_status_notification()`, and the notification worker queue functions, plus all dependent tables/sequences before constructing a clean-install migration.
6. **Production migration history cannot be used to mark local migrations applied.** Never fake migration history or copy a production migration record into a new database without executing and verifying its actual SQL.

## 7. Security advisory requiring a separate decision

The Supabase advisor flagged RLS disabled on:
- `private.payment_webhook_events`
- `private.billing_notification_queue`
- `private.partner_support_search_usage`

This is a critical advisor result. These tables are in the `private` schema, so confirm exposed-schema configuration and role grants before treating them as publicly reachable. Do not auto-enable RLS: first recover the worker/service-role access pattern and define policies that preserve the intended server-side processing. No security change was applied in this batch.

## 8. Milestone 2 / Milestone 3 decision

**Milestone 2 — PARTIALLY COMPLETE (schema contracts recovered; source provenance incomplete).** The live partner, notification and payment object shapes, constraints, indexes, FKs, RLS policies, grants, trigger relationships and function ownership have been inspected and recorded. This is sufficient to identify the exact gaps; it is not sufficient to claim a reproducible migration source.

**Milestone 3 — BLOCKED / NOT IMPLEMENTED.** No migration file was created. The missing payment/billing migration chain and the 31-record production-vs-head migration gap make a fabricated or partial foundation unsafe. The existing `payment_transactions` FK and partner/OTP/RLS/idempotency protections remain untouched.

### Required next evidence

- Retrieve and review the authoritative SQL for the production billing foundation and missing production migration versions from a controlled source (repository history/branch or a schema-only dump approved for read-only transfer).
- Recover full function definitions and privileges for payment/webhook/notification processing and partner acceptance.
- Reconcile migration version drift against object definitions and the production history.
- Assemble the complete dependency chain in a disposable local Supabase environment; only then design a forward-only migration and prove empty-database replay.


## 9. Batch 9 implementation update

Commit: `924775d32a88f55090601ae5fc0ba70706a9a233`.

A forward-only branch migration, `supabase/migrations/20261121020000_partner_payment_foundation.sql`, now establishes the verified partner/payment schema before `20261121023000_public_active_referral_partners.sql`. It uses the live catalog's current columns, keys, constraints, indexes, RLS policies and grants, and the documented current partner trigger/notification logic. It does not create a substitute payment table or weaken the commission foreign key.

The migration also removes the conflicting `ensure_partner_program_active_before_insert` trigger. Live catalog inspection showed that trigger forced all newly inserted partner programmes to active, while the current owner-registration service creates them pending and the activation endpoint explicitly requires accepted invitation + linked account. The forward migration therefore preserves the current application workflow: a newly registered programme remains pending until the explicit activation action. This change is branch-only and has not been applied to production.

A pgTAP test file, `supabase/tests/partner-foundation.test.sql`, covers table existence, RLS, commission-payment FK uniqueness, notification idempotency, service-role write access and pending-by-default behaviour.

**Important remaining limit:** this migration restores the table needed by partner commission integrity, but does not recreate the complete production subscription billing/webhook/paid-credit allocation subsystem. The original `subscription_billing_foundation` migration source and the `allocate_search_credits_after_payment` dependency chain remain absent. Do not call the full billing foundation restored until those migrations/functions and their tests are added. Local migration replay and pgTAP results are still pending final CI confirmation.
