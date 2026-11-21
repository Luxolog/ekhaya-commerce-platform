# AI Marketing Supabase migration runbook

## Release boundary

This runbook is preparatory. No migration is applied by GitHub CI or by this repository change. Production deployment requires explicit release approval and a verified backup.

## Before migration

- Confirm the target Supabase project reference, region, PostgreSQL version and current migration history.
- Confirm the project is the intended non-production environment.
- Take and verify a restorable backup.
- Review the complete diff and confirm the core schema dependencies exist.
- Ensure the CLI version is pinned/recorded and supabase/config.toml is present.
- Never commit access tokens, database passwords or service-role keys.

## Local/non-production sequence

1. Install the Supabase CLI using the official installation method.
2. Authenticate locally; do not put access tokens in repository files.
3. Run supabase link --project-ref <NON_PRODUCTION_PROJECT_REF>.
4. Inspect remote history with supabase migration list.
5. Review pending SQL before execution.
6. Apply only to the isolated non-production project using supabase db push --dry-run followed by supabase db push after approval.
7. Run supabase db lint and the seller-isolation acceptance suite.
8. Verify RLS, grants, RPC execution privileges and application flows.

## AI Marketing migration order

1. 20261121213000_add_ai_marketing_seller_addon.sql
2. 20261121220000_add_ai_marketing_usage_enforcement.sql
3. 20261121230000_add_ai_marketing_calendar.sql
4. 20261122010000_harden_ai_marketing_quota_rpc_search_path.sql
5. 20261122020000_add_marketing_research_reports.sql
6. 20261122030000_expand_marketing_campaigns.sql
7. 20261122040000_allow_seller_campaign_approval.sql
8. 20261122050000_add_marketing_brand_and_products.sql
9. 20261122060000_add_marketing_contacts_and_email_drafts.sql
10. 20261122070000_add_campaign_planning_metadata.sql
11. 20261122080000_add_marketing_automation_analytics_and_email_events.sql
12. 20261122090000_lock_automation_activation_until_worker.sql
13. 20261122100000_add_marketing_automation_worker_runtime.sql
14. 20261122110000_advance_marketing_automation_schedules.sql
15. 20261122120000_execute_marketing_automation_actions.sql
16. 20261122130000_recover_stale_marketing_automation_runs.sql

The preceding core Price Checker migrations must already be present in the target database. Confirm the full migration history; do not apply this AI Marketing subset in isolation.

## Worker lease recovery

The final migration redefines the service-role-only run-claim RPC. A run left in `running` for more than 15 minutes is treated as abandoned: it is requeued if attempts remain or marked failed if the attempt budget is exhausted. The worker claim increments attempts and refreshes `last_attempt_at`. Test this behaviour under concurrent worker invocations in an isolated database before scheduling the worker. The lease is a recovery mechanism, not proof that a long-running worker cannot overlap; keep internal actions bounded and idempotent.

## Rollback and recovery

Prefer a forward-fix migration. Do not casually drop tables or delete seller data. If a rollback is necessary, stop Marketing access, preserve logs and evidence, restore from a verified backup or apply a separately reviewed compensating migration. Test recovery in non-production first.
