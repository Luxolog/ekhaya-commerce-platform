# Ekhaya Price Checker — White-label architecture and audit

**Status:** Design baseline only. No production code, production database, or deployment has been changed.
**Working branch:** `feat/price-checker-white-label-foundation`
**Baseline branch:** `main` at `1193c659cfaa05331700d76beceac17e4c8075fb`
**Supabase project:** `ekhaya-commerce-platform` (`itxxnhcjjiynrmivexcb`)

## 1. Product and partnership decisions

The selected commercial direction is:

- Full white-label branding: the partner's brand is customer-facing; Ekhaya Technologies remains disclosed in contractual, privacy, and service-provider documentation where legally required.
- Shared customer relationship: the partner leads acquisition, onboarding, and first-line support; Ekhaya operates the technology, identity, security, and technical escalation.
- Exclusive distribution: exclusivity is limited to a contractually defined market segment, geography, channel, and term. Ekhaya's own direct Price Checker service remains outside the partner's exclusive rights unless a signed agreement expressly says otherwise.
- Ekhaya Technologies retains the source code, core platform IP, infrastructure control, and reusable product improvements.

Commercial percentages, minimum licence payments, seller targets, payment collection ownership, and payout timing remain configurable commercial terms and are **not approved implementation constants**.

## 2. Audit snapshot

### GitHub application

- Repository: `Luxolog/ekhaya-commerce-platform`
- Default branch: `main`
- Baseline commit: `1193c659cfaa05331700d76beceac17e4c8075fb`
- Stack in `package.json`: Next.js 15, React 19, TypeScript, Capacitor 7.
- Existing Price Checker route: `src/app/price-checker/page.tsx`.
- Existing server-side marketplace functions are hosted in Supabase; the web page calls the deployed functions.
- `.gitignore` already excludes environment files, secrets, private keys, customer exports, database backups, logs, dependencies, and build output.
- `.env.example` contains placeholders only; do not commit credentials.

### Supabase live project

- Project status observed: `ACTIVE_HEALTHY`.
- Region: `eu-west-1`; PostgreSQL 17.
- Deployed Edge Functions observed: `marketplace-search` v44, `product-identify` v15, `marketplace-search-test` v15, and `notification-worker` v7.
- The live database query confirms 31 recorded migrations through 2026-11-15 (latest version `20261115173542`). The migration listing API returned a shorter list, so use the database migration table as the authoritative count.
- The repository's tracked migration history does not currently represent the full live migration history. Reconcile this drift before applying any new production migration.
- Current Price Checker records are primarily user-scoped: profiles, subscriptions, marketplace connections, usage, and payments do not yet carry a partner/tenant identifier.
- No dedicated partner/tenant/white-label tables were found in the live public schema.
- Existing shared marketplace cache can remain global because public product-price cache is not inherently partner-owned; search usage, billing, support, and customer records must be attributed and isolated by tenant.
- Security advisor reported 19 RLS-enabled public tables with no policies and leaked-password protection disabled. Some operational tables appear service-role-only, but every table's grants and access path must be reviewed before partner onboarding. Do not expose these tables to browser roles merely to silence the advisor.
- Performance advisor reported several unindexed foreign keys and unused indexes. Prioritise relevant foreign-key indexes only after reviewing query patterns.

### Important documentation drift

The root README describes the app as a static test calculator and says customer registration and live marketplace data are not connected, while the current page and deployed Edge Functions do call the live Supabase project. Update the README only after the end-to-end runtime has been re-verified. Do not rely on README claims as a substitute for live testing.

## 3. Target architecture

Use one multi-tenant application and one core codebase. Do not create a fork or separate deployment per partner.

### Tenant model

Introduce a generic tenant layer:

