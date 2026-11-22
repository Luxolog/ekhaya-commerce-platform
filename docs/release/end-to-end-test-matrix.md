

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
