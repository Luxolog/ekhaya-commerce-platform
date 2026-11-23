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


## 9. Pre-test sprint update — 2026-11-22

### Confirmed latest GitHub state
- Branch HEAD remains `c29867c7a3caa9477dab0b78df7ae88319e06952`.
- PR #33 remains open and unmerged; base is `feature/partner-admin-email-otp`.
- Quality push and PR checks passed on the latest HEAD.
- Security push and PR checks passed on the latest HEAD, including dependency audit, secret scan, CodeQL and Edge Function type checking.
- The latest successful runs are linked in the release readiness report.

### Added safe engineering work
- Extracted signup acknowledgement and referral-code matching guards into a pure helper module.
- Added Deno regression tests for acknowledgement enforcement, referral code normalization, exact active-catalog matching, invalid/empty referral codes and non-signup flows.
- Added the regression test command to the security workflow.
- Reworked the account-ID migration to lock profiles during backfill, preserve existing IDs, reject malformed/duplicate IDs, detect five-digit range exhaustion, assign missing IDs deterministically above the current maximum, and align the sequence/default/NOT NULL/unique/format constraints.
- Added a read-only account-ID preflight/postflight verification SQL script.

### Tests and environment limits
The new guard tests are deterministic unit tests; they are not a substitute for Supabase Auth integration or browser end-to-end tests. No isolated non-production Supabase project or dedicated test credentials were available during this sprint. Real invitation, SMTP, seller signup, account linking, OTP and role-separation journeys remain BLOCKED pending an isolated test environment and authorised test identities.

### Migration execution order and recovery
1. Confirm the intended production backup/restore point and pause profile-creation traffic for the migration window.
2. Run the read-only preflight script and investigate malformed IDs, duplicates, capacity, and unexpected existing values.
3. Review the migration in staging against a production-like populated copy.
4. Apply the account-ID migration only through the approved production release process; its ACCESS EXCLUSIVE table lock blocks profile writes for the migration transaction.
5. Run the postflight verification script; confirm every profile has a unique ETxxxxx value, the sequence/default/constraint/index exist, and UUID primary keys are unchanged.
6. Deploy application code that reads `profiles.account_id` only after the migration is verified.
7. If migration fails, PostgreSQL transactional DDL should roll back the migration transaction. If a later application release fails after migration commits, keep account IDs and the sequence in place; roll back application code to the previous UUID-based display path. Do not drop or regenerate assigned IDs. Any manual data repair must preserve all existing non-null IDs.

### Remaining blockers
- Enable leaked-password protection and verify Auth Site URL/redirect allowlist manually in the Supabase dashboard.
- Review private-table RLS enablement after validating every worker/function access path in staging.
- Full auth/referral E2E tests require isolated Supabase Auth, database and SMTP sandbox credentials.
- Compare deployed Edge Function source bodies with branch source before any future deployment; live versions and JWT flags are inventoried, but deployment remains prohibited in this sprint.
- Real invitation acceptance, email delivery, referral attribution and seller workspace checks remain BLOCKED.
- PR dependency-base reconciliation and a controlled test release require explicit release planning.

**Current decision remains NOT READY FOR CONTROLLED TESTING.**


## 10. Expanded migration-history and Edge Function drift findings

### Migration history is not reproducible from this branch

A fresh recursive Git tree comparison found:
- Production Supabase migration history: **44 applied versions**.
- Current feature branch: **14 SQL migration files**.
- PR #33 base branch: **11 SQL migration files**.
- Only three migration version identifiers match exactly between the live history and the current feature branch.
- Forty-one live migration version identifiers have no exact corresponding SQL file in the current branch.

The production history includes the following versions that are not present as exact versioned migration files on the feature branch:

```text
20261111203109
20261112033301
20261112034039
20261112124422
20261112134433
20261112135801
20261112140024
20261112140116
20261112153024
20261112154421
20261114065854
20261114065907
20261114092931
20261114102708
20261114105114
20261114192317
20261114192915
20261114192932
20261115023056
20261115025620
20261115065935
20261115070811
20261115073917
20261115083123
20261115113533
20261115114312
20261115114431
20261115114446
20261115171536
20261115171645
20261115173542
20261119181448
20261119181457
20261119181559
20261119211157
20261121003409
20261121021942
20261121143253
20261121143341
20261122043516
20261122043601
```

Some branch files appear to represent similar feature areas but use different timestamps/names. Similar names are not proof that SQL contents, execution order or schema effects are equivalent. Do not mark these as reconciled without a migration-by-migration content comparison against an authoritative source. Do not fabricate replacement migration files from names or current schema alone.

**Release impact:** migration ordering and clean-environment reproducibility are BLOCKED. Before controlled testing or a release, the owner must establish an authoritative migration archive from the deployment history/source-control records, compare each SQL definition and dependency, and then decide how to reconcile historical migrations without reapplying them to production. Never rename already-applied migration versions casually or rerun historical DDL against production.

### Live Edge Function source comparison

Current live versions were checked against branch source on 2026-11-22:

