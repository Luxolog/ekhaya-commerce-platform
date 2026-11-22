# Controlled Deployment Runbook — Ekhaya Commerce Platform

**Status:** PREPARED — NOT EXECUTED  
**Repository:** `Luxolog/ekhaya-commerce-platform`  
**Release branch:** `feature/saechamber-public-showcase`  
**Pull request:** #33 (must remain open and unmerged during Batch 8)  
**Environment safety:** This document is a checklist only. It authorizes no production action.

## 0. Release entry criteria — stop unless all pass

- [ ] PR base/dependency chain is reviewed and approved by the repository owner.
- [ ] All required CI checks pass on the exact release commit.
- [ ] Clean local Supabase migration replay passes from an empty database.
- [ ] SQL contract tests and behavioural transaction/concurrency tests pass.
- [ ] Auth, partner, seller, search, billing and notification regression evidence is complete.
- [ ] Mocked load/performance tests have repeatable fixtures and recorded results.
- [ ] Environment-variable inventory is complete for local, preview and production.
- [ ] Production migration history and deployed Edge Function source have been reconciled read-only.
- [ ] Backup/restore and rollback owners, commands and recovery criteria are verified.
- [ ] Explicit owner approval is recorded for each production change window.

**Current gate:** NOT SATISFIED. The clean local replay currently fails because `public.partner_programs` is absent when `20261121023000_public_active_referral_partners.sql` runs. Do not proceed to deployment planning execution until the authoritative schema dependency is resolved and replay passes.

## 1. Change freeze and release identity

- [ ] Record the exact release commit SHA and PR head SHA.
- [ ] Confirm PR #33 is the intended change set and inspect its base branch/dependency commits.
- [ ] Confirm no unreviewed commits or generated artifacts are included.
- [ ] Freeze unrelated schema, Edge Function, Auth, billing and frontend changes.
- [ ] Record release operator, reviewer, change window and communication channel.

## 2. Migration reconciliation and preflight

- [ ] Compare every branch migration filename/version with the production migration history using read-only access.
- [ ] Resolve version/name drift; do not infer equivalence from similar migration names.
- [ ] Identify objects already present in production and map them to their authoritative migration.
- [ ] Confirm the partner foundation source for `payment_transactions`, `partner_invitations`, `partner_owner_access`, `user_notifications`, `partner_programs` and related ledger/statement tables.
- [ ] Review all table constraints, indexes, foreign keys, triggers, RLS policies, grants, function ownership and SECURITY DEFINER search paths.
- [ ] Confirm migration order on an empty local Supabase database and on a disposable staging clone.
- [ ] Review lock duration, table rewrites, backfill volume and transaction boundaries.
- [ ] Produce and peer-review a forward-only migration plan, including preconditions and postconditions.
- [ ] Do not edit production migration history or mark migrations applied to bypass replay.

## 3. Backup and recovery

- [ ] Take a provider-supported backup/snapshot immediately before the approved change window.
- [ ] Record backup identifier, timestamp, region, retention and access owner (never include credentials).
- [ ] Verify that backup completion is successful.
- [ ] Verify restore procedure and recovery point objective using a non-production restore test.
- [ ] Record rollback decision-maker and incident escalation path.
- [ ] Define abort thresholds: migration error, unexpected row-count drift, RLS/Auth regression, elevated error rate, elevated latency or failed smoke test.
- [ ] Prefer forward-fix for irreversible schema changes; do not assume a down migration is safe.
- [ ] No backup or restore action is part of this Batch 8 preparation.

## 4. Environment and secret readiness

Maintain a separate, access-controlled inventory for **Local**, **Preview** and **Production**. Record variable names, purpose, required/optional status, owning service, rotation owner and validation method only. Never record values, tokens, private keys or secret-bearing connection strings in this repository.

- [ ] Derive the authoritative variable-name list from application code, Edge Functions, workflows and hosting configuration.
- [ ] Classify each variable by environment and runtime (browser/public, server-only, Edge Function, CI).
- [ ] Confirm public-prefixed variables contain no secret material.
- [ ] Confirm preview credentials point only to isolated preview services.
- [ ] Confirm production credentials are present in the approved secret manager and are not copied into local/preview.
- [ ] Confirm required provider keys, Supabase URL/anon key/service role, SMTP and billing credentials are owned and rotated appropriately.
- [ ] Confirm no secret values are printed by build, test, audit or deployment logs.
- [ ] Validate missing-variable failure behaviour without printing values.
- [ ] Record environment-variable inventory completion and reviewer sign-off.

