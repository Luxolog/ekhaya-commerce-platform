# Ekhaya Price Checker — Appwrite Migration Progress

**Working branch:** `feature/appwrite-migration`  
**Last updated:** 2026-11-12  
**Status:** In progress — not production ready  
**Production remains on Supabase.**

## Verified project state

- Appwrite project: `6af62ccd0026265dd456` (active, Frankfurt)
- TablesDB database: `ekhaya_price_checker`
- Appwrite currently reports 18 tables.
- Appwrite project context reports 0 users and 0 deployed functions.
- Existing frontend still calls Supabase Auth and Supabase Edge Functions directly.
- Existing production domain is not being changed.

## Work completed on this branch

| Item | Result |
|---|---|
| Migration branch | Created: `feature/appwrite-migration` |
| Environment template | Added `.env.example`; no secrets included |
| Server-only Appwrite REST helper | Added `src/lib/appwrite-server.ts` |
| Appwrite email-session route | Added `src/app/api/auth/session/route.ts` |
| URL normalization bug | Corrected in server helper |
| Appwrite database inventory | Confirmed 18 tables exist |
| Plan seed data | Previously seeded: Starter, Growth, Pro, Business and allowance rows |

## Latest commit

- `b373a4b4fc91502f56f84fcfc08adf451eccfcbd` — Fix Appwrite server URL path normalization

## Important findings and blockers

1. **Static export conflicts with server APIs.** `next.config.ts` currently sets `output: 'export'`, while the migration introduces Next.js route handlers that require a server runtime. `capacitor.config.ts` currently expects the static `out` directory. A deployment architecture decision and a separate mobile packaging strategy are required before enabling server routes in the app build. Do not silently remove static export or break Android packaging.
2. **Schema parity is not yet established.** The Appwrite database has 18 tables, but each table's columns, types, required/default settings, indexes and constraints must be compared against all relevant Supabase migrations. The initial multi-tenant commerce schema in `0001_core_schema.sql` is separate from the Price Checker account and billing schema and must not be mistaken for the 18-table Price Checker schema.
3. **Permissions are not verified.** Tables have row security enabled and currently empty table-level permissions. Row security alone does not prove that user-level access is correctly configured. Server-side API-key access must be guarded by verified Appwrite session and owner checks on every private operation.
4. **Authentication is only a starting point.** The session route does not yet provide registration, verification, recovery, owner-role enforcement, profile provisioning or tested session lifecycle.
5. **No Appwrite functions have been deployed.** ReefAPI search, product identification, credit accounting, cache, owner controls and rate limiting still need migration.
6. **No automated build/test result is recorded for this branch yet.** The GitHub connector can inspect and commit source, but this session has not run the repository's local package install, TypeScript check, tests or production build.

## Latest architecture and schema audit updates

- Architecture decision recorded in `docs/appwrite-architecture-decision.md`: preserve static Next.js export/Capacitor packaging and implement privileged backend APIs as Appwrite Functions. The existing Next.js session route is not suitable for the static export build and remains a prototype, not an integrated auth path.
- Initial live Appwrite schema comparison recorded in `docs/appwrite-schema-audit.md`. Confirmed discrepancies include subscription billing mode/columns, cache fields, search-credit uniqueness, payment transaction fields/status, and missing index coverage.
- No schema mutations have been applied while the source-of-truth differences and current business pricing are being reconciled.

## Latest implementation changes\n\n- Removed the incompatible, unintegrated Next.js session route from the migration branch. Supabase production is unaffected.\n- Added an Appwrite Node Function scaffold that verifies the invocation JWT against the Appwrite Account API and checks the authenticated user ID. This is not yet deployed, and its runtime contract still needs an Appwrite preview execution test.\n\n## Next work sequence

1. Resolve server-rendered API versus static Android packaging architecture without changing production.
2. Complete an authoritative schema inventory from Supabase migrations and compare all 18 Appwrite tables; record every discrepancy before making schema changes.
3. Add a tested server-side Appwrite session verification and authorization layer.
4. Implement registration, email verification and recovery routes.
5. Port profile provisioning, seller marketplace preferences and owner role checks.
6. Port search, provider integration, credit reservation/completion/refund and cache behavior.
7. Port barcode/photo identification and owner operations.
8. Add automated tests and CI; verify a Vercel preview deployment.
9. Complete seller/owner/billing/marketplace acceptance tests and cutover documentation.

