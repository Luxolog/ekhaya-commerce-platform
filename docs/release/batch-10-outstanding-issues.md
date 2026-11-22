# Batch 10 Outstanding Issues Register

**Repository:** Luxolog/ekhaya-commerce-platform  
**Branch:** feature/saechamber-public-showcase  
**PR:** [#33](https://github.com/Luxolog/ekhaya-commerce-platform/pull/33) — OPEN, UNMERGED  
**Release status:** NO-GO

## Blocking issues

| ID | Severity | Issue | Why it blocks release | Required resolution |
|---|---|---|---|---|
| B10-001 | Critical | Paystack/PayFast checkout and webhook implementation is not present in this branch source. | Database tables and a credit allocation trigger do not prove verified payment processing, signature validation, idempotent webhook ingestion, refunds or renewals. | Recover the authoritative provider implementation/source, verify signatures and event idempotency, implement isolated provider mocks/tests, then obtain separate approval before enabling checkout. |
| B10-002 | Critical | Production migration provenance is not reconciled. | Earlier read-only inventory recorded 51 applied production migration history entries while the repository had 21 migration files; the new profile migration brings the branch to 22. Version/name drift and absent billing/support/notification source migrations prevent a trustworthy production parity claim. | Reconcile every production history record to authoritative source SQL and object definitions. Obtain a reviewed forward-only migration plan. Do not repair production history in this batch. |
| B10-003 | Critical | Full seller and partner browser journeys are not E2E verified. | Unit/SQL tests cannot prove actual browser signup, email confirmation, invitation acceptance, account linking, owner activation and workspace access work together. | Add a controlled E2E harness with synthetic identities and mocked email; run complete owner/partner/seller journeys in an isolated environment. |
| B10-004 | High | Real SMTP delivery and failure recovery are not verified. | In-app notification rows can be created without proving email delivery. Worker failures may strand pending rows after an attempt claim. | Test with a non-production mail sink. Define and implement bounded retries/backoff or a documented manual retry process, plus stale-claim recovery and delivery idempotency. |
| B10-005 | High | Concurrency and capacity are not proven. | Sequential pgTAP tests and a synthetic lookup benchmark do not prove concurrent reservation/allocation correctness or production capacity. | Run isolated multi-session concurrency tests, lock-contention tests and measured 100/500/1,000/5,000/10,000 seller workloads. Record actual metrics and limits. |
| B10-006 | High | Production deployment and migration runbook sign-off is outstanding. | This batch prohibits deployment and production writes; no production migration or runtime acceptance was performed. | Review backups, migration provenance, deployment order, rollback, environment configuration and post-deploy smoke checks; obtain explicit release approval. |
| B10-007 | High | PR dependency chain remains unresolved. | PR #33 targets feature/partner-admin-email-otp rather than main. | Reconcile the dependency branch and merge sequence deliberately. Do not change the base or merge PR #33 in this batch. |

## Important non-blocking limitations / follow-up work

### Payment lifecycle

- Current SQL tests cover a failed payment not granting credits, a completed subscription payment allocating its configured allowance, and replay not duplicating the allocation.
- These tests exercise database triggers only. They do not validate Paystack/PayFast API calls, signatures, webhook retries, provider reconciliation, refund reversals, automatic renewals, grace periods or customer billing emails.
- Paid checkout remains disabled.

### Marketplace signup and onboarding

- Fixed the profile bootstrap conflict by allowing an empty marketplace selection during initial profile creation.
- Seller signup now requires at least one selection from Takealot, Amazon South Africa and Makro, sends the selection in auth metadata, and the profile bootstrap persists only supported values to profiles.marketplace_access.
- Marketplace selection is stored as a seller preference; it is not used as a substitute for plan/search entitlements.
- The signup preference migration and SQL/quality checks passed at implementation commit 3d49487. Full browser-level enforcement of required Privacy Notice, marketplace-fee estimate acknowledgements and marketplace selection is not yet verified.
- The fee disclaimer remains a signup-only acknowledgement, not a repeated login checklist.

### Notifications

- Database event creation is idempotent using per-user event keys.
- The worker requires SMTP configuration and returns 503 before claiming work if configuration is incomplete.
- Failed sends are marked failed; automatic retry/backoff is not implemented.
- A worker crash after setting email_attempted_at but before setting sent/failed can leave a pending row excluded from the normal queue query. Add safe stale-claim recovery or an operator repair process before production.

### Performance

- The 10,000-seller SQL smoke benchmark passed in isolated CI. It created 10,000 synthetic auth/profile/allocation rows; the allocation insert took 105.83 ms and indexed lookups measured 0.41 ms (100), 0.17 ms (500), 0.20 ms (1,000), 0.79 ms (5,000) and 2.23 ms (10,000).
- It does not measure concurrent sessions, provider latency, production resource limits or end-to-end marketplace search throughput.
- Do not convert its results into a production seller-capacity promise.

## Verified fixes in this continuation

1. New seller profile bootstrap no longer fails solely because marketplace selection is not yet supplied.
2. Invitation tests use the real profile default rather than temporarily forcing Takealot.
3. Partner invitation SQL tests reject wrong-email, expired, revoked and replayed acceptance; successful acceptance remains pending until owner activation.
4. Referral tests reject inactive/suspended programme attribution and self-referrals.
5. Commission tests reject partner self-commission and preserve a valid payment transaction link.
6. RLS tests prove partner-to-partner row isolation and owner visibility, including the seeded SA eChamber programme.
7. Payment-trigger tests prove failed payment does not grant credits and completed subscription payment grants once.
8. Seller-pilot tests cover reservation, duplicate request, completion, refund, daily limit and unsupported marketplace.
9. Supabase CLI workflow is pinned to version 3.2.0 to avoid latest-release API rate-limit failures.

## Do not do during this batch

- Do not deploy to Vercel.
- Do not run production Supabase migrations or writes.
- Do not enable paid checkout.
- Do not send real customer emails or partner invitations.
- Do not contact real payment providers.
- Do not change production secrets.
- Do not merge, close or retarget PR #33.
- Do not modify PRs #34 or #35.
