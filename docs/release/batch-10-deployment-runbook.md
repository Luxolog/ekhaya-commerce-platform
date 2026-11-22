# Batch 10 Deployment Runbook — Preparation Only

**Current status:** NOT AUTHORISED FOR DEPLOYMENT  
**Repository:** Luxolog/ekhaya-commerce-platform  
**Branch:** feature/saechamber-public-showcase  
**PR:** [#33](https://github.com/Luxolog/ekhaya-commerce-platform/pull/33) — keep OPEN and UNMERGED  
**PR base:** feature/partner-admin-email-otp

This document is a future release checklist. No deployment or production migration is performed by this runbook.

## 1. Mandatory release gates

Do not start deployment until every gate below is signed off.

- [ ] PR #33 dependency/base-branch sequence is reconciled and reviewed.
- [ ] Latest branch HEAD has successful quality, security, Ekhaya security and isolated Supabase database workflows.
- [x] The 100/500/1,000/5,000/10,000 seller synthetic allocation benchmark is complete and its limitations are documented.
- [ ] Concurrent credit reservation/allocation tests pass.
- [ ] Partner invitation, referral, owner activation and seller signup browser E2E pass in an isolated environment.
- [ ] Payment provider checkout/webhook source is restored and reviewed.
- [ ] Payment signatures, idempotency, failure, cancellation, refund and renewal paths pass mocked-provider tests.
- [ ] Paid checkout release gate remains disabled until separate payment approval.
- [ ] SMTP delivery and worker failure/recovery are verified against a non-production mail sink.
- [ ] Production migration history is reconciled with authoritative migration source.
- [ ] RLS and service-role boundaries receive independent review.
- [ ] Production backups and rollback procedures are confirmed.
- [ ] Vercel usage/quota and deployment limits are checked.
- [ ] Product owner and engineering owner approve the release window.

## 2. Pre-deployment preparation

1. Freeze feature work on the release candidate branch.
2. Record the exact candidate commit SHA and PR base/head SHAs.
3. Confirm PR #33 remains open until the approved merge sequence is executed.
4. Review all migrations in filename order against the reconciled production migration inventory.
5. Identify migrations already applied in production, migrations absent from production, and version/name drift.
6. Produce a migration execution plan with preflight SQL, expected row/object changes and rollback/forward-repair strategy.
7. Confirm database backup and restore point.
8. Confirm production environment variables and secrets are present without printing or exposing values.
9. Confirm the correct Vercel project, domain, environment and deployment target.
10. Confirm the previous Vercel deployment can be restored if smoke tests fail.

## 3. Production Supabase migration procedure

**Separate approval required. Do not run during Batch 10.**

1. Take and verify a restorable backup.
2. Reconfirm the production project reference and environment.
3. Compare production migration history with the reviewed migration manifest.
4. Execute only the specifically approved migration set in the agreed order.
5. Do not mark historical migrations as applied merely to silence a mismatch.
6. Do not drop, recreate or weaken payment foreign keys, RLS policies, OTP restrictions, service-role grants or notification idempotency constraints.
7. Capture migration output and post-migration schema checks.
8. Verify key objects: profiles, marketplace access, seller pilot tables/functions, partner programmes/referrals/invitations, notifications, payment transactions, credit allocations and relevant RLS policies.
9. Verify no unexpected row counts, constraint changes or trigger changes.
10. Stop and roll forward safely if any expected invariant is missing; do not improvise a destructive rollback.

## 4. Vercel deployment procedure

**Separate approval required. No Vercel deployment is permitted during Batch 10.**

1. Check current Vercel account/project deployment quota and recent deployment rate limits.
2. Confirm the intended production branch and build settings.
3. Confirm required public environment variables are set for the correct environment.
4. Confirm secret values are configured in Vercel; never copy them into GitHub or this report.
5. Deploy the approved commit SHA once, avoiding repeated preview builds that consume deployment quota.
6. Wait for build and deployment health checks.
7. Record deployment ID, commit SHA, build output and domain alias.
8. Do not promote an unverified preview to production.

## 5. Post-deployment smoke tests

Run only after separate approval and in the approved production window.

### Account and seller onboarding

- [ ] New seller registration succeeds.
- [ ] Email confirmation succeeds.
- [ ] Privacy Notice acknowledgement is required at signup.
- [ ] Marketplace-fee estimate disclaimer is required at signup.
- [ ] Signup acknowledgement timestamps and versions are retained.
- [ ] Seller must select at least one supported marketplace during signup.
- [ ] Supported marketplace preferences are persisted to the new seller profile.
- [ ] New profile bootstrap remains safe when marketplace metadata is absent from non-standard signup paths.
- [ ] Seller can access only their own workspace.
- [ ] Pilot/search restrictions and free allowance are enforced.

### Partner lifecycle

- [ ] Owner creates a pending partner programme.
- [ ] Owner sends invitation to the intended email.
- [ ] Unverified/wrong-email/expired/revoked invitation attempts are rejected.
- [ ] Verified invitee accepts and links the correct Ekhaya account.
- [ ] Owner receives one acceptance notification.
- [ ] Partner receives one welcome notification.
- [ ] Programme remains pending until explicit owner activation.
- [ ] Activated partner referral link attributes only to that active partner.
- [ ] Partner dashboard shows only its own referrals, commissions and statements.

### Payment and credits

- [ ] Keep paid checkout disabled unless payment approval is separately recorded.
- [ ] If approved later, use provider sandbox/test mode first.
- [ ] Verify webhook signature and replay protection.
- [ ] Verify failed/cancelled/refunded events do not grant credits.
- [ ] Verify one successful payment grants exactly one allocation.
- [ ] Verify replay cannot create duplicate credits or commission records.
- [ ] Verify customer payment and credit ledger reconciliation.

### Notifications and operations

- [ ] Verify in-app notifications are visible only to their owner.
- [ ] Verify SMTP delivery with the approved controlled test.
- [ ] Verify failure/retry/manual-recovery procedures.
- [ ] Verify notification worker authentication and cron schedule.
- [ ] Confirm logs contain no secrets or sensitive payment data.

## 6. Rollback and incident response

- Stop new traffic or disable the affected feature flag when a critical defect appears.
- Preserve logs, deployment ID, commit SHA, migration output and relevant request IDs.
- Restore the previous Vercel deployment if the application release is defective.
- For database changes, use the reviewed forward-repair plan; do not assume every schema migration is safely reversible.
- Disable paid checkout if any payment, webhook or credit integrity check fails.
- Suspend partner attribution if referral ownership or cross-account visibility is incorrect.
- Do not delete financial records or alter payment history to hide a failed test.
- Notify the release owner and record the incident and recovery decision.

## 7. Explicitly separate approvals

The following actions require approval outside this GitHub-only preparation batch:

1. Merge or retarget PR #33.
2. Apply production Supabase migrations.
3. Deploy to Vercel production.
4. Enable paid checkout or contact payment providers.
5. Send real partner invitations or customer emails.
6. Change production secrets or SMTP configuration.

## 8. Current decision

**NO-GO.** The current branch is not authorised for Vercel deployment or production Supabase migrations. Payment provider source, production migration provenance, full E2E, SMTP delivery/recovery, concurrency/load evidence and release sign-off remain outstanding.
