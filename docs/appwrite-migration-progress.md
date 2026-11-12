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
