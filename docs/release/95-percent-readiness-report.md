

## Batch 8 reassessment — 2026-11-22

**Current audited head:** `3c4ca5bf44eb1343f803abdae5e2883b3a212d98`.

The previous 62% score is retained as a conservative development-readiness estimate, not upgraded based on passing lint/build/security checks. The clean database gate is now explicitly confirmed failing, and the regression SQL suite did not execute. The prior score must not be interpreted as a measured production-readiness percentage.

### Current-head evidence

- Quality run [45037052662](https://github.com/Luxolog/ekhaya-commerce-platform/actions/runs/45037052662): ESLint, TypeScript and production build PASS.
- Security run [45037052603](https://github.com/Luxolog/ekhaya-commerce-platform/actions/runs/45037052603): dependency audit, secret scan, CodeQL, Deno Edge Function type-check and auth-guard tests PASS.
- Local DB run [45037052655](https://github.com/Luxolog/ekhaya-commerce-platform/actions/runs/45037052655): FAIL during clean migration replay because `public.partner_programs` is missing when `20261121023000_public_active_referral_partners.sql` is applied. SQL contract tests were skipped.

### Readiness decision

**NOT READY for deployment or live seller onboarding.** The required acceptance condition of a clean migration replay and completed regression suite is unmet. No performance/load capacity result is claimed, and no billing, SMTP or full signup E2E pass is claimed.

Next action is schema/migration reconciliation, not deployment. The standalone partner schema document must be compared against the full migration chain, current functions/triggers, application queries and production migration history before adding a foundational migration. Do not copy the document wholesale or invent missing business rules.
