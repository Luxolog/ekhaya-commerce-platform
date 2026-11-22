# End-to-End Test Matrix

**Mode:** GitHub source inspection and deterministic automated tests only. No live customer identities, production writes, real email or paid provider calls.

| Journey / case | Current evidence | Status | Next verification |
|---|---|---|---|
| Referral code normalisation and active partner matching | `supabase/tests/auth-guards.test.ts` | PASS (unit) | Signup E2E |
| Signup blocks missing privacy acknowledgement | Deno unit test | PASS (unit) | Direct API and UI E2E |
| Signup blocks missing marketplace-fee acknowledgement | Deno unit test | PASS (unit) | Direct API and UI E2E |
| Invitation requires verified email | Invitation guard Deno tests | PASS (unit) | Supabase Auth integration |
| Invitation matches authenticated email | Invitation guard Deno tests | PASS (unit) | Cross-account API E2E |
| Invitation expiry and pending status | Invitation guard Deno tests | PASS (unit) | Database race test |
| Invitation replay/single use | Atomic acceptance RPC locks invitation and programme rows and checks pending status | PARTIAL (source only) | Concurrent acceptance and rollback integration test |
| Partner creation/duplicate slug and code | Source-level checks and database unique-error handling | PARTIAL | Owner API E2E |
| Activation before acceptance | Source blocks missing linked account/accepted invite | PARTIAL | Isolated database E2E |
| Activation after acceptance | Source path exists | PARTIAL | Full owner dashboard journey |
| Referral attribution locked to original active partner | UI/source guard described in PR | PARTIAL | Real signup and referral row verification |
| Search relevance/ranking | `marketplace-search-relevance.test.ts` | PASS (unit) | Marketplace fixture regression |
| Query planning and follow-up selection | Helper unit tests plus source integration in `marketplace-search/index.ts` | PARTIAL | Mock provider orchestration tests for success, partial failure, deduplication and max-three-call budget |
| Seller pilot reservation lifecycle | Request-scoped pilot event table and reserve/complete/refund RPCs; local Supabase config and pgTAP database contract suite added; execution pending | PENDING (workflow added) | Run local migration application and transaction/concurrency tests; expand contract suite into behavioural SQL fixtures |
| Cache hit credit semantics | Shared cache is checked before any pilot, partner or monthly reservation; pure entitlement-routing tests cover owner, partner and seller cache hits | PASS (unit/source) | Isolated database test proving no usage rows/counters are created for cache hits |
| Partner support reservation lifecycle | Request-scoped status and completion/refund RPCs; local pgTAP checks added for schema/function/privilege contract; execution pending | PENDING (workflow added) | Run behavioural SQL tests for daily cap, duplicate IDs, completion, exactly-once refund and concurrent requests |
| Billing/webhook idempotency | Insufficient source/test evidence | BLOCKED | Obtain billing source and sandbox |
| Owner acceptance notification row | Historical transaction-only test documented in PR | PARTIAL | Repeat in isolated DB |
| SMTP owner/partner email delivery | No real delivery evidence | BLOCKED | SMTP sandbox |
| Full seller signup and workspace access | Not run | BLOCKED | Isolated Supabase Auth environment |

| Atomic partner acceptance RPC | Function source locks invitation and partner rows; local pgTAP checks added for existence, SECURITY DEFINER and grants | PENDING (workflow added) | Execute valid/invalid/concurrent acceptance fixtures and rollback assertions |

## CI

Final-head workflows passed:
- Quality: ESLint, TypeScript, production build.
- Security: dependency audit, secret scan, CodeQL, Edge Function type-check and Deno tests.

## Test limitations

A passing pure-function unit test is not a database integration test. A passing build is not an end-to-end test. Local Supabase configuration and a database contract test workflow have been committed; the first workflow execution and behavioural SQL fixtures are still outstanding. Tests requiring SMTP or ReefAPI remain blocked and must use sandbox/mock services.


## Batch 8 verification — 2026-11-22 (head 3c4ca5bf44eb1343f803abdae5e2883b3a212d98)

| Gate | Latest evidence | Result | Notes |
|---|---|---|---|
| Clean local Supabase migration replay | Actions run 45037052655, job 137253015868 | FAIL | Replay stops at `20261121023000_public_active_referral_partners.sql`: `public.partner_programs` does not exist. The pgTAP step is skipped. |
| ESLint | Actions run 45037052662 | PASS | Final-head quality job. |
| TypeScript | Actions run 45037052662 | PASS | Final-head quality job. |
| Production build | Actions run 45037052662 | PASS | Final-head quality job. |
| Dependency audit | Actions run 45037052603 | PASS | Final-head security job. |
| Secret scan | Actions run 45037052603 | PASS | Final-head security job. |
| CodeQL | Actions run 45037052603 | PASS | Final-head security job. |
| Deno / Edge Function type-check | Actions run 45037052603 | PASS | Includes auth-guard regression tests. |
| SQL contract tests | Not reached | NOT RUN | Migration bootstrap failed before `supabase test db`. |
| Behavioural SQL / concurrency tests | No passing evidence | NOT TESTED | Existing pgTAP suite is contract-level only. |
| Full Auth, partner, seller, search and billing E2E | No passing evidence | NOT TESTED / BLOCKED | Unit/source checks do not establish end-to-end behaviour. |

**Interpretation:** Quality and security CI are green, but the database migration gate is red. No full regression-suite completion is claimed.
