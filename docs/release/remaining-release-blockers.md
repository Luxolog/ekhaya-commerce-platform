# Remaining Release Blockers

| Blocker | Owner / dependency | Required action | Production approval? |
|---|---|---|---|
| Behavioural SQL/concurrency suite incomplete | Engineering / isolated Supabase | Extend the now-passing clean replay and 48 contract assertions with transaction, concurrency, rollback and lifecycle fixtures | No production approval; local only |
| Invitation and activation full E2E not run | Engineering + isolated Supabase | Test owner create, duplicate rejection, invite, accept, account link and activate | No, if isolated |
| Atomic partner acceptance integration coverage | Engineering + isolated Supabase | Test atomic RPC under concurrent acceptance, duplicate referral code, wrong email, expiry and rollback | No, if isolated |
| Live referral signup and attribution row unverified | QA + isolated Supabase | Complete controlled signup and inspect resulting referral row | No, if isolated |
| SMTP delivery unverified | Owner / email provider | Configure sandbox and test owner + partner notifications | No real recipients |
| Seller signup/workspace E2E unverified | QA + isolated Supabase | Verify email confirmation, acknowledgements, referral and workspace | No, if isolated |
| Takealot orchestration tests missing | Engineering | Add mocked provider adapter tests for initial + two follow-up calls, partial failures, deduplication and per-attempt usage ledger | Branch-only first; no deployment |
| Credit lifecycle SQL integration coverage missing | Engineering | Test pilot/partner reserve, complete and refund RPCs for duplicate IDs, exactly-once refunds, daily/total caps and concurrent requests in isolated Supabase | Branch-only |
| Provider timeout/partial failure coverage missing | Engineering | Test provider timeouts, non-2xx responses, failed-call reported charges and request IDs; confirm successful Takealot results survive failed follow-ups | Branch-only |
| Full billing webhook/renewal lifecycle not verified | Engineering + payment sandbox | Test payment webhook idempotency, renewal/reminder jobs and full payment state transitions using mocks/sandbox; keep checkout gate disabled | No real payments |
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


## Historical partner migration source check — 2026-11-22

- Inspected repository branch `partner-program-foundation` at commit `ca2fd427030f2a1deefa2585b3f5392f5ebd78e1`.
- Its `0002_partner_program.sql` belongs to an older, incompatible data model (`partners`, `partner_applications`, `partner_commissions`, `partner_payouts`); it does not supply the current SA eChamber foundation or `payment_transactions`.
- It is explicitly excluded from the current migration chain. Copying it would create a second, conflicting partner model rather than fix the current dependency.
- The reconciliation evidence is documented in `docs/release/partner-schema-migration-reconciliation.md`.
- Latest PR #33 head after this documentation-only reconciliation: `59dcd4c3a8721469f5a763ad1099492e7a5c02e5`. CI for this new head has not yet been verified.
- **No schema migration was added** because authoritative definitions for `payment_transactions`, `partner_invitations`, `partner_owner_access`, and `user_notifications` remain unavailable. Clean replay and deployment remain blocked.


## Batch 8 current status — 2026-11-22

Audited commit: `59dcd4c3a8721469f5a763ad1099492e7a5c02e5`. PR #33 remains open and unmerged.

### Critical / release-blocking

1. **Missing partner foundation migration.** Clean replay fails at `20261121023000_public_active_referral_partners.sql` because `public.partner_programs` is absent. The migration defines a function that queries this table before any migration creates it.
2. **Authoritative schemas are incomplete.** The standalone partner schema depends on `payment_transactions`; current application paths also require `partner_invitations`, `partner_owner_access` and `user_notifications`. Their authoritative constraints, indexes, RLS, grants, triggers, notification idempotency and retention contracts are not fully available.
3. **SQL contract suite is unexecuted.** The local database workflow fails during `supabase start`; its `supabase test db` step is skipped. The 23 pgTAP assertions are contract assertions, not behavioural transaction tests.
4. **Behavioural and E2E regression incomplete.** No passing isolated database evidence for reserve/complete/refund, limits, concurrency or atomic acceptance; no full signup/workspace, partner lifecycle, billing/webhook or SMTP sandbox pass.
5. **Performance/capacity not measured.** No repeatable benchmark evidence for concurrent users, throughput, contention, provider fan-out, cache hit ratio, latency, error rate or resource consumption. No measurements should be inferred from code review.
6. **Environment inventory and deployment operations incomplete.** A verified local/preview/production environment-variable matrix and approved rollback/monitoring runbook have not yet been evidenced. Secret values must never be copied into docs or logs.
7. **Production parity remains unverified.** Production migration/function parity, Auth dashboard settings, RLS inventory and deployed Edge Function source parity require a separate read-only review and explicit production authorization before any write.
8. **PR dependency base unresolved.** PR #33 targets `feature/partner-admin-email-otp`; dependency reconciliation and any base/merge change require owner review.

