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
