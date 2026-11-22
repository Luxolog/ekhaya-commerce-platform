# Batch 9 — Repository and Migration Inventory

**Repository:** `Luxolog/ekhaya-commerce-platform`  
**Branch:** `feature/saechamber-public-showcase`  
**PR:** [#33](https://github.com/Luxolog/ekhaya-commerce-platform/pull/33) — OPEN, UNMERGED  
**Audited head:** `e1b61484c5f5da877c76453f555d45373e1526d8`  
**PR base:** `feature/partner-admin-email-otp` at `5cc7edd901b998b180016b4bf1af129fa1182f0e`  
**Production Supabase project:** `itxxnhcjjiynrmivexcb` (read-only metadata/catalog inspection only)

## 1. PR and source identity

- PR #33 is open and unmerged; its base is `feature/partner-admin-email-otp`, not `main`.
- PR metadata reports 236 commits and 56 changed files at the audited head.
- The head and base are separate migration histories. The base branch contains 11 migration files; the PR head contains 20.
- The head migration tree is not a complete representation of the live production migration history. The live project reports 51 applied migration records.
- No PR merge, branch retarget, production write, deployment or paid provider request was performed.

## 2. Branch migration inventory (filename order)

The following 20 files exist under `supabase/migrations/` at the audited PR head:

1. `0001_core_schema.sql`
2. `0002_price_intelligence_cache.sql`
3. `0003_price_intelligence_accounts.sql`
4. `20261111203000_price_search_rate_limit.sql`
5. `20261112010000_monthly_marketplace_search_credits.sql`
6. `20261112020000_owner_cache_policy_and_period_safe_refunds.sql`
7. `20261119180000_seller_pilot_foundation.sql`
8. `20261119190058_six_seller_pilot_limits_10_per_day_5_days.sql`
9. `20261119190203_align_pilot_daily_limit_constraint_to_ten.sql`
10. `20261119190229_reset_pilot_usage_on_reactivation.sql`
11. `20261119211500_enable_makro_marketplace_access.sql`
12. `20261121023000_public_active_referral_partners.sql`
13. `20261121040000_partner_admin_email_otp.sql`
14. `20261122043000_partner_acceptance_notification_details.sql`
15. `20261122090000_partner_support_search_access.sql`
16. `20261122090359_standard_ekhaya_account_ids.sql`
17. `20261122120000_partner_referral_signup_email.sql`
18. `20261122143000_atomic_saechamber_partner_acceptance.sql`
19. `20261122160000_partner_support_cache_hit_refunds.sql`
20. `20261122170000_idempotent_seller_pilot_search_events.sql`

The PR base branch has only these 11 migration files: `0001_core_schema.sql`, `0002_price_intelligence_cache.sql`, `0003_price_intelligence_accounts.sql`, `20261111203000_price_search_rate_limit.sql`, `20261112010000_monthly_marketplace_search_credits.sql`, `20261112020000_owner_cache_policy_and_period_safe_refunds.sql`, `20261119190058_six_seller_pilot_limits_10_per_day_5_days.sql`, `20261119190203_align_pilot_daily_limit_constraint_to_ten.sql`, `20261119190229_reset_pilot_usage_on_reactivation.sql`, `20261119211500_enable_makro_marketplace_access.sql`, and `20261121040000_partner_admin_email_otp.sql`.

## 3. Production migration history comparison (read-only)

The connected production project reports 51 applied migration records, in this order:

| Version | Name |
|---|---|
| 20261111203109 | price_search_rate_limit |
| 20261112033301 | monthly_marketplace_search_credits |
| 20261112034039 | owner_cache_policy_and_period_safe_refunds |
| 20261112124422 | marketplace_access_preferences |
| 20261112134433 | subscription_billing_foundation |
| 20261112135801 | correct_monthly_plan_search_allowances |
| 20261112140024 | simplify_self_service_subscription_tiers |
| 20261112140116 | correct_pro_monthly_search_allowance |
| 20261112153024 | marketplace_early_access_waitlist |
| 20261112154421 | remove_introductory_subscription_fee |
| 20261114065854 | seller_takealot_10_day_pilot_limits |
| 20261114065907 | seller_pilot_search_refund |
| 20261114092931 | reduce_takealot_pilot_to_five_sellers_fifteen_searches |
| 20261114102708 | expand_seller_pilot_to_six_with_daily_tiers |
| 20261114105114 | owner_pilot_operations |
| 20261114192317 | user_approval_status_and_inactivity |
| 20261114192915 | marketplace_identity_and_fraud_monitor |
| 20261114192932 | registration_seller_identity_screening |
| 20261115023056 | enable_pg_net_for_notification_scheduler |
| 20261115025620 | queue_signup_welcome_and_owner_alerts |
| 20261115065935 | queue_subscription_suspended_email |
| 20261115070811 | schedule_vercel_notification_worker |
| 20261115073917 | revoke_public_subscription_notification_rpc |
| 20261115083123 | subscription_only_search_plans |
| 20261115113533 | support_desk_multi_tenant_foundation |
| 20261115114312 | support_desk_private_attachments |
| 20261115114431 | support_desk_tenant_integrity |
| 20261115114446 | support_desk_sequence_scope |
| 20261115171536 | support_desk_role_based_access_controls |
| 20261115171645 | support_desk_internal_message_controls_and_indexes |
| 20261115173542 | support_desk_membership_policy_and_agent_ticket_assignment |
| 20261119181448 | non_expiring_paid_search_credit_allocations |
| 20261119181457 | allocate_paid_search_credits_on_verified_payment |
| 20261119181559 | retain_paid_credit_access_after_cancellation |
| 20261119190058 | six_seller_pilot_limits_10_per_day_5_days |
| 20261119190203 | align_pilot_daily_limit_constraint_to_ten |
| 20261119190229 | reset_pilot_usage_on_reactivation |
| 20261119211157 | enable_makro_marketplace_access |
| 20261121003409 | partner_invitation_contact_personalisation |
| 20261121021942 | public_active_referral_partners |
| 20261121143253 | notify_partner_invitation_accepted |
| 20261121143341 | refine_partner_acceptance_emails |
| 20261122043516 | partner_acceptance_notification_details |
| 20261122043601 | partner_acceptance_notification_newline_format |
| 20261122090359 | standard_ekhaya_account_ids |
| 20261122095920 | partner_referral_signup_email |
| 20261122100610 | activate_all_partner_programs_by_default |
| 20261122101213 | exclude_partner_accounts_from_seller_access_and_self_commission |
| 20261122101222 | make_partner_seller_exclusion_permanent |
| 20261122101243 | deactivate_seller_profile_when_user_becomes_partner |
| 20261122101804 | partner_support_search_access |

### Material migration drift

- Production records `20261121021942_public_active_referral_partners`; the PR head file is `20261121023000_public_active_referral_partners.sql`.
- Production records `20261122043516_partner_acceptance_notification_details`; the PR head file is `20261122043000_partner_acceptance_notification_details.sql`.
- The production history includes billing, support-desk, notification, referral and partner lifecycle migrations not present in the 20-file PR head tree.
- The source branch includes a seller-pilot foundation migration that is absent from the PR base tree and absent as a separate named production migration (the live production objects are present through other history).
- These version/name differences must not be silently treated as equivalent. Reconcile by SQL/object content and provenance, not by similar migration names.

## 4. Live database object inventory (read-only)

The production catalog reports 52 tables across `public` and `private`. The application/business areas represented include:

- Core account and subscription: `profiles`, `subscriptions`, `billing_plans`, `payment_transactions`, `user_notifications`.
- Marketplace/search: `marketplace_connections`, `user_daily_usage`, `marketplace_price_cache`, `marketplace_price_history`, `price_refresh_queue`, `api_usage_ledger`, `price_search_rate_limits`, `plan_search_allowances`, `user_monthly_search_usage`, `search_credit_events`, `marketplace_cache_settings`, `user_free_search_usage`, `search_credit_allocations`.
- Seller pilot and risk: `seller_pilot_access`, `seller_pilot_daily_usage`, `seller_pilot_activity`, `seller_pilot_feedback`, `user_status_events`, `marketplace_seller_identities`, `security_fraud_events`, `security_blocked_email_domains`.
- Support desk: `sd_platform_admins`, `sd_organisations`, `sd_organisation_members`, `sd_departments`, `sd_customers`, `sd_tickets`, `sd_ticket_messages`, `sd_conversations`, `sd_conversation_messages`, `sd_channel_integrations`, `sd_whatsapp_usage_events`, `sd_audit_logs`.
- Partner and privileged access: `partner_programs`, `partner_referrals`, `partner_commission_ledger`, `partner_monthly_statements`, `partner_commission_rate_schedule`, `partner_owner_access`, `partner_invitations`, `account_security_settings`, `email_otp_challenges`, `email_otp_verified_sessions`.
- Private operational tables: `payment_webhook_events`, `billing_notification_queue`, `partner_support_search_usage`.

All 52 tables were enumerated by read-only metadata. The catalog snapshot also returned columns, primary keys and foreign-key constraints; detailed partner/payment constraints, indexes, RLS policies and triggers are recorded in the companion reconciliation report.

## 5. Critical dependency findings

### Partner foundation is missing from the branch migration chain

`20261121023000_public_active_referral_partners.sql` creates `public.get_active_referral_partners()` and immediately selects from `public.partner_programs`. It does not create that table. The PR base/head migration trees contain no migration that creates the current partner foundation.

The following migrations also depend on earlier partner and/or notification objects:

- `20261121040000_partner_admin_email_otp.sql`: partner owner/program/referral/commission/statement/rate/invitation tables, plus OTP settings/challenge/session objects.
- `20261122043000_partner_acceptance_notification_details.sql`: `partner_invitations`, `partner_programs`, `user_notifications`.
- `20261122090000_partner_support_search_access.sql`: `partner_programs`, private schema and partner support usage.
- `20261122120000_partner_referral_signup_email.sql`: partner/referral and notification objects.
- `20261122143000_atomic_saechamber_partner_acceptance.sql`: partner invitation/program/account dependencies.
- Later support-cache and seller-pilot migrations depend on earlier entitlement/usage functions and tables.

### Financial foundation is also absent from the branch migration tree

- The branch has no migration creating `public.payment_transactions`.
- The live table is not a placeholder: it has a UUID primary key, user and optional subscription foreign keys, provider and merchant identifiers, payment kind, billing mode, positive amount, currency, status, paid timestamp, provider response JSON and timestamps.
- Live constraints include unique merchant reference, unique provider/payment ID pair, status/payment-kind/billing-mode checks, and foreign keys to `auth.users` and `subscriptions`.
- The partner commission ledger has a non-null, unique `payment_transaction_id` foreign key to `payment_transactions(id)`. The first-payment trigger reads the payment's `user_id`, `status` and `paid_at`.
- The production migration history includes `subscription_billing_foundation`, but that migration source is absent from the PR head tree. Its full DDL, payment lifecycle functions, webhook idempotency and grants are therefore not reproducible from this branch alone.

## 6. Database functions, triggers and access contracts observed

Relevant live trigger/function relationships include:

- `auth.users` referral capture: `private.capture_partner_referral()` (documented in the standalone partner SQL; verify current live definition and ownership before replay).
- `payment_transactions`: `private.mark_partner_first_payment()`, `private.allocate_search_credits_after_payment()`, and `private.queue_payment_status_notification()`.
- `partner_invitations`: `private.notify_partner_invitation_accepted()`.
- `partner_programs`: `private.ensure_partner_program_active()` and `private.deactivate_partner_seller_profile()`.
- `partner_referrals`: `private.prevent_partner_self_referral()`.
- `partner_commission_ledger`: `private.prevent_partner_owner_commission()`.
- Partner support entitlement: `public.reserve_partner_support_search(uuid,text,uuid,text)`, with a transaction-scoped advisory lock and a 10-search daily cap in Africa/Johannesburg time.
- Privileged partner tables have ownership SELECT policies and a restrictive `email_otp_required_for_privileged_session` policy. Partner and owner visibility is distinct from service-role writes.
- `user_notifications` has unique `(user_id,event_key)` idempotency and user-owned SELECT/UPDATE policies.

The source migration `20261121040000_partner_admin_email_otp.sql` establishes restrictive OTP policies but relies on the partner tables already existing. Notification code relies on the notification unique key. Do not drop or weaken either boundary to make replay pass.

## 7. Frontend and Edge Function database access inventory

The PR's relevant frontend files include:

- `src/app/account/page.tsx`, `src/app/owner/page.tsx`, `src/app/owner/users/page.tsx`
- `src/app/partner/saechamber/page.tsx`, `src/app/partners/saechamber/page.tsx`
- `src/app/price-checker/page.tsx`, `src/app/pricing/page.tsx`, `src/app/services/page.tsx`
- `src/components/EkhayaAuthCallback.tsx`, `src/components/EkhayaReferralAttribution.tsx`

The Price Checker page calls the Supabase REST `profiles` endpoint and invokes `product-identify` and `marketplace-search`. Other pages use shared browser/auth helpers and Edge Function/API routes; direct `.from()` table calls were not detected in the audited page files. Do not infer absence of database access from that pattern alone; complete the helper/API call graph during the next regression pass.

Edge Functions and direct database/RPC dependencies identified from source include:

- `accept-saechamber-partner-invitation`: `partner_invitations`, RPC `accept_saechamber_partner_invitation`.
- `invite-saechamber-partner`: `partner_owner_access`, `account_security_settings`, `email_otp_verified_sessions`, `partner_programs`, `partner_invitations`.
- `partner-admin-email-otp`: `partner_owner_access`, `partner_programs`, `account_security_settings`, `email_otp_verified_sessions`, `email_otp_challenges`.
- `marketplace-search`: search entitlement, cache, pilot, subscription, profile, usage and ledger contracts; inspect its query builder/helpers for exact table list.
- `notification-worker`: notification queue and user-notification contracts.
- `product-identify`: authenticated identification flow and cache/provider contracts.

Production Edge Function metadata was read without fetching secrets or changing deployments. The live function list includes marketplace-search, marketplace-search-test, invite/accept partner, partner-admin-email-otp, notification-worker, paystack-billing and product-identify. Live versions are environment state, not a substitute for version-controlled source.

## 8. Existing tests and workflows

The branch contains these test files:

- `supabase/tests/auth-guards.test.ts`
- `supabase/tests/credit_lifecycle_contract.test.sql`
- `supabase/tests/marketplace-search-entitlements.test.ts`
- `supabase/tests/marketplace-search-relevance.test.ts`
- `supabase/tests/partner-invitation-guards.test.ts`

Relevant workflows:

- `.github/workflows/local-supabase-tests.yml`
- `.github/workflows/quality.yml`
- `.github/workflows/security.yml`

The existing tests do not establish complete partner schema replay, transaction/concurrency integrity, billing/webhook regression or end-to-end email delivery. Batch 8 evidence recorded quality/security passes but the local Supabase stack/replay job failed before the database contract suite ran. This is historical CI evidence, not a fresh run on a newly changed source commit.

## 9. Security observation — action required

The Supabase metadata/advisor response flags RLS disabled on three `private` tables: `private.payment_webhook_events`, `private.billing_notification_queue`, and `private.partner_support_search_usage`. This is a critical advisory. The `private` schema is not the normal exposed `public` Data API schema, so verify schema exposure and role grants before concluding that these tables are reachable by anon/authenticated clients. Do not automatically enable RLS without reviewing worker/service-role access and defining the correct policies. No remediation was applied.

## 10. Milestone 1 conclusion

**Inventory complete as a read-only evidence inventory; migration replay is not certified.** The core defect is not just a missing `partner_programs` CREATE TABLE: the PR migration tree omits the partner foundation and the billing foundation, while production has 51 applied migration records and a larger live schema. The PR base is a feature branch with a materially different and incomplete migration history.

Next: reconcile authoritative object definitions and migration provenance in `partner-schema-authoritative-reconciliation.md`. Do not implement a partner foundation migration until all critical financial and notification dependencies, policies, grants, trigger definitions and clean-install ordering can be reproduced from verified sources.