| Function | Live version | JWT | Source comparison |
|---|---:|---:|---|
| `marketplace-search` | 59 | true | DIFFERENT. Live owner profile query selects `id,display_name,plan_code,account_status`; branch additionally selects `account_id`. The branch therefore depends on the unapplied account-ID migration. |
| `product-identify` | 15 | true | DIFFERENT. Live source is materially shorter than branch source; do not deploy without a full behavioural/security diff and isolated tests. |
| `invite-saechamber-partner` | 12 | true | DIFFERENT. Live source still checks `existingUser.encrypted_password`; branch removes that unsupported inference and preserves existing passwords. |
| `accept-saechamber-partner-invitation` | 5 | true | Exact entrypoint source match. |
| `notification-worker` | 13 | false | DIFFERENT. Live source still contains the recursive HTML fallback initializer; branch changes the fallback to an empty string. |
| `partner-admin-email-otp` | 1 | true | Exact entrypoint source match. |
| `paystack-billing` | 3 | false | No corresponding source directory/file exists in the current branch tree. |
| `marketplace-search-test` | 16 | true | Live function exists; no corresponding source directory/file exists in the current branch tree. |

The two previously corrected defects in invitation handling and notification HTML are therefore **branch fixes only**, not production fixes. This sprint deliberately did not deploy them. The production source differences are release blockers requiring an owner-reviewed deployment plan, regression tests and version-specific comparison.

`notification-worker` and `paystack-billing` have JWT verification disabled in the live project; their in-function worker authentication and webhook signature checks must be reviewed before any change to their deployed code or JWT settings.

## 11. Final pre-testing sprint implementation and CI status

### Engineering changes committed
- Extracted signup acknowledgement and referral-code matching guards into `src/lib/auth-guards.ts` and integrated them into `src/app/account/page.tsx`.
- Added Deno unit tests in `supabase/tests/auth-guards.test.ts` covering referral normalization/matching, unknown/empty codes and required signup acknowledgements.
- Added the Deno regression test command to the security workflow. Excluded Deno test files from the Next.js application TypeScript project while preserving their independent Deno type-check/test run.
- Hardened the account-ID migration with an ACCESS EXCLUSIVE profile-table lock, preservation of existing IDs, malformed/duplicate ID rejection, five-digit capacity checks, deterministic backfill above the existing maximum, sequence ownership/default, NOT NULL, unique index and format constraint.
- Added read-only preflight/postflight verification SQL at `supabase/verification/standard_ekhaya_account_ids_preflight.sql`.
- Added `docs/pre-testing-acceptance-checklist.md` with PASS / BLOCKED / REQUIRES HUMAN APPROVAL classifications and the Auth dashboard checklist.
- Updated CI concurrency groups to include the commit SHA so checks for separate commits are not superseded by a newer pending run.

### Latest CI evidence
On source-code commit `edadea8d6e21db1b028ca70d4c8b192370d1f7ee`, PR quality checks and PR security checks completed successfully:
- ESLint: passed.
- Application TypeScript: passed.
- Production build: passed.
- npm audit: passed.
- Gitleaks: passed.
- Deno Edge Function type checks: passed.
- Signup/referral guard Deno tests: passed.
- CodeQL: passed.

The separate push quality check also completed successfully on that commit. The latest docs-only checklist commit followed; its own workflow checks must be verified before declaring all checks complete for the final HEAD.

### Supabase security state
- Project remains `ACTIVE_HEALTHY`.
- Security advisor reports 22 public RLS-enabled tables with no policies (INFO), the public SECURITY DEFINER referral RPC (WARN), and leaked-password protection disabled (WARN).
- A fresh table inventory reconfirmed RLS is disabled on `private.payment_webhook_events` and `private.billing_notification_queue` (CRITICAL advisor finding). Earlier direct grant inspection found no anon schema usage or authenticated table SELECT grants, but those grant checks must be repeated during an approved review. Treat the RLS-disabled condition as unresolved defence-in-depth risk; do not add blanket policies or execute remediation in this sprint.
- No production SQL, RLS, grants, Auth settings, migration, Edge Function, account or email changes were made.

### Outstanding blockers and decision
- Production migration history is not reproducible from the current branch: 44 live migration versions versus 14 SQL files in the branch, with only three exact version identifiers in common. Historical SQL must be recovered from an authoritative archive and reconciled before any clean-environment test or release.
- Account-ID migration is hardened but still requires staging review and approved execution; it remains unapplied in production.
- Production Edge Function versions differ from branch source for `marketplace-search`, `product-identify`, `invite-saechamber-partner` and `notification-worker`. The invitation and notification fixes are branch-only. `paystack-billing` and `marketplace-search-test` have no source directory in the branch.
- Auth dashboard settings (especially leaked-password protection and exact redirects) require owner approval.
- Full Auth/referral/partner/OTP/seller E2E testing requires an isolated non-production Supabase project, dedicated test identities and SMTP sandbox. These are not available in the current sprint.
- Real invitation, partner acceptance/activation, SMTP delivery, referral persistence, seller workspace, role separation and billing-boundary tests remain BLOCKED.
- PR #33 remains open and unmerged, with base `feature/partner-admin-email-otp`; release-base reconciliation is a deliberate owner decision.

**Final decision: NOT READY FOR CONTROLLED TESTING.** The automated unit/build/security foundation is materially improved and passed on the latest source-code commit, but migration-history drift, live/branch function differences, unresolved security configuration and the unavailable isolated E2E environment prevent a PRE-TEST READY declaration.
