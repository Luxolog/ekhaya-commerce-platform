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
| Seller pilot reservation lifecycle | Request-scoped pilot event table and reserve/complete/refund RPCs; Deno tests cover entitlement routing but not SQL transaction behaviour | PARTIAL (source only) | Isolated SQL tests for duplicate requests, exactly-once refund, daily/total limits and concurrency |
| Cache hit credit semantics | Shared cache is checked before any pilot, partner or monthly reservation; pure entitlement-routing tests cover owner, partner and seller cache hits | PASS (unit/source) | Isolated database test proving no usage rows/counters are created for cache hits |
| Partner support reservation lifecycle | Request-scoped status and completion/refund RPCs; refund retains unique request row | PARTIAL (source only) | Isolated SQL tests for daily cap, duplicate IDs, completion and exactly-once refund |
| Billing/webhook idempotency | Insufficient source/test evidence | BLOCKED | Obtain billing source and sandbox |
| Owner acceptance notification row | Historical transaction-only test documented in PR | PARTIAL | Repeat in isolated DB |
| SMTP owner/partner email delivery | No real delivery evidence | BLOCKED | SMTP sandbox |
| Full seller signup and workspace access | Not run | BLOCKED | Isolated Supabase Auth environment |

## CI

Final-head workflows passed:
- Quality: ESLint, TypeScript, production build.
- Security: dependency audit, secret scan, CodeQL, Edge Function type-check and Deno tests.

## Test limitations

A passing pure-function unit test is not a database integration test. A passing build is not an end-to-end test. Tests requiring Supabase Auth, database transactions, SMTP or ReefAPI remain blocked until isolated test resources are explicitly configured.