**Current status:** NOT COMPLETE. A verified three-environment variable-name inventory has not yet been evidenced. Do not guess names or expose values.

## 5. Supabase and Edge Function release

- [ ] Confirm project ref and target environment through an independent read-only check.
- [ ] Reconcile migration history and complete the staging migration rehearsal.
- [ ] Confirm database backup and restore readiness.
- [ ] Apply only the reviewed migrations in the approved order and monitor each result.
- [ ] Validate schema objects, foreign keys, indexes, grants, RLS and security-definer functions.
- [ ] Deploy only the reviewed Edge Function source versions after database compatibility is confirmed.
- [ ] Record function version, source commit, JWT verification setting and required secrets by name (never value).
- [ ] Confirm CORS allowlists, authentication checks, rate limits, idempotency and service-role boundaries.
- [ ] Verify Auth site URL, redirect allowlist, email confirmation and leaked-password protection.
- [ ] Confirm notification worker schedule/auth and SMTP sandbox-to-production transition.
- [ ] No Supabase migration, function deployment, Auth/RLS change or secret update was performed in Batch 8.

## 6. Web application release

- [ ] Confirm exact commit and passing quality/security workflow run links.
- [ ] Verify Vercel project, team, domain and environment mapping.
- [ ] Check deployment quota/rate limits and current deployment state.
- [ ] Confirm all required preview/production variables by name and scope.
- [ ] Deploy to preview first and run smoke tests against isolated services.
- [ ] Obtain explicit owner approval before production deployment.
- [ ] Promote the reviewed immutable build; do not rebuild from a moving branch during promotion.
- [ ] No Vercel deployment was performed in Batch 8.

## 7. Post-deployment validation

- [ ] Authentication: signup, confirmation, login, logout, password reset and redirect allowlist.
- [ ] Seller: mandatory privacy and fee-estimate acknowledgements, account creation and workspace access.
- [ ] Referral: referral code persists through signup and attribution is linked to the intended active partner.
- [ ] Partner: owner create, duplicate rejection, invitation, acceptance, account linking, activation and support access.
- [ ] Search: cache hit/miss semantics, entitlement reservation, provider fan-out limit, timeout/partial failure and usage ledger.
- [ ] Billing: sandbox-to-live configuration, webhook signature validation, idempotency and reconciliation.
- [ ] Notifications: in-app records and verified delivery through approved test recipients.
- [ ] RLS: anon/authenticated/service-role access matrix and cross-tenant isolation.
- [ ] Observe database errors, Edge Function errors/latency, provider failures, cache metrics, queue depth, email failures and application error rate.
- [ ] Compare post-release metrics with the approved baseline; rollback/abort if thresholds are exceeded.
- [ ] Record smoke-test evidence, operator, timestamps and unresolved issues.

## 8. Rollback / abort procedure

1. Stop further rollout and disable promotion.
2. Preserve logs, workflow run IDs, migration output and request correlation IDs without exposing secrets or personal data.
3. If the application build is faulty, restore the last known-good immutable deployment.
4. If an Edge Function is faulty, redeploy the previously approved function version only after checking schema compatibility.
5. For database defects, follow the reviewed forward-fix or verified restore plan; never improvise destructive rollback SQL.
6. Re-check Auth, RLS, seller entitlements, partner attribution, billing and notification invariants.
7. Notify the release owner and record the incident, impact, recovery actions and follow-up tests.

## 9. Sign-off record

| Gate | Owner | Evidence / link | Status |
|---|---|---|---|
| Migration replay and SQL tests | Engineering | Pending | BLOCKED |
| Behavioural regression and E2E | QA / Engineering | Pending | BLOCKED |
| Performance and capacity | Engineering | Pending | NOT TESTED |
| Environment inventory | Engineering / platform owner | Pending | NOT COMPLETE |
| Backup and restore rehearsal | Platform owner | Pending | NOT VERIFIED |
| Production migration reconciliation | Database owner | Pending | NOT VERIFIED |
| Edge Function/Auth/RLS review | Security / platform owner | Pending | NOT VERIFIED |
| Preview validation | QA | Pending | NOT RUN |
| Production approval | Repository / business owner | Separate approval required | NOT GRANTED |
| Post-deployment monitoring | Operations | Pending | NOT RUN |

**Runbook decision:** Prepared for future review only. It must not be executed until every release entry criterion is evidenced and the owner separately approves the specific production change.
