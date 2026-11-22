

## Batch 8 local replay finding — 2026-11-22

Current branch head `3c4ca5bf44eb1343f803abdae5e2883b3a212d98` was tested by GitHub Actions using the isolated local Supabase configuration. The replay failed before database contract tests:

- Failing migration: `20261121023000_public_active_referral_partners.sql`.
- Missing dependency: `public.partner_programs`.
- Result: local migration bootstrap FAIL; pgTAP test step SKIPPED.

This is a branch migration-history defect, not evidence that production is missing the table. The table exists in the separately documented production partner schema context, but the clean branch replay does not create it before the function migration references it. The standalone SQL document is not proof of migration order or production parity.

**Safety boundary maintained:** this Batch 8 verification used GitHub Actions and an isolated local Supabase stack. No production migration, schema/data/Auth/RLS/secret/function change, Vercel deployment, provider request, email, invitation or payment was performed.

**Required before any production migration:** reconcile the standalone partner schema with all branch migrations and the read-only production migration inventory; determine which objects are already present, identify version/name drift, and prepare a separately reviewed forward-only migration plan. Do not apply or repair production as part of this batch.
