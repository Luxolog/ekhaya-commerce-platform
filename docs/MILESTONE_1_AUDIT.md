# Milestone 1 — Source and Database Audit

**Date:** 22 November 2026  
**Branch:** `feature/ai-marketing-neon-integration`  
**Status:** Audit findings recorded; no database writes or production changes made.

## Repositories and runtime

- AI Marketing source: `Luxolog/ekhaya-commerce-platform`, branch `feature/ai-marketing-addon`.
- Integration work branch: `feature/ai-marketing-neon-integration`.
- Support Desk: `Luxolog/ekhaya-support-desk`, inspected on `main`.
- Support Desk uses Next.js, `@neon/auth`, `@neondatabase/serverless` and Drizzle ORM. Its database helper uses `DATABASE_URL`; its server auth helper uses `NEON_AUTH_BASE_URL` and `NEON_AUTH_COOKIE_SECRET`.
- Support Desk session reads are server-side. `requireMembership()` derives the user from Neon Auth and validates active membership against `support.workspace_members`. Workspace switching also validates membership before setting an HTTP-only cookie.

## Neon environment verified

- Project: `super-paper-86763390`; database: `neondb`.
- Test branch: `support-desk-live-test` (`br-royal-cake-bab2w298`), state `ready`.
- Production branch: `production` (`br-lucky-wildflower-bau7s8vj`), state `ready`.
- Test branch is a child of production. This audit queried only the test branch.
- Existing schemas: `neon_auth` and `support`; no AI Marketing `marketing` schema currently appears in the inspected table inventory.
- Verified `neon_auth."user".id` is UUID. `support.workspace_members.user_id` is a UUID FK to that column. Membership roles are constrained to `admin`, `support_agent`, and `customer`.
- The shared CRM foundations already exist: `support.customers`, `support.leads`, `support.marketing_campaigns`, `support.marketing_consents`, `support.marketing_unsubscribe_tokens`, and `support.ai_usage`.
- Test-branch row counts at audit time: workspaces 0, memberships 0, customers 0, leads 0, tickets 0, Support Desk marketing campaigns 0, consents 0, unsubscribe tokens 0. These counts are observations at audit time, not permission to reset or delete anything.

## AI Marketing inventory

The AI Marketing branch contains 16 marketing-specific migrations:
- seller marketing plans, subscriptions, usage events, campaign and payment ledger;
- usage consume/release RPCs and quota hardening;
- calendar posts and campaign templates;
- research reports;
- seller brand profiles and product library;
- seller contacts, email campaigns and consent validation;
- automation rules, runs, analytics and delivery events;
- worker claiming, scheduling, action execution and stale-run recovery.

The AI Marketing UI is present under `src/app/account/marketing` with overview, brand, contacts, intelligence, analytics and automation sections. Its current browser implementation directly calls Supabase REST endpoints and Supabase Edge Functions. The dashboard stores/refreshes an `ekhaya_session` in browser localStorage and uses Supabase access/refresh tokens. This is a major runtime migration dependency: replacing SQL alone will not make the application use Neon Auth.

The Edge Functions use Supabase JS and service-role credentials. The generation and weekly-plan functions depend on Supabase user authentication and RPC/table operations. The worker uses a shared secret and privileged Supabase client. The Paystack marketing billing function is hard-disabled in code and must remain disabled.

## Material compatibility findings

1. **Identity mismatch:** Marketing migrations reference `auth.users` and `auth.uid()`; Neon Auth uses `neon_auth."user"` and server-side session resolution. These references need an explicit UUID identity and authorization adapter; they cannot be mechanically renamed.
2. **Workspace authorization:** Support Desk already validates membership server-side. Marketing must reuse that verified membership and workspace scope. Do not trust browser-supplied user/workspace IDs.
3. **Role model:** Support Desk's current membership constraint has only `admin`, `support_agent`, `customer`. No `seller` role is currently allowed. A seller authorization design must be additive and must not weaken Support Desk role enforcement.
4. **Campaign table collision:** AI Marketing's `public.marketing_campaigns` is seller/user-scoped and contains marketing content/planning fields. Support Desk's `support.marketing_campaigns` is workspace-scoped, channel/status/approval focused. They are different contracts and must not be merged or renamed. Use an explicit adapter/relationship or keep marketing-specific campaign records in the new `marketing` schema.
5. **CRM and consent:** Support Desk consent records are workspace-scoped and point to either a customer or lead. Marketing contacts are currently a separate seller/user-scoped model. Integration requires deterministic mapping to shared customer/lead records and channel-specific consent checks; avoid a second consent or unsubscribe system.
6. **Privilege model:** Supabase RLS roles and RPC grants cannot be assumed to exist in Neon. All privileged mutations need server-side Neon Auth session checks, active membership checks, tenant scoping, and carefully restricted database credentials.
7. **Billing:** Marketing subscriptions and usage must remain separate from marketplace billing/search credits. Paystack marketing checkout is disabled in both UI and function logic; keep it disabled.
8. **Delivery:** No live email/SMS/WhatsApp/social publishing should be enabled during migration or tests.

## Safety and validation status

- Read-only schema and row-count queries executed on the Neon test branch.
- No Neon migrations applied; no data modified.
- No production branch accessed for writes.
- No Vercel deployment, merge, live delivery or payment processing performed.
- No automated integration tests have been run yet.

## Recommended implementation sequence

1. Design the identity/workspace bridge and additive `marketing` schema around the existing Support Desk contracts.
2. Port migration objects and quota/automation routines with explicit authorization semantics.
3. Build server-side Neon-backed API routes/actions and replace browser Supabase token/REST usage.
4. Port generation, weekly planning and worker runtime behind authenticated server handlers; retain kill switches.
5. Map marketing contacts to Support Desk customers/leads and enforce the shared consent/unsubscribe source of truth.
6. Port billing records while leaving checkout disabled.
7. Add isolated tenant, consent, worker and Support Desk regression tests before considering deployment.

**Audit conclusion:** The integration is feasible on the existing Neon project, but it is not a database-only migration. The highest-risk work is replacing the browser-side Supabase session/REST contract with server-side Neon Auth and a verified workspace/tenant authorization layer, while keeping the two different campaign models distinct.