### Current-head CI evidence

- Quality run [45051417372](https://github.com/Luxolog/ekhaya-commerce-platform/actions/runs/45051417372): ESLint, TypeScript and production build PASS.
- Security run [45051417457](https://github.com/Luxolog/ekhaya-commerce-platform/actions/runs/45051417457): dependency audit, Gitleaks, CodeQL, configured Edge Function type-check and auth-guard Deno tests PASS.
- Local database run [45051417432](https://github.com/Luxolog/ekhaya-commerce-platform/actions/runs/45051417432): FAIL at missing `public.partner_programs`; pgTAP step skipped.

### Safe implementation decision

Do not add a guessed partner foundation, placeholder financial table, copied legacy partner model, removed financial FK or weakened RLS policy. Obtain authoritative schema and security contracts first, then implement the ordered foundation and repeat clean replay. Keep Vercel and production Supabase untouched for this batch.

**Release recommendation: NOT READY.**


## Batch 9 remediation update — 2026-11-22

**Tested code head:** `8f1f583a706f820894942e7e86542c0d56de773f`  
**PR #33:** still open and unmerged.

### Resolved on the feature branch

- Added `20261121020000_partner_payment_foundation.sql` before `20261121023000_public_active_referral_partners.sql`. It creates the verified partner, invitation, owner access, referral, commission, statements, rate schedule, notification, payment, subscription billing, billing plan and paid-credit allocation contracts.
- Preserved the non-null unique `partner_commission_ledger.payment_transaction_id` foreign key to `payment_transactions(id)`.
- Restored the idempotent paid-credit allocation function and payment-completion trigger from live catalog definitions.
- Corrected the conflicting partner auto-activation trigger and status default so newly created programmes remain pending until the explicit acceptance/activation flow.
- Wrapped the exclusive `LOCK TABLE public.profiles` in `20261122090359_standard_ekhaya_account_ids.sql` in an explicit transaction.

### Verification passed

- [Local Supabase database tests — run 45057734774](https://github.com/Luxolog/ekhaya-commerce-platform/actions/runs/45057734774): all 21 migrations replayed successfully; 48 pgTAP assertions passed across two SQL test files; isolated stack stopped cleanly.
- [Quality — run 45057738336](https://github.com/Luxolog/ekhaya-commerce-platform/actions/runs/45057738336): ESLint, TypeScript and production build PASS.
- [Security — run 45057738264](https://github.com/Luxolog/ekhaya-commerce-platform/actions/runs/45057738264): CodeQL, secret scanning, dependency audit and Supabase Edge Function type-check PASS.
- [Ekhaya Security Scanning — run 45057734776](https://github.com/Luxolog/ekhaya-commerce-platform/actions/runs/45057734776): PASS.

### Remaining blockers

- Behavioural SQL tests for concurrent partner acceptance, invitation replay, referral attribution, reserve/complete/refund exactly-once behaviour and transaction rollback.
- Full seller signup/workspace and owner partner create/invite/accept/link/activate E2E.
- Full payment webhook, renewal/reminder and SMTP delivery verification. The current Paystack Edge Function release gate is disabled; no provider calls or real payments were made.
- Production migration provenance remains different: 51 applied production migration records versus 21 source migrations in the branch. The successful clean replay proves the branch's own ordered chain, not that every production migration is represented or safely reconciled.
- Performance/load tests, environment inventory, deployed Edge Function parity and final runbook review remain open.

**Release recommendation remains NOT READY for production deployment or live onboarding.** The database replay and contract gates are now green; behavioural, operational and production-parity gates remain.