## Safety status

- No Supabase data has been deleted.
- No Supabase production application has been disabled.
- No production DNS, production environment variables or production deployment has been changed.
- No Coki Driving School resources have been modified.
- No secrets or passwords are recorded in this document.

## Completion estimate

**Not yet meaningfully measurable.** The project is at the infrastructure and initial authentication scaffolding stage. A percentage would be misleading until schema parity and the runtime architecture are resolved.

## 2026-11-12 continued implementation

- Added CI workflow `.github/workflows/appwrite-migration-validation.yml` to run npm ci, ESLint, static Next.js build, Capacitor asset existence check, and Appwrite Function JavaScript syntax validation on migration-branch pushes/PRs. Workflow has been committed but no GitHub Actions run has yet been observed.
- Added and verified additive schema fields: cache variant label and update timestamp; subscription introductory-payment and grace-period timestamps; payment merchant reference, payment kind and canonical provider field.
- Added unique merchant-reference index; Appwrite initially reported the index as `processing`. Confirm final status before relying on it.
- Attempt to add `marketplace_price_cache.last_error` was rejected by Appwrite with `column_limit_exceeded`. No existing columns were dropped.
- Schema parity is still incomplete. Search credit uniqueness, subscription billing-mode enum, payment status vocabulary, partial indexes and missing columns remain unresolved.
- Appwrite Function remains source-only. Deployment requires a linked Appwrite VCS installation or packaged deployment artifact and a verified runtime test.
- Current branch contains a CI workflow; check its run status before reporting tests as passed.


## 2026-11-13 continued verification

- Re-queried the live Appwrite schema for `subscriptions`, `search_credit_events`, and `payment_transactions`.
- Confirmed `payment_transactions.merchant_reference_unique` is now **available**.
- Confirmed the two added subscription timestamps are available.
- Confirmed two important blockers remain unchanged: `subscriptions.billing_mode` uses `manual/recurring` instead of source `manual/automatic`; `search_credit_events` uniqueness is still only `request_id`, not source composite uniqueness.
- Confirmed payment transaction status still uses `paid` rather than source `complete`, and the legacy required `provider` field remains alongside the new canonical `payment_provider`.
- Confirmed Appwrite exposes a Node.js 22 function runtime. The function has not been deployed or execution-tested.
- No schema-destructive changes, production changes, Supabase changes, or Coki project changes were made.


## 2026-11-13 credit-ledger domain layer

- Added `functions/price-checker-api/src/credit-ledger.js` with request validation, stable composite event row IDs, UTC month-boundary calculation, and allowed credit state transitions.
- Added Node's built-in test suite at `functions/price-checker-api/test/credit-ledger.test.js`.
- Added `npm test` to the function package and wired the test suite into the Appwrite migration GitHub Actions workflow.
- These are deterministic domain rules and unit tests only. They do **not** yet reserve, complete or refund real credits in Appwrite.
- The live `search_credit_events` unique index remains incorrectly scoped to `request_id` alone. No attempt was made to delete or replace it because the live schema/data impact must be reviewed first.
- Next step: implement Appwrite TablesDB transaction-backed reservation/completion/refund operations, after confirming the transaction operation payload contract and resolving the legacy unique index without risking existing data.


## 2026-11-13 transactional credit service implementation

- Added `src/credit-service.js` with reserve, complete and refund orchestration behind an explicit transaction-capable storage adapter.
- Added tests for same-request idempotency, separate marketplace events, concurrent quota limits, refund-once behavior and completion/refund state transitions.
- The service requires a storage adapter whose `withTransaction` method guarantees atomic commit/rollback. The Appwrite TablesDB adapter is **not yet implemented**; no claim is made that this code currently writes to Appwrite.
- Important adapter requirements: use deterministic composite row IDs; handle unique-conflict races by aborting/re-reading; atomically update the usage counter and event row; decrement only for a reserved event in the event's original period; never accept user ID, plan limit or account status from untrusted client input.
- The current Appwrite legacy unique index on `request_id` remains a schema blocker. The safest migration path under review is a new versioned credit-event table with a composite unique index, followed by a controlled backfill/verification; do not delete the legacy index in place.
- Automated tests are wired into GitHub Actions but still require a completed workflow run to confirm execution.
