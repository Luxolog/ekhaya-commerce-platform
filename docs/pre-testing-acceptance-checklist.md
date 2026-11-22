# Ekhaya Marketplace — Pre-Testing Acceptance Checklist

**Branch:** `feature/saechamber-public-showcase`  
**PR:** [#33](https://github.com/Luxolog/ekhaya-commerce-platform/pull/33)  
**Latest checked commit:** `edadea8d6e21db1b028ca70d4c8b192370d1f7ee`  
**Decision:** **NOT READY FOR CONTROLLED TESTING**

Status meanings: PASS = verified by current evidence; FAIL = verified defect; BLOCKED = cannot safely execute yet; NOT IMPLEMENTED = required implementation absent; REQUIRES HUMAN APPROVAL = owner/dashboard/release action.

## Automated engineering checks

| Check | Status | Evidence / next action |
|---|---|---|
| ESLint | PASS | Quality workflow passed on latest PR head |
| Application TypeScript | PASS | Quality workflow passed on latest PR head |
| Production application build | PASS | Quality workflow passed on latest PR head |
| Dependency audit | PASS | Security workflow passed; no vulnerabilities reported by npm audit |
| Secret scanning | PASS | Gitleaks workflow passed |
| Edge Function type-check | PASS | Deno checks passed for six tracked production functions |
| Signup/referral guard unit tests | PASS | Deno regression tests passed in the security workflow |
| CodeQL | PASS | Security workflow passed |
| Auth browser E2E suite | BLOCKED | No isolated non-production Supabase Auth project/test credentials available |
| Partner invitation lifecycle E2E | BLOCKED | Requires isolated Auth, database and SMTP sandbox |
| Referral attribution E2E | BLOCKED | Requires isolated seller identity and database verification |
| OTP expiry/replay/rate-limit integration tests | BLOCKED | Requires isolated Auth and database environment |

## Product and security acceptance

| Acceptance item | Status | Evidence / next action |
|---|---|---|
| Privacy acknowledgement guard | PASS | Unit-tested and integrated into signup |
| Marketplace fees/estimated-profit acknowledgement guard | PASS | Unit-tested and integrated into signup |
| Signup with either acknowledgement missing is blocked | PASS | Unit-tested |
| Valid/invalid referral-code matching | PASS | Unit-tested against the active-partner lookup result |
| Referral attribution persisted to correct partner | BLOCKED | Must verify a real test signup and `public.partner_referrals` row in isolated environment |
| Password recovery and reset journey | BLOCKED | UI path exists; full email/token flow not integration-tested |
| Expired/reused auth token handling | BLOCKED | Must test against isolated Auth |
| Existing partner account keeps existing password | BLOCKED | Branch invitation code is corrected; live invitation function v12 still differs and must not be deployed without regression tests |
| Owner-only partner invitation and registration | BLOCKED | Requires isolated owner and partner test identities |
| Partner acceptance and account linking | BLOCKED | Requires isolated invitation and Auth flow |
| Partner activation blocked before acceptance | BLOCKED | Must exercise owner dashboard and backend checks end-to-end |
| Partner activation after valid acceptance | BLOCKED | Must exercise owner dashboard and referral attribution in isolated environment |
| Seller/partner/owner role separation | BLOCKED | Static source review is not a substitute for cross-role E2E tests |
| Owner acceptance notification | BLOCKED | Requires sandbox queue processing and SMTP capture |
| Partner welcome notification | BLOCKED | Requires sandbox acceptance event and SMTP capture |
| Marketplace search access | BLOCKED | Production and branch `marketplace-search` differ; branch expects `profiles.account_id` before the migration is applied |
| Billing boundaries/webhook idempotency | BLOCKED | `paystack-billing` live source is not present in the branch for comparison |
| RLS enforcement | REQUIRES HUMAN APPROVAL | Two private tables still have RLS disabled; review dependent workers and apply only through an approved migration after staging validation |
| Public referral RPC | PASS WITH REVIEW | Intentionally public active-partner catalogue; SECURITY DEFINER warning remains and requires periodic review |
| Leaked-password protection | REQUIRES HUMAN APPROVAL | Supabase Auth advisor reports this setting disabled; enable and verify manually |
| Auth Site URL and redirect allowlist | REQUIRES HUMAN APPROVAL | Dashboard values are not exposed by the connected project tools; use the checklist below |
| Migration history reproducibility | BLOCKED | 44 live migration versions vs 14 branch SQL files; only three exact version identifiers overlap |
| Account-ID migration | REQUIRES HUMAN APPROVAL | Hardened migration and read-only verification SQL committed; staging review and approved execution still required |
| Edge Function source parity | BLOCKED | Multiple production functions differ from branch source; `paystack-billing` and `marketplace-search-test` source absent from branch |
| PR base-branch reconciliation | REQUIRES HUMAN APPROVAL | PR #33 targets `feature/partner-admin-email-otp`, not `main` |

## Supabase Auth dashboard checklist

Do not change production until the owner approves the maintenance/release window.

1. In Supabase Dashboard, open **Authentication → URL Configuration**.
2. Set the Site URL to `https://ekhayatech.co.za`.
3. Confirm the recovery redirect used by the account page: `https://ekhayatech.co.za/account/`.
4. Allow the exact invitation callback: `https://ekhayatech.co.za/account/` (the invitation ID is passed as a query parameter). Add the www variant only if the owner intends to use that origin: `https://www.ekhayatech.co.za/account/`.
5. Confirm the signup confirmation callback resolves to the intended account page/Site URL. Do not add broad wildcard redirects.
6. Open the Auth password/security settings and enable leaked-password protection. The current advisor reports it disabled.
7. Align the Auth minimum password length with the application's eight-character minimum, then verify the actual configured policy.
8. Verify the custom partner/admin email OTP feature separately; its enablement is stored per account and is not the same as Supabase Auth email confirmation.
9. Record the approved settings and test them in staging before changing production.

## Required controlled-test entry conditions

- [ ] Authoritative production migration archive reconciled with GitHub.
- [ ] Account-ID migration reviewed and tested on a production-like staging copy.
- [ ] Private-table worker/function access reviewed; RLS hardening approved.
- [ ] Auth dashboard settings reviewed and approved.
- [ ] All deployed Edge Function source differences resolved through explicit release decisions.
- [ ] Isolated non-production Supabase project available.
- [ ] Dedicated test users for seller, partner and owner created only in that isolated project.
- [ ] SMTP sandbox/capture configured; no real emails to customers or partners.
- [ ] Full browser/API E2E suite passes in the isolated environment.
- [ ] PR #33 dependency branch and intended release base reconciled.

**No production test, deployment, migration, merge or real email action is authorised by this checklist.**
