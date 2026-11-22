# Remaining Release Blockers

| Blocker | Owner / dependency | Required action | Production approval? |
|---|---|---|---|
| Local Supabase database harness not yet executed | Engineering / GitHub Actions runner | Run the newly added local Supabase workflow; add behavioural transaction fixtures after validating migration bootstrap | No production approval; local only |
| Invitation and activation full E2E not run | Engineering + isolated Supabase | Test owner create, duplicate rejection, invite, accept, account link and activate | No, if isolated |
| Atomic partner acceptance integration coverage | Engineering + isolated Supabase | Test atomic RPC under concurrent acceptance, duplicate referral code, wrong email, expiry and rollback | No, if isolated |
| Live referral signup and attribution row unverified | QA + isolated Supabase | Complete controlled signup and inspect resulting referral row | No, if isolated |
| SMTP delivery unverified | Owner / email provider | Configure sandbox and test owner + partner notifications | No real recipients |
| Seller signup/workspace E2E unverified | QA + isolated Supabase | Verify email confirmation, acknowledgements, referral and workspace | No, if isolated |
| Takealot orchestration tests missing | Engineering | Add mocked provider adapter tests for initial + two follow-up calls, partial failures, deduplication and per-attempt usage ledger | Branch-only first; no deployment |
| Credit lifecycle SQL integration coverage missing | Engineering | Test pilot/partner reserve, complete and refund RPCs for duplicate IDs, exactly-once refunds, daily/total caps and concurrent requests in isolated Supabase | Branch-only |
| Provider timeout/partial failure coverage missing | Engineering | Test provider timeouts, non-2xx responses, failed-call reported charges and request IDs; confirm successful Takealot results survive failed follow-ups | Branch-only |
| Billing source/webhook idempotency not verifiable | Engineering + payment sandbox | Locate authoritative billing source and add sandbox tests | No real payments |
| Production/branch migration reconciliation unavailable | Owner / Supabase access | Read-only inventory, staging preflight, migration diff | Approval before production migration |
| RLS/Auth dashboard settings unverified | Owner / Supabase access | Inspect private table RLS, leaked-password protection and redirect allowlist | Do not change without approval |
| Deployed Edge Function source parity unverified | Owner / Supabase access | Compare deployed source with branch, especially marketplace-search v59 | No deployment |
| PR dependency branch needs reconciliation | Engineering / owner | Review commits in `feature/partner-admin-email-otp` and determine safe base before release | Owner review before base/merge change |
| Vercel deployment rate limit | Owner / hosting | Previous bot report shows `api-deployments-free-per-day`; do not retry until deliberately approved | Yes |

## Local testing harness update\n\n- Added `supabase/config.toml` for a separate local project ID, local ports, and disabled automatic seed data. No production credentials or project link are configured.\n- Added `supabase/tests/credit_lifecycle_contract.test.sql` with 23 pgTAP contract assertions covering pilot/partner RPC presence, SECURITY DEFINER, RLS, unique request constraint and service-role-only execution. These are contract checks, not yet transaction/concurrency behaviour tests.\n- Added `.github/workflows/local-supabase-tests.yml` to start an isolated local Supabase stack and run `supabase test db`. First execution is pending.\n\n## Prompt 10 implementation update

- Bounded Takealot discovery is integrated in branch source (one initial query plus up to two targeted follow-ups).
- Takealot provider attempts are written individually to the usage ledger, including provider-reported credits and request IDs when available.
- Cache lookup now precedes every allowance reservation, so cache hits are free without relying on refund calls. Pilot and partner live-search reservations use request-scoped completion/refund RPCs; refunds retain idempotency records.
- Atomic partner invitation acceptance is implemented through a service-role-only database RPC and used by the acceptance Edge Function.
- These are source-level changes. New migrations are not applied, and isolated database/provider integration tests remain outstanding.

## Release decision

**Not ready for controlled live onboarding or production deployment.** The final-head CI is green, but live integration and external acceptance gates remain open.

No PR merge, deployment, migration, paid provider call, real invitation, email or payment was performed.


## Batch 8 — confirmed blockers and current-head CI (2026-11-22)

Current audited head: `3c4ca5bf44eb1343f803abdae5e2883b3a212d98`.

### Critical blocker: clean migration replay

- Actions run [45037052655](https://github.com/Luxolog/ekhaya-commerce-platform/actions/runs/45037052655) failed during `supabase start` migration application.
- Exact failure: `relation "public.partner_programs" does not exist` while applying `20261121023000_public_active_referral_partners.sql`.
- The migration calls `public.get_active_referral_partners()` and references `public.partner_programs`, but no earlier migration in the replay creates that relation.
- `supabase test db` was skipped. Therefore the existing 23 pgTAP assertions have not run on a clean database.
- A standalone `docs/sa-echamber-partner-portal-schema.sql` exists, but it is not a migration and cannot be treated as replay evidence. It contains additional tables, triggers and commission assumptions that must be reconciled with the branch before converting any portion into a migration.

### Passed current-head CI

- [Quality run 45037052662](https://github.com/Luxolog/ekhaya-commerce-platform/actions/runs/45037052662): ESLint, TypeScript and production build passed.
- [Security run 45037052603](https://github.com/Luxolog/ekhaya-commerce-platform/actions/runs/45037052603): dependency audit, secret scan, CodeQL, Edge Function type-check and auth-guard regression tests passed.

### Still not evidenced

- Behavioural SQL tests for reservation, completion, refund, limits, concurrency and atomic invitation acceptance.
- Full seller signup/workspace, partner invitation/acceptance/activation/referral, and billing/webhook integration tests.
- Mocked provider orchestration and repeatable load/capacity benchmarks.
- Slow-query and Edge Function latency measurements; no performance numbers should be inferred from source review.
- Complete local/preview/production environment-variable inventory and a reviewed deployment runbook.
- Production migration/function source parity and Auth/RLS dashboard settings; production remains outside this batch's write scope.

**Release status: NOT READY.** Resolve the missing partner schema migration dependency, rerun clean replay and SQL tests, then complete behavioural and operational gates before reconsidering release.


## Partner foundation schema reconciliation update — 2026-11-22

The clean replay blocker is now traced to a missing partner foundation migration, not merely a missing `partner_programs` relation. See [partner-schema-migration-reconciliation.md](./partner-schema-migration-reconciliation.md). The standalone partner schema references a `payment_transactions` table absent from the branch migration chain, while current code also requires `partner_invitations`, `partner_owner_access` and `user_notifications` definitions not supplied by that standalone document. A foundation migration is intentionally not fabricated until those authoritative schemas and their RLS/grant/trigger contracts are available.
