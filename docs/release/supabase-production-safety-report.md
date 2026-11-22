# Supabase Production Safety Report

## Scope

This report combines GitHub branch inspection with a read-only query of the connected production project's migration history. No production schema, data, Auth configuration, secrets or functions were modified.

## Non-negotiable safeguards observed

- No Edge Function deployed.
- No SQL migration applied.
- No production records or Auth users changed.
- No RLS policy or secret changed.
- No seller credits, pilot allocation or subscriptions changed.
- No production marketplace-search version overwritten.

The current branch contains migrations including:
- `20261121023000_public_active_referral_partners.sql`
- `20261121040000_partner_admin_email_otp.sql`
- `20261122043000_partner_acceptance_notification_details.sql`
- `20261122090359_standard_ekhaya_account_ids.sql`
- `20261122120000_partner_referral_signup_email.sql`
- `20261122143000_atomic_saechamber_partner_acceptance.sql`
- `20261122160000_partner_support_cache_hit_refunds.sql`
- `20261122170000_idempotent_seller_pilot_search_events.sql`
- `20261122160000_partner_support_cache_hit_refunds.sql`

These are branch files only. Their presence does not mean they are applied to production. The latest atomic partner acceptance and partner-support cache-refund migrations have not been applied to any Supabase environment.

## Read-only migration reconciliation snapshot\n\nThe connected production project's migration inventory was read without applying changes. Its latest recorded migration is `20261122101804` (`partner_support_search_access`). The following newer branch migrations are not recorded in that production history:\n\n| Branch migration | Production history | Status |\n|---|---|---|\n| `20261122143000_atomic_saechamber_partner_acceptance.sql` | Not present | NOT APPLIED / approval required before deployment |\n| `20261122160000_partner_support_cache_hit_refunds.sql` | Not present | NOT APPLIED / approval required before deployment |\n| `20261122170000_idempotent_seller_pilot_search_events.sql` | Not present | NOT APPLIED / approval required before deployment |\n\nThe existing partner-support migration is recorded in production under version `20261122101804`, while the branch file is named `20261122090000_partner_support_search_access.sql`. This version/name difference must be reconciled before any migration deployment. Do not infer schema parity from similar migration names.\n\n## Unverified production dependencies

| Area | Status | Reason |
|---|---|---|
| Production migration history vs branch | BLOCKED | Requires read-only access to actual migration history |
| RLS disabled private tables | BLOCKED | Need live policy/table inventory and worker dependency analysis |
| Auth leaked-password protection | BLOCKED | Dashboard setting not inspected |
| Auth redirect allowlist | BLOCKED | Dashboard setting not inspected |
| Deployed Edge Function source parity | BLOCKED | Deployed source cannot be verified from this GitHub-only audit |
| Production marketplace-search version 59 | NOT MODIFIED; current deployed state not independently re-read | No deployment or Supabase inspection performed |
| Account-ID migration safety | BLOCKED | Requires staging preflight and migration reconciliation |
| Notification worker auth and cron | UNVERIFIED | Historical PR notes are not a fresh live verification |

## Required safe next step

Use the newly committed local Supabase harness first. Validate migration bootstrap and SQL behaviour locally, then compare migration history and function source read-only. A separate hosted non-production project is not currently required. Review RLS policies with service-worker dependencies before proposing any change. Production migration or function deployment requires a separate explicit owner approval.
