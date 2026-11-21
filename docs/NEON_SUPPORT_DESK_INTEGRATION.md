# Ekhaya AI Marketing + Support Desk on Neon

## Status

- Integration branch: `feature/ai-marketing-neon-integration`
- Source branch: `feature/ai-marketing-addon`
- Target environment: Neon project `super-paper-86763390`, branch `support-desk-live-test`, database `neondb`
- Production branch is out of scope for this work.
- Ekhaya Price Checker is out of scope and must remain untouched.
- No Vercel deployment, production migration, live email, or social publishing is authorized by this integration task.

## Confirmed Neon foundations

The existing test branch has a managed Neon Auth schema (`neon_auth`) with Better Auth tables, including `neon_auth.user`. Its user primary key is UUID.

The existing Support Desk schema (`support`) already owns:
- Workspaces and workspace memberships
- Customers, leads, and lead events
- Marketing campaigns
- Channel consent records and unsubscribe tokens
- AI usage records
- Ticketing, knowledge base, and departments

The existing membership model links `support.workspace_members.user_id` to `neon_auth.user.id`. Workspace membership roles currently include `admin`, `support_agent`, and `customer`.

## Integration decisions

1. Reuse Neon Auth. Do not create a second user table or retain Supabase Auth as a runtime dependency.
2. Reuse Support Desk's workspace, membership, customer, lead, consent, and unsubscribe records where the domain matches. Do not duplicate these tables under another schema.
3. Keep AI Marketing-specific seller product data isolated in a dedicated `marketing` schema (or a clearly namespaced equivalent), including plan catalogue, seller marketing entitlements, usage ledger, payment ledger, brand/product profiles, automation definitions/runs, and delivery/audit events.
4. Every seller-owned record must be workspace-scoped and checked against active membership on the server. Do not trust workspace IDs or user IDs supplied by the browser.
5. Preserve the separation between marketplace/search-credit billing and AI Marketing usage/billing. Do not reuse or mutate Price Checker credit allocations.
6. Keep external delivery providers disabled until provider credentials, consent enforcement, unsubscribe handling, rate limits, and operator controls are verified.
7. Use server-side database access and Neon-compatible runtime handlers for privileged operations. No service credentials in browser bundles.

## Migration work sequence

1. Inventory all current AI Marketing migrations, functions, routes, and Supabase client usage.
2. Map Supabase Auth identity to Neon Auth UUID and workspace membership.
3. Map overlapping CRM/campaign/consent objects to the existing `support` schema; add only missing fields or supporting tables through additive migrations.
4. Port AI Marketing-only tables and RPC/worker logic into the isolated `marketing` schema.
5. Replace Supabase Edge Functions with server-side handlers compatible with the app runtime.
6. Add migration and integration tests for tenant isolation, role enforcement, quota idempotency, consent suppression, unsubscribe processing, automation retries, and stale worker leases.
7. Apply and verify changes on the Neon test branch only. Keep production untouched pending a separate approval.

## Safety and release gates

- Never run destructive SQL against the shared Support Desk schema.
- Never reset or replace the existing Support Desk test branch.
- Never apply schema changes to the Neon production branch as part of this work.
- No real customer messages or external campaign sends during testing.
- Do not merge the integration branch or deploy to Vercel without separate approval.
- Record each migration, test result, and remaining blocker in this document or the integration milestone log.

## Initial inspection findings

The Support Desk test branch contains existing `support.marketing_campaigns`, `support.marketing_consents`, `support.marketing_unsubscribe_tokens`, `support.ai_usage`, `support.customers`, and `support.leads` tables. These are shared foundations and must be inspected and reused rather than recreated.

The existing `support.marketing_campaigns` is workspace-scoped and includes campaign approval fields. It is not structurally identical to the AI Marketing seller campaign table; integration must preserve its current records and behavior and add only a deliberate compatibility layer if required.