- `tenants`: tenant identity, slug, type (`ekhaya_direct` or `partner`), lifecycle status, currency, and timestamps.
- `tenant_memberships`: authenticated user membership, role, status, and tenant association. Support a user belonging to more than one tenant without duplicating their global identity.
- `tenant_domains`: verified hostnames, primary-domain flag, verification state, and tenant mapping.
- `tenant_branding`: display name, logo asset reference, colour tokens, favicon, support contact, and customer-facing legal links.
- `partner_contracts`: partner identity, contract status, territory, seller/channel scope, exclusivity dates, performance review dates, and references to signed terms. Legal exclusivity is governed by the signed agreement, not by a UI toggle alone.
- `partner_commercial_terms`: versioned, effective-dated commercial terms. Do not hardcode unapproved commission rates or minimum fees.
- `partner_revenue_ledger`: immutable subscription/payment attribution, fee deductions, partner share, refunds/reversals, settlement status, and payout references.

### Tenant-scoped business records

Keep `profiles` as the global user identity. Add a tenant association or membership relationship to the relevant user-owned records, using a backward-compatible migration and preserving existing users:

- subscriptions and payment transactions;
- marketplace connections and seller identity records;
- monthly/daily search usage, credits, and API usage attribution;
- saved products, alerts, and reports when those features exist;
- pilot access, support requests, and customer communication records where applicable.

Do not add tenant scope to the shared marketplace price cache unless a future provider contract or data licence requires tenant-specific caching. Keep global cache records free of seller credentials and personal data.

### Branding and routing

- Resolve a tenant from a verified hostname on the server.
- Never trust a tenant ID supplied by the browser as proof of access.
- Unknown or unverified domains must resolve to a safe default or an error page, not an arbitrary tenant.
- Load branding from the tenant configuration; do not fork or duplicate application pages.
- Full white-label means partner logo, colours, product name, support links, and emails. Contractual and privacy disclosures must still identify the correct legal entities and processing roles.

### Authentication and authorization

- Keep Supabase Auth as the global identity provider.
- Authorize tenant access through server-validated tenant memberships and database RLS.
- Use `app_metadata` or server-side role records for privileged authorization; never trust user-editable `user_metadata`.
- Every tenant-scoped query must enforce membership in the database as well as in server code.
- Partner admins can manage only their own tenant's members, branding, seller accounts, and reports.
- Ekhaya platform admins can manage tenants centrally through explicit privileged roles.
- Service-role keys remain server-side and must never be sent to the browser or Android package.

## 4. Commercial and customer operating model

- Partner: marketing, seller acquisition, onboarding assistance, education, first-line support, and customer feedback.
- Ekhaya: platform availability, code, infrastructure, security, data-provider integrations, backups, technical support, and product releases.
- Shared: customer experience, complaints escalation, roadmap priorities, privacy incident handling, and monthly reporting.
- Billing collection, merchant-of-record status, refunds, tax invoices, chargebacks, and payout schedule must be explicitly selected in the signed agreement before implementing payment flows.
- Revenue share must be calculated from verified settled payments, with explicit treatment of VAT, gateway fees, refunds, chargebacks, discounts, and bad debt.

## 5. Implementation sequence

1. Reconcile GitHub migration files with the 28 live Supabase migration records. Do not replay historical migrations against production.
2. Confirm the current application routes, deployed function versions, auth/session behaviour, search-credit enforcement, and payment status flow with non-destructive tests.
3. Design and review tenant tables, RLS policies, indexes, and backward-compatible tenant assignment for existing users.
4. Implement server-side verified hostname resolution and a tenant context that is required by every tenant-scoped service.
5. Implement partner administration, branding configuration, verified custom domains, membership management, and tenant-level audit logs.
6. Add partner-aware subscriptions, usage accounting, revenue attribution, and reporting only after commercial payment ownership and settlement rules are approved.
7. Add automated cross-tenant isolation tests, role tests, domain-spoofing tests, and billing attribution tests.
8. Pilot with 10–25 sellers in a non-production environment. Production launch requires explicit sign-off after testing.

## 6. Release safety rules

