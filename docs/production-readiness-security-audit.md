# Production Readiness Security Audit

**Audit date:** 2026-11-22  
**Supabase project:** `itxxnhcjjiynrmivexcb`  
**Repository branch:** `feature/saechamber-public-showcase`  
**Pull request:** #33 (base: `feature/partner-admin-email-otp`)  
**Scope:** Read-only review. No production settings, grants, policies, migrations, or Edge Functions were changed by this audit.

## Executive result

**Release decision: NOT READY.**

The live Supabase security advisor reports:
- 22 public tables with RLS enabled but no policies (INFO).
- `public.get_active_referral_partners()` executable by `anon` and `authenticated` while SECURITY DEFINER (WARN).
- Leaked-password protection disabled (WARN).
- RLS disabled on `private.payment_webhook_events` and `private.billing_notification_queue` (CRITICAL advisor finding).

The direct privilege checks materially qualify the private-table finding: `anon` has no USAGE on schema `private`; neither `anon` nor `authenticated` has SELECT on either private table; both tables grant their table privileges to `postgres` and `service_role`. `authenticated` does have schema USAGE, but no table SELECT. This means the advisor's statement that the two tables are currently fully exposed through anon/authenticated client roles is not supported by the direct grants checked in this audit. The RLS-disabled condition remains a defence-in-depth issue and should be corrected through a reviewed migration after dependent access paths are verified.

## 1. The 22 public tables with RLS enabled and no policies

All 22 were confirmed to:
- Be owned by `postgres`.
- Have RLS enabled.
- Have no table-specific RLS policies.
- Have direct table grants to `postgres` and `service_role` only in the inspected grant listing.
- Have no direct table grants to `anon` or `authenticated`.

| Table | Intended classification from schema/name | Direct client grant observed |
|---|---|---|
| `account_security_settings` | Account security / OTP configuration | None |
| `api_usage_ledger` | Internal usage accounting | None |
| `email_otp_challenges` | Short-lived authentication challenges | None |
| `email_otp_verified_sessions` | Verified session state | None |
| `marketplace_cache_settings` | Internal marketplace configuration | None |
| `marketplace_early_access_waitlist` | Waitlist / lead records | None |
| `marketplace_price_cache` | Marketplace data cache | None |
| `marketplace_price_history` | Marketplace price history | None |
| `marketplace_seller_identities` | Seller identity screening | None |
| `plan_search_allowances` | Subscription allowance configuration | None |
| `price_refresh_queue` | Internal refresh queue | None |
| `price_search_rate_limits` | Abuse / rate-limit state | None |
| `search_credit_events` | Credit ledger events | None |
| `security_blocked_email_domains` | Fraud/security controls | None |
| `security_fraud_events` | Fraud/security event records | None |
| `seller_pilot_access` | Pilot access controls | None |
| `seller_pilot_activity` | Pilot activity records | None |
| `seller_pilot_daily_usage` | Pilot usage counters | None |
| `seller_pilot_feedback` | Pilot feedback | None |
| `user_free_search_usage` | User usage counters | None |
| `user_monthly_search_usage` | User usage counters | None |
| `user_status_events` | Account status history | None |

**Assessment:** The linter's INFO finding is not, by itself, evidence that these tables are publicly readable. With RLS enabled, no policies and no direct anon/authenticated table grants, ordinary Data API access is denied. The names and current grants indicate these are intended to be backend/service-role-managed tables. Do not add blanket user policies. Revisit any table only if a future feature deliberately needs direct client access, and then design an ownership/role predicate for that specific table.

## 2. Private tables with RLS disabled

| Table | Owner | RLS | Direct grants observed |
|---|---|---:|---|
| `private.payment_webhook_events` | postgres | Disabled | postgres, service_role |
| `private.billing_notification_queue` | postgres | Disabled | postgres, service_role |

Role checks:
- `anon`: no USAGE on `private`; no SELECT on either table.
- `authenticated`: USAGE on `private`; no SELECT on either table.
- `service_role`: SELECT granted on both tables and role has BYPASSRLS.
- `postgres`: BYPASSRLS.

**Recommended follow-up:** Add RLS to both private tables as defence in depth after confirming all access paths. No anon/authenticated policies are indicated by the current grants. The service role bypasses RLS, so service-role workers should retain their current table access. This audit did not apply the advisor's remediation SQL or alter production.

Proposed SQL for owner review only:

```sql
ALTER TABLE private.payment_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.billing_notification_queue ENABLE ROW LEVEL SECURITY;
```

Before running it, confirm that no non-service-role worker or function depends on direct table access. Verify the webhook processor and notification worker using the service role in a non-production environment first.

## 3. Public referral function

Live definition inspected:

