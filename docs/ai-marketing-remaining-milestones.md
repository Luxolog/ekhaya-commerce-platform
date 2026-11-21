# Ekhaya AI Marketing — remaining milestones and release evidence

**Working branch:** `feature/ai-marketing-addon`  
**Pull request:** [#35](https://github.com/Luxolog/ekhaya-commerce-platform/pull/35)  
**Scope boundary:** GitHub changes only. No Vercel deployment, Supabase deployment, production migration, PR merge, paid provisioning, live payment, live email or social publishing.

This document is the execution ledger. A skipped CI job, unavailable environment or unexecuted manual test is **BLOCKED**, never PASS.

## Current baseline

- Latest inspected baseline before the current CI hardening commit: `f5fb2ef79fe7f2476c86e2c2465c0ccb08a88385`.
- CI hardening commit: `3c8ba48f8791ac303e009c69f4dbd42236566422` (automatic local migration apply/lint; its run is pending at the time of this edit).
- The Next.js TypeScript, ESLint and production build job passed on that SHA.
- AI Marketing Edge Function Deno type-check passed on that SHA.
- Repository secret-history scan passed on that SHA.
- Supabase local migration validation was skipped because the workflow was not dispatched. This is not a database validation pass.
- Two-seller browser tests, live Supabase RLS tests and provider sandbox tests have not been executed.
- Worker request validation, stale-run recovery and retry-persistence error reporting were hardened in follow-up commits; their CI results must be checked against the new head before release.

## Milestone ledger

| # | Milestone | Status | Evidence / remaining acceptance work |
|---|---|---|---|
| 1 | Establish current state | COMPLETE | Re-fetched branch, PR #35, changed-file list, migration/function sources and latest Actions. Keep this ledger current with each follow-up commit. |
| 2 | Database migration validation | BLOCKED | Reviewed the AI Marketing migration sequence and key constraints/RPCs. Must run the full repository migration history against a clean local Supabase database, `supabase db lint --local`, and SQL dependency checks. The previous manual CI job was skipped; the workflow now starts an isolated local Supabase stack, applies the complete migration history with `supabase db reset --local`, runs `supabase db lint --local`, and stops the stack. The new automated run must pass before database validation is marked complete. No production migration was applied. |
| 3 | Seller isolation and security | BLOCKED | RLS and ownership constraints are present in migrations and security notes. Still requires two real non-production seller JWTs and direct API/RPC tests across every seller-owned table, including UUID substitution, writes, deletes, activation denial, anonymous access and worker secret rejection/rotation. |
| 4 | Automation engine | IN PROGRESS | Durable queue, SKIP LOCKED claims, schedule advancement, timezone arithmetic, invalid-timezone pausing, idempotent action events, transactional calendar drafts and exponential retry code exist. Worker now rejects malformed/non-object/oversized payloads and limits batch size to 1–25. A new migration recovers `running` jobs whose 15-minute worker lease expired, requeues within the retry budget and marks exhausted runs failed. Retry-state persistence failures now produce an HTTP 503 instead of a misleading successful worker response. Still needs executable DB tests for concurrency, DST, missed schedules, retry persistence, maximum attempts, duplicate execution and lease-expiry recovery. No worker is deployed. |
| 5 | AI content quality | IN PROGRESS | Generation code uses seller brand/product context and explicitly prohibits invented product facts and claims; weekly plan validates seven structured posts. Add automated adversarial tests for conflicting/prohibited claims, missing context, malformed model responses, timeout, rate limits and quota rollback. Provider credentials/runtime are not configured or tested here. |
| 6 | Advanced analytics | IN PROGRESS | Seller-facing analytics and export read recorded usage, campaign, contact and delivery/performance data. Verify every metric's source and timestamp, date-filter boundaries, empty/error states, aggregation correctness, CSV bounds and two-seller isolation. No synthetic performance metrics may be shown as real. |
| 7 | Email provider readiness | BLOCKED | Consent-aware contacts and email drafts plus delivery-event schema exist. No provider has been selected or connected. Provider abstraction, sandbox delivery, signed webhook verification, suppression/bounce/complaint handling, unsubscribe enforcement, send-time consent revalidation and idempotent delivery remain outstanding. Email stays draft-only. |
| 8 | End-to-end seller testing | BLOCKED | Testing guide defines a synthetic two-seller journey. No authorised non-production seller accounts or browser test evidence are available. Execute desktop/mobile journey, CSV duplicate/consent cases, automation activity, analytics/export, auth expiry and seller isolation in non-production. |
| 9 | Billing and usage isolation | IN PROGRESS | AI Marketing has separate plan, subscription, usage and payment tables/RPCs; usage reservation is service-role-only and idempotent. Verify all generation endpoints, concurrent quota use, failed-generation release, duplicate requests, webhook idempotency and that Price Checker credits/subscriptions are unchanged. Paystack remains disabled pending approval. |
| 10 | Performance and reliability | IN PROGRESS | Core user/date indexes and bounded worker batches exist. Review query plans, unbounded client queries, pagination, CSV size, repeated requests, loading/error states and recovery of abandoned worker jobs. No paid infrastructure changes. |
| 11 | Documentation and release preparation | IN PROGRESS | Existing add-on, content-engine, security, provider, migration and testing docs remain in place; this ledger now records acceptance evidence and blockers. Update deployment/rollback instructions after local migration validation and test results. |
| 12 | GitHub Actions | IN PROGRESS | Existing workflow runs TypeScript, ESLint, Next build and Deno type-check. Secret-history scan passed on the previous baseline. Supabase local migration application and lint now run automatically on every workflow invocation; the first result on the updated workflow is pending. Add executable SQL/worker/security tests where practical. |
| 13 | Final acceptance | BLOCKED | Do not mark ready until all release gates below are supported by executed evidence. |

## Findings to resolve before release

1. **Abandoned worker claims:** a 15-minute lease and safe requeue/final-failure policy are now implemented in migration `20261122130000_recover_stale_marketing_automation_runs.sql`. Prove it with concurrent database tests before enabling a scheduled worker.
2. **Retry write failures:** the worker now returns HTTP 503 if any retry-state persistence fails, and the lease recovery migration provides a bounded recovery path. Add tests and operational monitoring before release.
3. **Scheduler semantics:** validate monthly end-of-month behavior and DST gaps/folds against the intended seller wall-clock policy. Current local wall-clock arithmetic is not a substitute for tests.
4. **Automation activation:** seller RLS policy prevents direct seller activation; verify no alternate table grants, RPCs or UI route can bypass that boundary.
5. **Email:** schema and draft workspace are not a sending system. Do not connect a live provider or enable sending as part of this branch-only work.

## Final acceptance gates

- [ ] Complete migration history applies cleanly to a fresh isolated local Supabase database.
- [ ] `supabase db lint --local` completes with no unresolved errors.
- [ ] Two-seller RLS/API/RPC isolation suite passes for every seller-owned resource.
- [ ] Seller cannot activate an automation by direct API/SQL under authenticated role.
- [ ] Worker secret, request size, method, batch bounds and service-role boundaries are tested.
- [ ] Scheduler and worker tests cover recurrence, timezone/DST, concurrency, idempotency, retry, permanent failure and abandoned-run recovery.
- [ ] AI content tests cover unsupported claims, conflicting facts, malformed output, provider failures and quota accounting.
- [ ] Analytics values are traceable to their source and date range; no fabricated metrics.
- [ ] Email provider sandbox and webhook/suppression controls are verified; production sending remains disabled until separately approved.
- [ ] Two-seller desktop/mobile E2E flow passes with synthetic data.
- [ ] AI Marketing quota/billing isolation is proven without changing Price Checker behaviour.
- [ ] Latest GitHub Actions and security scan pass on the final branch SHA.
- [ ] Docs include verified migration, test, rollback and deployment evidence.
- [ ] PR #35 remains unmerged until explicit release approval.

## Release boundary

This branch is not production-ready solely because CI passes. Local database validation, real seller isolation, provider sandbox and browser E2E are distinct acceptance gates. No production migration, Supabase Edge Function deployment, Vercel deployment, live email, live social publishing or live payment activation is authorised by this work.
