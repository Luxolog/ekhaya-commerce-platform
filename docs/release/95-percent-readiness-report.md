# Ekhaya Price Checker — Development Readiness

**Audit date:** 2026-11-22  
**Repository:** `Luxolog/ekhaya-commerce-platform`  
**Branch:** `feature/saechamber-public-showcase`  
**Audited head:** `58ea67cfbaad84f578b127662408a036e0ebbd1a`  
**PR:** [#33](https://github.com/Luxolog/ekhaya-commerce-platform/pull/33), open and unmerged

## Executive result

**Evidence-backed development readiness: 62% — below the 95% target.**

This is a conservative engineering estimate using the weighted scorecard below. It is not a production-readiness certification. No production environment was changed during this audit.

| Area | Weight | Awarded | Status | Evidence / limitation |
|---|---:|---:|---|---|
| Security and authentication | 15 | 12 | PARTIAL | Referral navigation scheme allowlist fix is committed; CodeQL, secret scan, dependency audit and Edge Function checks passed. Live Auth/OTP abuse cases not integration-tested. |
| Seller signup and account protection | 10 | 6 | PARTIAL | UI guards and acknowledgement checks exist with unit coverage. Direct API and real signup/workspace flow not verified. |
| Partner and referral lifecycle | 15 | 9 | PARTIAL | Owner checks, invitation guards, activation logic and referral locks exist. Real invite/accept/link/activate/referral journey and email delivery remain unverified. |
| Marketplace search and relevance | 15 | 9 | PARTIAL | Relevance ranking and bounded query-planning helpers have unit tests; bounded Takealot discovery is now integrated in source with a maximum of three calls. Provider orchestration is not yet covered by mocked integration tests. |
| Seller credits and pilot protection | 15 | 8 | PARTIAL | Pilot allowance now uses request-scoped reserve/complete/refund events with one-time refunds; monthly credit refunds retain the original billing period. SQL concurrency/integration tests remain outstanding. |
| Cache, provider reliability and performance | 10 | 8 | PARTIAL | Allowance reservations now occur only after cache misses; partner support and pilot reservations have explicit completion/refund paths; Takealot attempts are ledgered individually. Provider/cache integration and concurrency coverage remain outstanding. |
| Billing and subscriptions | 5 | 1 | BLOCKED | Billing source and webhook idempotency are not sufficiently available in this branch for verification. |
| Database and migration safety | 5 | 2 | BLOCKED | Branch migration files can be reviewed, but production migration history/RLS/Auth configuration cannot be reconciled from this GitHub-only audit. |
| Notifications and email | 5 | 3 | PARTIAL | Notification worker and idempotency migration exist; notification row testing is documented historically. Actual SMTP delivery is not verified. |
| Automated testing and build quality | 5 | 4 | PARTIAL | Final-head quality and security workflows passed. Existing Deno tests run; no isolated full-stack E2E suite. |
| **Total** | **100** | **62** | | |

## Verified CI on previously audited head

Commit: `4efb61bb2038e7309d7cb35663bdaf43a429c6ed`

- [Quality checks run 45010909803](https://github.com/Luxolog/ekhaya-commerce-platform/actions/runs/45010909803): passed — ESLint, TypeScript and Next.js production build.
- [Security checks run 45010909826](https://github.com/Luxolog/ekhaya-commerce-platform/actions/runs/45010909826): passed — Gitleaks, dependency audit, CodeQL, Edge Function type-check and Deno regression tests.

A green CI run does not prove live end-to-end behaviour.

## Confirmed source-level capability

- Takealot, Amazon South Africa and Makro are enabled in the branch.
- Bob Shop and Leroy Merlin are explicitly unavailable for live search.
- Product relevance ranking separates best matches, related items and accessories.
- Takealot provider orchestration uses one initial query and at most two targeted follow-ups, stopping when ranked results are sufficient; successful results are retained if a follow-up fails. Each provider attempt writes a separate usage-ledger entry, including reported charges and request ID when available.
- Seller pilot, partner support and monthly credit RPC calls are present. All account types are checked against shared cache before allowance reservation; cache hits are free. Pilot and partner live-search reservations now have request-scoped completion/refund RPCs, with duplicate request IDs retained as idempotency records. SQL concurrency and isolated database tests remain outstanding.
- Partner invitation acceptance checks verified email, invitation status/expiry and invited-email ownership.
- Owner partner creation and activation require owner access; activation checks for a linked account and accepted invitation.

## Release decision

**Not ready for controlled live seller onboarding or production release.** First obtain an isolated non-production Supabase/Auth environment and safe provider test credentials, complete the blocked integration tests, reconcile the PR dependency branch and production/source differences, then repeat this scorecard.

## Production safety

This audit performed no Supabase deployment, migration, production database/Auth mutation, Vercel deployment, paid ReefAPI request, invitation send, payment or PR merge. Production `marketplace-search` version 59 was not intentionally modified; this GitHub-only audit cannot independently attest the current deployed version.
\n\n## Local database test harness update (2026-11-22)\n\n- Added a local-only Supabase configuration at `supabase/config.toml`; it uses a distinct local project ID and default localhost ports, and does not link to production.\n- Added 23 pgTAP database contract assertions for pilot, partner-support and atomic partner-acceptance function existence, security-definer attributes, RLS/unique-request constraints and execution grants. These checks are committed but are not yet evidenced as passed.\n- Added `.github/workflows/local-supabase-tests.yml` to start local Supabase on a GitHub-hosted runner and run `supabase test db`. Workflow result is pending; no claim of SQL integration success is made.\n- Readiness remains **62%** until the database workflow and behavioural transaction/concurrency tests pass.\n

## Batch 8 reassessment — 2026-11-22

**Current audited head:** `3c4ca5bf44eb1343f803abdae5e2883b3a212d98`.

The previous 62% score is retained as a conservative development-readiness estimate, not upgraded based on passing lint/build/security checks. The clean database gate is now explicitly confirmed failing, and the regression SQL suite did not execute. The prior score must not be interpreted as a measured production-readiness percentage.

### Current-head evidence

- Quality run [45037052662](https://github.com/Luxolog/ekhaya-commerce-platform/actions/runs/45037052662): ESLint, TypeScript and production build PASS.
- Security run [45037052603](https://github.com/Luxolog/ekhaya-commerce-platform/actions/runs/45037052603): dependency audit, secret scan, CodeQL, Deno Edge Function type-check and auth-guard tests PASS.
- Local DB run [45037052655](https://github.com/Luxolog/ekhaya-commerce-platform/actions/runs/45037052655): FAIL during clean migration replay because `public.partner_programs` is missing when `20261121023000_public_active_referral_partners.sql` is applied. SQL contract tests were skipped.

### Readiness decision

**NOT READY for deployment or live seller onboarding.** The required acceptance condition of a clean migration replay and completed regression suite is unmet. No performance/load capacity result is claimed, and no billing, SMTP or full signup E2E pass is claimed.

Next action is schema/migration reconciliation, not deployment. The standalone partner schema document must be compared against the full migration chain, current functions/triggers, application queries and production migration history before adding a foundational migration. Do not copy the document wholesale or invent missing business rules.


## Batch 8 final-head reassessment — 2026-11-22

**Audited commit:** `59dcd4c3a8721469f5a763ad1099492e7a5c02e5`  
**PR:** #33, open and unmerged.

### Evidence update

- Quality [run 45051417372](https://github.com/Luxolog/ekhaya-commerce-platform/actions/runs/45051417372): ESLint, TypeScript and production build PASS.
- Security [run 45051417457](https://github.com/Luxolog/ekhaya-commerce-platform/actions/runs/45051417457): dependency audit, Gitleaks secret scan, CodeQL, configured Edge Function type-check and auth-guard Deno tests PASS.
- Local Supabase [run 45051417432](https://github.com/Luxolog/ekhaya-commerce-platform/actions/runs/45051417432): FAIL. The clean replay reaches `20261121023000_public_active_referral_partners.sql` and stops because `public.partner_programs` does not exist. The database contract test step is skipped.

### Readiness interpretation

The previously documented 62% development-readiness estimate is retained as a conservative historical scorecard, not promoted to 95%. It is not a measured production-readiness percentage. The latest evidence confirms that quality/security gates pass while the mandatory database gate fails.

No evidence supports a clean replay, completed SQL regression, full Auth/partner/seller/search/billing E2E, SMTP delivery, repeatable performance benchmark, load/capacity result, or complete environment/runbook audit.

### Final decision

**NOT READY for production deployment or live seller onboarding.** The acceptance criteria in Batch 8 are not met. Do not recommend deployment until the authoritative partner foundation schema is reconciled, clean replay and SQL tests pass, behavioural regression is completed, performance/capacity is measured with repeatable mocks, and environment/runbook gates are evidenced.

No Vercel deployment, production Supabase migration/write, paid provider traffic, real invitation, email or payment was performed.