- Keep `main` and the existing Ekhaya Price Checker production experience unchanged during development.
- Develop only on `feat/price-checker-white-label-foundation` until reviewed.
- Do not deploy to Vercel or change production domains as part of this foundation work.
- Do not apply migrations to the live Supabase project until migration drift is reconciled, the SQL is reviewed, backups/rollback are understood, and tenant-isolation tests pass.
- Never commit secrets, API credentials, seller credentials, or customer data.
- Do not announce the white-label service as available until the partner environment, billing, support, and data isolation are verified.


## 7. No-cost operational health check — 2026-11-17

This check used existing GitHub, Vercel, and Supabase resources only. No Supabase branch, migration, deployment, or paid service was created.

### Production availability

- Latest production Vercel deployment is `READY`, based on `main` commit `1193c659cfaa05331700d76beceac17e4c8075fb`.
- Production aliases include `ekhayatech.co.za`, `pricechecker.ekhayatech.co.za`, and the project Vercel domains.
- The live homepage and `/price-checker/` returned HTTP 200.
- `/account/`, `/pricing/`, `/privacy/`, and `/services/` returned HTTP 200.
- `/download/` returned HTTP 404. The repository app-route inventory has no `src/app/download/page.tsx`; the homepage currently links to this missing route. Fix or remove that navigation link before broader promotion.

### Build and CI

- Android debug APK workflow completed successfully on 2026-11-16.
- CodeQL analysis completed successfully.
- Secret scanning completed successfully.
- Dependency vulnerability audit failed: npm reported 8 vulnerabilities (7 moderate, 1 high). The high finding is in the PostCSS dependency chain. The suggested automatic fix requires a major Next.js upgrade; do not apply `npm audit fix --force` without compatibility review and a successful build.
- The most recent push-triggered security scan on the white-label documentation branch passed its secret scan. Its dependency-review job was skipped because it only runs on pull requests; this is not a dependency-audit pass.
- Main branch protection is disabled. Enable branch protection and require passing checks before accepting code changes.

### Supabase and Edge Functions

- Supabase project status was `ACTIVE_HEALTHY`; PostgreSQL connectivity and read-only queries succeeded.
- Active functions observed: `marketplace-search` v44, `product-identify` v15, `marketplace-search-test` v15, and `notification-worker` v7.
- The previous 24-hour function log window showed 24 marketplace-search executions (logged as version 42) and no product-identify executions. Because those marketplace logs predate the currently deployed v44, they do not prove a fresh request against v44.
- Vercel reported no runtime error clusters in the previous seven days; no matching production error-level runtime logs appeared in the latest 30-minute window.
- Non-sensitive row counts observed: 3 profiles, 0 subscriptions, 0 marketplace connections, 0 payment transactions, 4 notifications, and 1 monthly usage row with 6 searches. This indicates a small live dataset; it does not establish that all customer billing and onboarding flows have been exercised.
- Database migration table query confirms 31 applied migrations, latest `20261115173542`.

### Security and performance observations

- Supabase security advisor reports 19 RLS-enabled tables without policies. The sampled sensitive operational tables had no direct `anon` or `authenticated` SELECT/INSERT grants, which is consistent with service-role-only access; review all grants and function paths before changing policies.
- Leaked-password protection is disabled in Supabase Auth; enable after confirming the authentication impact.
- Performance advisor reports 7 unindexed foreign keys and 36 unused-index notices. Review query patterns before adding or removing indexes.
- No direct live seller search, barcode identification, image OCR, PayFast checkout, or password-reset journey was performed in this read-only check. These remain explicit acceptance tests.

### Next actions — no additional infrastructure cost

1. Add or correct the missing download page/link.
2. Resolve the PostCSS/Next dependency vulnerabilities with a reviewed compatible upgrade; run dependency audit and production build in CI.
3. Verify the current v44 marketplace-search and v15 product-identify functions with an authorised test seller account and a known product.
4. Test signup, login, password reset, search allowance, pilot restrictions, PayFast payment callbacks, notifications, and account suspension end-to-end.
5. Reconcile migration history and review database grants/RLS; do not change production until reviewed.
6. Protect `main` with required passing checks.
7. Only then resume white-label tenant implementation on the existing GitHub feature branch.