- Function: `public.get_active_referral_partners()`
- Owner: `postgres`
- SECURITY DEFINER: yes
- Search path: empty (`search_path = ''`)
- Table reference: explicitly qualified as `public.partner_programs`
- Filter: `status = 'active'`
- Returned columns: `id`, `partner_name`, `partner_slug`, `referral_code`
- EXECUTE: `anon` = yes; `authenticated` = yes.

The account signup page calls this RPC to populate the partner selector and resolve an incoming referral code. This is an intentional public referral-catalog use case. The function exposes only the four named referral fields for active partner programmes, not the full partner table. Its empty search path and schema-qualified relation are positive hardening measures.

**Decision:** Keep the public RPC for now; do not revoke anon access because that would break referral-code discovery during public signup. Keep the explicit grant model (revoke PUBLIC, grant anon/authenticated) and add regression coverage proving only active partner rows and the approved four fields are returned. The Supabase advisor warning remains an intentional SECURITY DEFINER exception requiring periodic review.

## 4. Authentication configuration

The live advisor confirms **Leaked Password Protection is disabled**. Enable it in Supabase Auth password security settings after reviewing the impact on existing password policies.

The connected project tools available during this audit did not expose the Auth URL configuration, so the following remain dashboard verification items:
- Site URL: `https://ekhayatech.co.za`
- Password recovery redirect: `https://ekhayatech.co.za/account/`
- Exact signup confirmation and invitation callback URLs.
- No broad wildcard redirect URLs.

No Auth dashboard settings were changed.

## 5. Database migration drift

The branch contains `supabase/migrations/20261122100000_standard_ekhaya_account_ids.sql`, but the live Supabase migration history currently ends at `20261122043601` (`partner_acceptance_notification_newline_format`). The account-ID migration is therefore **not recorded as applied in production**.

The branch adds `profiles.account_id` and updates owner-side partner/account presentation to read that field. Treat this as a release dependency: before deploying code that selects `profiles.account_id`, review the migration against production row counts, sequence bounds and existing profile data, then apply it through the approved release process and verify the column/index/constraint. Do not apply it during this GitHub-only sprint.

## 6. Production Edge Function inventory

Live project status: `ACTIVE_HEALTHY`.

| Function | Live version | JWT verification |
|---|---:|---|
| `marketplace-search` | 59 | Enabled |
| `marketplace-search-test` | 16 | Enabled |
| `product-identify` | 15 | Enabled |
| `invite-saechamber-partner` | 12 | Enabled |
| `accept-saechamber-partner-invitation` | 5 | Enabled |
| `partner-admin-email-otp` | 1 | Enabled |
| `notification-worker` | 13 | Disabled (worker-level authentication must remain enforced) |
| `paystack-billing` | 3 | Disabled (webhook/signature validation must remain enforced) |

Do not overwrite or redeploy these functions as part of this branch-only audit. Compare production and repository source before any future release, particularly `marketplace-search`.

## 7. GitHub release checks

The existing `.github/workflows/security.yml` previously ran pull-request security checks only when the PR base was `main`, so it did not cover PR #33 while that PR targeted `feature/partner-admin-email-otp`.

Updated on this branch to:
- Run on pushes to `main` and `feature/saechamber-public-showcase`.
- Run on pull requests targeting `main` or `feature/partner-admin-email-otp`.
- Preserve secret scanning, npm audit, CodeQL and Edge Function type checking.
- Add application TypeScript checking to the dependency job.
- Expand Deno type checking to the production partner invitation, acceptance, notification and OTP functions.
- Avoid cancelling in-progress security runs.

The existing `.github/workflows/quality.yml` runs ESLint, TypeScript and production build. The repository currently has no `test` script, no visible test framework dependency and no committed package lockfile. Full auth E2E coverage is therefore still outstanding; do not represent the current lint/build checks as auth E2E tests.

## 8. Remaining release blockers

1. Enable leaked-password protection in Supabase Auth and verify it.
2. Confirm exact Auth Site URL and redirect allowlist in the dashboard.
3. Review and approve the two private-table RLS hardening statements; validate webhook and notification worker behaviour in a non-production environment first.
4. Add automated auth and referral regression tests using isolated test identities and a non-production Supabase project.
5. Complete real invitation email delivery, partner acceptance/activation, referral signup and seller signup regression.
6. Confirm the expanded GitHub security workflow passes on the latest PR head.
7. Reconcile PR #33's dependency base branch with `main` deliberately.
8. Compare live Edge Function source to branch source; do not redeploy mismatched functions without a reviewed release plan.

**Deployment decision: NOT READY — DASHBOARD CONFIGURATION, SECURITY AND TESTING BLOCKERS.**

No production deployment, merge, live migration, privilege change, Auth setting change or Edge Function deployment was performed during this audit.
