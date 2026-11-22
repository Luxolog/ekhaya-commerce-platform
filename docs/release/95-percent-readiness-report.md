# Ekhaya Price Checker — Development Readiness

**Audit date:** 2026-11-22  
**Repository:** `Luxolog/ekhaya-commerce-platform`  
**Branch:** `feature/saechamber-public-showcase`  
**Audited head at start:** `c619920c2f69f5ac8abdd039b9f0027cff544616`  
**PR:** [#33](https://github.com/Luxolog/ekhaya-commerce-platform/pull/33), open and unmerged

## Executive result

**Evidence-backed development readiness: 57% — below the 95% target.**

This is a conservative engineering estimate using the weighted scorecard below. It is not a production-readiness certification. No production environment was changed during this audit.

| Area | Weight | Awarded | Status | Evidence / limitation |
|---|---:|---:|---|---|
| Security and authentication | 15 | 12 | PARTIAL | Referral navigation scheme allowlist fix is committed; CodeQL, secret scan, dependency audit and Edge Function checks passed. Live Auth/OTP abuse cases not integration-tested. |
| Seller signup and account protection | 10 | 6 | PARTIAL | UI guards and acknowledgement checks exist with unit coverage. Direct API and real signup/workspace flow not verified. |
| Partner and referral lifecycle | 15 | 9 | PARTIAL | Owner checks, invitation guards, activation logic and referral locks exist. Real invite/accept/link/activate/referral journey and email delivery remain unverified. |
| Marketplace search and relevance | 15 | 7 | PARTIAL | Relevance ranking and bounded query-planning helpers have tests. Planner is not consumed by `marketplace-search/index.ts`; no live multi-query discovery. |
| Seller credits and pilot protection | 15 | 7 | PARTIAL | Reserve/complete/refund RPC paths are present in source. No new mocked integration tests prove all failure, retry, duplicate and concurrency cases. |
| Cache, provider reliability and performance | 10 | 6 | PARTIAL | Cache read/write paths and Makro postal-code handling exist. Timeout, concurrency and partial-provider-failure coverage is incomplete. |
| Billing and subscriptions | 5 | 1 | BLOCKED | Billing source and webhook idempotency are not sufficiently available in this branch for verification. |
| Database and migration safety | 5 | 2 | BLOCKED | Branch migration files can be reviewed, but production migration history/RLS/Auth configuration cannot be reconciled from this GitHub-only audit. |
| Notifications and email | 5 | 3 | PARTIAL | Notification worker and idempotency migration exist; notification row testing is documented historically. Actual SMTP delivery is not verified. |
| Automated testing and build quality | 5 | 4 | PARTIAL | Final-head quality and security workflows passed. Existing Deno tests run; no isolated full-stack E2E suite. |
| **Total** | **100** | **57** | | |

## Verified CI on audited head

Commit: `c619920c2f69f5ac8abdd039b9f0027cff544616`

- [Quality checks run 45010909803](https://github.com/Luxolog/ekhaya-commerce-platform/actions/runs/45010909803): passed — ESLint, TypeScript and Next.js production build.
- [Security checks run 45010909826](https://github.com/Luxolog/ekhaya-commerce-platform/actions/runs/45010909826): passed — Gitleaks, dependency audit, CodeQL, Edge Function type-check and Deno regression tests.

A green CI run does not prove live end-to-end behaviour.

## Confirmed source-level capability

- Takealot, Amazon South Africa and Makro are enabled in the branch.
- Bob Shop and Leroy Merlin are explicitly unavailable for live search.
- Product relevance ranking separates best matches, related items and accessories.
- Query-plan and conditional follow-up helpers exist, but are not integrated into provider orchestration.
- Seller pilot and monthly credit RPC calls are present in marketplace-search source.
- Partner invitation acceptance checks verified email, invitation status/expiry and invited-email ownership.
- Owner partner creation and activation require owner access; activation checks for a linked account and accepted invitation.

## Release decision

**Not ready for controlled live seller onboarding or production release.** First obtain an isolated non-production Supabase/Auth environment and safe provider test credentials, complete the blocked integration tests, reconcile the PR dependency branch and production/source differences, then repeat this scorecard.

## Production safety

This audit performed no Supabase deployment, migration, production database/Auth mutation, Vercel deployment, paid ReefAPI request, invitation send, payment or PR merge. Production `marketplace-search` version 59 was not intentionally modified; this GitHub-only audit cannot independently attest the current deployed version.
