# Architecture Decision: Appwrite backend with static Next.js client

**Status:** Proposed implementation direction  
**Date:** 2026-11-12  
**Scope:** Ekhaya Price Checker migration branch only

## Context

The existing Next.js project sets `output: 'export'` and Capacitor packages the generated `out` directory as the Android web bundle. Next.js route handlers such as `src/app/api/auth/session/route.ts` require a server runtime and are not compatible with a fully static export.

The product needs secure server-side operations for ReefAPI credentials, search-credit reservation/refund, cache writes, payment webhook validation, owner operations and rate limiting.

## Decision

Keep the current static-export architecture for the web client and Android packaging. Put privileged operations in Appwrite Functions (server-side runtime), not in Next.js route handlers.

- The browser/mobile client may use the Appwrite client SDK for user authentication and invoking permitted Appwrite Functions.
- ReefAPI, PayFast and Appwrite API keys remain inside Appwrite Function environment variables.
- Every privileged Function must validate the caller's Appwrite identity, profile status, marketplace entitlement and owner role as appropriate.
- Functions use a server API key only after caller authentication and authorization. Never rely on client-supplied user IDs or role claims.
- Private tables remain inaccessible to unauthenticated users and ordinary clients. Functions perform privileged database access.
- Keep static export and Capacitor's `out` directory intact.

## Consequences

- The current Next.js `/api/auth/session` route cannot be used in the static export build. It is a prototype only and must not be wired into the static client.
- Appwrite Functions become the secure API layer.
- The frontend must use Appwrite client SDK session auth and invoke Functions; no provider secrets enter browser bundles.
- Vercel preview remains a static frontend deployment; Functions deploy to the separate Appwrite project.
- This decision preserves the existing Android packaging approach and avoids introducing a second always-on application server.

## Security and release guardrails

- Do not change `next.config.ts` or production hosting as part of this decision.
- Do not remove or migrate the Supabase production application.
- Do not deploy any Appwrite Function with production secrets until the function code and permissions have been reviewed.
- The migration branch remains isolated until preview and acceptance testing pass.
