# Ekhaya Price Checker — Development Readiness

**Audit date:** 2026-11-22  
**Repository:** `Luxolog/ekhaya-commerce-platform`  
**Branch:** `feature/saechamber-public-showcase`  
**Audited head:** `2f928710052085b7d81f79395c5ef91ebd3bd2e0`  
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

## Verified CI on audited head

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
