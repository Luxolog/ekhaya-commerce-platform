

## Batch 8 — confirmed blockers and current-head CI (2026-11-22)

Current audited head: `3c4ca5bf44eb1343f803abdae5e2883b3a212d98`.

### Critical blocker: clean migration replay

- Actions run [45037052655](https://github.com/Luxolog/ekhaya-commerce-platform/actions/runs/45037052655) failed during `supabase start` migration application.
- Exact failure: `relation "public.partner_programs" does not exist` while applying `20261121023000_public_active_referral_partners.sql`.
- The migration calls `public.get_active_referral_partners()` and references `public.partner_programs`, but no earlier migration in the replay creates that relation.
- `supabase test db` was skipped. Therefore the existing 23 pgTAP assertions have not run on a clean database.
- A standalone `docs/sa-echamber-partner-portal-schema.sql` exists, but it is not a migration and cannot be treated as replay evidence. It contains additional tables, triggers and commission assumptions that must be reconciled with the branch before converting any portion into a migration.

### Passed current-head CI

- [Quality run 45037052662](https://github.com/Luxolog/ekhaya-commerce-platform/actions/runs/45037052662): ESLint, TypeScript and production build passed.
- [Security run 45037052603](https://github.com/Luxolog/ekhaya-commerce-platform/actions/runs/45037052603): dependency audit, secret scan, CodeQL, Edge Function type-check and auth-guard regression tests passed.

### Still not evidenced

- Behavioural SQL tests for reservation, completion, refund, limits, concurrency and atomic invitation acceptance.
- Full seller signup/workspace, partner invitation/acceptance/activation/referral, and billing/webhook integration tests.
- Mocked provider orchestration and repeatable load/capacity benchmarks.
- Slow-query and Edge Function latency measurements; no performance numbers should be inferred from source review.
- Complete local/preview/production environment-variable inventory and a reviewed deployment runbook.
- Production migration/function source parity and Auth/RLS dashboard settings; production remains outside this batch's write scope.

**Release status: NOT READY.** Resolve the missing partner schema migration dependency, rerun clean replay and SQL tests, then complete behavioural and operational gates before reconsidering release.
