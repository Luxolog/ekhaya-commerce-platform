# Partner schema migration reconciliation — Batch 8

**Date:** 2026-11-22  
**Branch:** `feature/saechamber-public-showcase`  
**PR:** #33 (keep open and unmerged)

## Finding

The clean local Supabase replay fails while applying `20261121023000_public_active_referral_partners.sql` because `public.partner_programs` does not exist. The failing workflow is [45050341076](https://github.com/Luxolog/ekhaya-commerce-platform/actions/runs/45050341076).

The branch migration tree contains the following relevant partner migrations, but no partner foundation migration before them:

- `20261121023000_public_active_referral_partners.sql`
- `20261121040000_partner_admin_email_otp.sql`
- `20261122043000_partner_acceptance_notification_details.sql`
- `20261122090000_partner_support_search_access.sql`
- `20261122120000_partner_referral_signup_email.sql`
- `20261122143000_atomic_saechamber_partner_acceptance.sql`
- `20261122160000_partner_support_cache_hit_refunds.sql`
- `20261122170000_idempotent_seller_pilot_search_events.sql`

## Authoritative source reviewed

`docs/sa-echamber-partner-portal-schema.sql` documents a partner schema applied to production project `itxxnhcjjiynrmivexcb` on 2026-11-21. It defines:

- `public.partner_programs`
- `public.partner_referrals`
- `public.partner_commission_ledger`
- `public.partner_monthly_statements`
- `public.partner_commission_rate_schedule`
- `private.capture_partner_referral()`
- `private.mark_partner_first_payment()` and related triggers/RLS policies

However, this standalone SQL document is not a complete migration source for the current branch.

## Unresolved dependencies — do not guess

1. The standalone schema references `public.payment_transactions(id)` and the payment trigger reads `user_id`, `status`, and `paid_at`. No migration in the current branch creates `public.payment_transactions`. Its authoritative schema, lifecycle and ownership must be sourced before recreating the commission ledger FK or payment trigger in a clean database.
2. Current Edge Functions and UI also depend on `public.partner_invitations`, `public.partner_owner_access`, and `public.user_notifications`. The standalone partner schema document does not define these tables. The current branch code establishes some required columns and query shapes, but not the full constraints, indexes, RLS policies, grants, notification idempotency contract or retention rules.
3. The OTP migration adds restrictive policies to partner tables. The foundation must create every referenced table before that migration executes; otherwise replay will fail again.
4. Partner portal pages query commission ledger and monthly statements. Omitting those tables would allow replay to progress while leaving the partner portal incomplete.

## Safe decision

Do **not** add a guessed foundation migration, create a placeholder payment table, remove financial foreign keys, or weaken OTP/RLS policies merely to make local replay pass.

The next implementation prerequisite is the authoritative `payment_transactions`, `partner_invitations`, `partner_owner_access`, and `user_notifications` schema definitions (including existing RLS/grants/triggers). Reconcile those definitions with the standalone partner schema and current Edge Function/UI usage, then create one ordered, forward-only partner foundation migration and replay from an empty local Supabase database.

## Safety

This review used GitHub branch files and GitHub Actions evidence only. No production Supabase query or write, migration, Vercel deployment, provider request, email, invitation or payment was performed.
