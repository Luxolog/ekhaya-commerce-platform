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
| Seller pilot reservation lifecycle | Request-scoped pilot event table and reserve/complete/refund RPCs; clean local replay and pgTAP suite passed | PASS (schema/contract only) | Run local migration application and transaction/concurrency tests; expand contract suite into behavioural SQL fixtures |
| Cache hit credit semantics | Shared cache is checked before any pilot, partner or monthly reservation; pure entitlement-routing tests cover owner, partner and seller cache hits | PASS (unit/source) | Isolated database test proving no usage rows/counters are created for cache hits |
| Partner support reservation lifecycle | Request-scoped status and completion/refund RPCs; clean local replay and pgTAP suite passed | PASS (schema/contract only) | Run behavioural SQL tests for daily cap, duplicate IDs, completion, exactly-once refund and concurrent requests |
| Billing/webhook idempotency | Insufficient source/test evidence | BLOCKED | Obtain billing source and sandbox |
| Owner acceptance notification row | Historical transaction-only test documented in PR | PARTIAL | Repeat in isolated DB |
| SMTP owner/partner email delivery | No real delivery evidence | BLOCKED | SMTP sandbox |
| Full seller signup and workspace access | Not run | BLOCKED | Isolated Supabase Auth environment |

| Atomic partner acceptance RPC | Function source locks invitation and partner rows; clean local replay and pgTAP checks passed for existence, SECURITY DEFINER and grants | PASS (contract only) | Execute valid/invalid/concurrent acceptance fixtures and rollback assertions |

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


## Batch 8 execution update — 2026-11-22

**Audited commit:** `59dcd4c3a8721469f5a763ad1099492e7a5c02e5`  
**PR:** #33 — remains open and unmerged.

### Final-head CI evidence

| Gate | Workflow run | Result | Evidence |
|---|---:|---|---|
| ESLint | [45051417372](https://github.com/Luxolog/ekhaya-commerce-platform/actions/runs/45051417372) | PASS | Lint step completed successfully |
| TypeScript | [45051417372](https://github.com/Luxolog/ekhaya-commerce-platform/actions/runs/45051417372) | PASS | `npx tsc --noEmit` completed successfully |
| Production build | [45051417372](https://github.com/Luxolog/ekhaya-commerce-platform/actions/runs/45051417372) | PASS | `npm run build` completed successfully |
| Dependency audit | [45051417457](https://github.com/Luxolog/ekhaya-commerce-platform/actions/runs/45051417457) | PASS | `npm audit --audit-level=moderate` |
| Secret scan | [45051417457](https://github.com/Luxolog/ekhaya-commerce-platform/actions/runs/45051417457) | PASS | Gitleaks action completed successfully |
| CodeQL | [45051417457](https://github.com/Luxolog/ekhaya-commerce-platform/actions/runs/45051417457) | PASS | Analysis completed successfully |
| Deno / Edge Function checks | [45051417457](https://github.com/Luxolog/ekhaya-commerce-platform/actions/runs/45051417457) | PASS | Six configured Edge Functions type-checked; auth guard Deno tests passed |
| Clean local migration replay | [45051417432](https://github.com/Luxolog/ekhaya-commerce-platform/actions/runs/45051417432) | FAIL | Replay stops at `20261121023000_public_active_referral_partners.sql`: `public.partner_programs` is missing |
| pgTAP SQL contract suite | [45051417432](https://github.com/Luxolog/ekhaya-commerce-platform/actions/runs/45051417432) | NOT RUN | Test step skipped because migration startup failed |

### Contract tests versus behavioural tests

- **Contract coverage only:** the committed pgTAP suite contains 23 assertions for schema/function presence, SECURITY DEFINER attributes, RLS, uniqueness and service-role grants. It has not executed on a clean database.
- **Behavioural database coverage:** reservation, completion, refund, limits, concurrency, invitation acceptance and rollback have no passing isolated database evidence.
- **Unit/source coverage:** auth guards, acknowledgement checks, referral matching, search relevance and helper-level routing are not substitutes for database or full API/UI E2E tests.
- **Full integration/E2E:** seller signup/workspace, partner create/invite/accept/link/activate/referral, billing/webhooks and SMTP delivery remain unverified or blocked.

### Result

The quality and security workflows are green on the audited commit, but the migration gate is red and SQL contract tests did not run. The complete regression suite is **NOT COMPLETE**. No clean migration replay, full regression pass or production readiness claim is made.


## Batch 9 execution update — 2026-11-22

**Tested code head:** `8f1f583a706f820894942e7e86542c0d56de773f`  
**PR:** #33 — remains open and unmerged.

### Clean local Supabase replay and contract tests

<badge color="success">PASS</badge>

- Workflow: [45057734774](https://github.com/Luxolog/ekhaya-commerce-platform/actions/runs/45057734774)
- The isolated Supabase stack started successfully.
- All 21 branch migrations applied in order, including the new `20261121020000_partner_payment_foundation.sql`.
- `20261122090359_standard_ekhaya_account_ids.sql` passed after its `LOCK TABLE` operation was wrapped in an explicit transaction.
- `supabase test db` passed both SQL files:
  - `credit_lifecycle_contract.test.sql`: 23 assertions.
  - `partner-foundation.test.sql`: 25 assertions.
- Total: **48 assertions passed**. Local Supabase stack stopped cleanly.

### Quality and security

| Gate | Workflow | Result |
|---|---|---|
| ESLint, TypeScript, production build | [45057738336](https://github.com/Luxolog/ekhaya-commerce-platform/actions/runs/45057738336) | PASS |
| CodeQL | [45057738264](https://github.com/Luxolog/ekhaya-commerce-platform/actions/runs/45057738264) | PASS |
| Secret scanning | [45057738264](https://github.com/Luxolog/ekhaya-commerce-platform/actions/runs/45057738264) | PASS |
| Dependency vulnerability audit | [45057738264](https://github.com/Luxolog/ekhaya-commerce-platform/actions/runs/45057738264) | PASS |
| Supabase Edge Function type-check | [45057738264](https://github.com/Luxolog/ekhaya-commerce-platform/actions/runs/45057738264) | PASS |
| Ekhaya Security Scanning | [45057734776](https://github.com/Luxolog/ekhaya-commerce-platform/actions/runs/45057734776) | PASS |

### What this proves — and what it does not

- **Proven:** empty local database migration replay; presence of partner/payment/paid-credit schema; RLS enabled on key partner/payment tables; commission-payment FK and uniqueness; notification idempotency; role grants; pending partner programme default; existing credit-lifecycle contracts.
- **Not proven:** concurrent invitation acceptance, actual partner referral capture against Auth, payment webhook processing with provider sandbox, actual paid credit allocation on a completed payment, renewal/reminder jobs, SMTP delivery, full owner dashboard journey, or seller signup/workspace E2E.
- The current live Paystack Edge Function source has a hard checkout release gate set to disabled. No provider request was sent and no paid checkout was tested.

**Release interpretation:** database migration replay and schema contract gate are now green. Full behavioural regression and live acceptance remain incomplete; this is not production deployment approval.
