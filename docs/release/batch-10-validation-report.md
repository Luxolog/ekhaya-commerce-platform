# Batch 10 Validation Report

**Status:** IN PROGRESS — NOT A RELEASE APPROVAL  
**Repository:** Luxolog/ekhaya-commerce-platform  
**Branch:** feature/saechamber-public-showcase  
**Pull request:** [#33](https://github.com/Luxolog/ekhaya-commerce-platform/pull/33) — keep OPEN and UNMERGED  
**PR base:** feature/partner-admin-email-otp  
**Latest recorded source head:** 71d90af8b16f58f02321f5caf8e1b7f9e3c19fbe  
**Execution mode:** GitHub-only; no Vercel deployment or production Supabase write/migration.

## Executive status

The batch is not complete. The database foundation has been recovered and expanded behavioural coverage has been added. Latest quality, security and Ekhaya security workflows are green; the latest isolated database run is still running.

**Current release classification: NO-GO.** Mandatory provider-payment, production migration provenance, full partner/seller E2E, SMTP delivery, concurrency and production sign-off gates remain unverified.

## Milestone status

| Milestone | Status | Evidence / remaining work |
|---|---|---|
| 1. Database CI recovery | PARTIAL | 21 migrations replayed and 69 assertions passed at e72fb00; 76 assertions across 6 SQL files passed at dc99eea. Supabase CLI is now pinned to 3.2.0 after a latest-release API rate-limit failure. Latest 10k capacity-inclusive database run at 71d90af is pending. |
| 2. Partner invitation lifecycle | PARTIAL | SQL coverage includes wrong email, successful atomic acceptance, pending status retained, accepted timestamp, owner/partner notifications, replay rejection, expired and revoked invitations. Deno guard tests cover verified email, UUID/code formats and expiry. Concurrent Edge Function/browser acceptance and full owner-to-partner E2E remain unverified. |
| 3. Referral and commission integrity | PARTIAL | Behavioural tests cover active unique-link attribution, replay idempotency, first-paid timestamp preservation, inactive/suspended partner rejection, self-referral prevention, self-commission prevention and valid payment-linked commission. Live referral signup and payment-event integration remain unverified. |
| 4. Payments and subscriptions | PARTIAL / BLOCKED | Database tests cover paid-credit replay and subscription payment trigger behaviour: failed payment grants no credits; complete payment allocates plan allowance; replay does not duplicate allocation. No Paystack/PayFast checkout or webhook source implementation was found in this branch. Paid checkout remains disabled. |
| 5. Credit lifecycle and capacity | PARTIAL | Seller-pilot lifecycle tests cover reservation, duplicate request, completion, refund, daily limit and unsupported marketplace. A 10,000-seller/credit-allocation smoke benchmark was added for cumulative sizes 100, 500, 1,000, 5,000 and 10,000; latest CI result and timing notices are pending. True concurrent allocation/consumption and lock-contention tests remain outstanding. |
| 6. Seller registration/workspace | PARTIAL | Signup guard tests enforce Privacy Notice and marketplace-fee estimate acknowledgements only during signup. Fixed a profile bootstrap/marketplace constraint conflict and added a normal-trigger regression test. No browser E2E, real email verification or complete seller workspace journey has been verified. |
| 7. Owner/partner dashboards and RLS | PARTIAL | Direct SQL RLS test verifies partner A/B row isolation and owner visibility. The corrected test passed as part of 85 assertions across 7 SQL files at 309571e. Latest expanded run is pending. UI/API direct-access and full role matrix remain outstanding. |
| 8. Notifications/email | PARTIAL | Database tests verify idempotent referral, invitation and payment notification creation. Worker source has SMTP configuration checks, a row-claim step and terminal failed status. No real SMTP delivery test was performed. Automatic retry is not implemented; a worker crash after claim can leave a pending row with a non-null attempt timestamp. |
| 9. Migration parity/security/performance | PARTIAL / BLOCKED | Isolated repository migration replay is green at earlier heads. Existing read-only inventory records 51 production migration-history entries versus 21 source migrations before the new Batch 10 profile migration (22 source migrations now). Provenance is not reconciled. Quality/security/Ekhaya scans passed at 71d90af; production parity and load/concurrency evidence remain missing. |
| 10. Release package and GO/NO-GO | IN PROGRESS | This report, outstanding-issues register and deployment runbook are being added. No deployment or production migration is authorised by this batch. |

## Changes committed during this continuation

| Commit | Change |
|---|---|
| [6da8877](https://github.com/Luxolog/ekhaya-commerce-platform/commit/6da88775f1f93b075c06d85398e63410d7d5e6b4) | Allow empty marketplace selection during initial profile bootstrap while retaining the supported marketplace list and maximum of three |
| [19c49b7](https://github.com/Luxolog/ekhaya-commerce-platform/commit/19c49b7e1939f6e8a4a437b31b6cd90e1134576d) | Add normal auth-user profile bootstrap regression |
| [fe0fc34](https://github.com/Luxolog/ekhaya-commerce-platform/commit/fe0fc34efdba6af0acbd07049c59f9175710ad9e) | Remove artificial marketplace default from invitation test fixture |
| [e8c70c6](https://github.com/Luxolog/ekhaya-commerce-platform/commit/e8c70c6af00d41dd04b02902a26197c53b11e42e) | Remove artificial marketplace default from payment test fixture |
| [5165bab](https://github.com/Luxolog/ekhaya-commerce-platform/commit/5165bab10c88530e469b6e403a69a67a86b91915) | Add inactive/suspended partner and self-referral tests |
| [9a74d92](https://github.com/Luxolog/ekhaya-commerce-platform/commit/9a74d9237d9f2b394aaa9b4bdaf34d1590185148) | Correct invitation test fixture ordering |
| [1778c2d](https://github.com/Luxolog/ekhaya-commerce-platform/commit/1778c2d7824c8ef42b19b76a0dd0c826aaee1e85) | Correct SQL dollar quoting in invitation rejection tests |
| [dc99eea](https://github.com/Luxolog/ekhaya-commerce-platform/commit/dc99eea4406cde8eaa77ad56441e0fcef7e0fdd0) | Pin Supabase CLI to 3.2.0; avoid failed latest-release lookup and skip cleanup when stack never started |
| [44b2688](https://github.com/Luxolog/ekhaya-commerce-platform/commit/44b268811e769edd3ccd6bf254f9433d0ebf6d5d) | Add partner/owner RLS isolation tests |
| [68f9f13](https://github.com/Luxolog/ekhaya-commerce-platform/commit/68f9f13451ec662fb4384fbc68ee001e43b21ad8) | Add subscription payment-trigger credit allocation tests |
| [309571e](https://github.com/Luxolog/ekhaya-commerce-platform/commit/309571e9ce7b545e62f59203fbc52813b231cd36) | Account for the seeded SA eChamber programme in owner RLS test |
| [5f65f42](https://github.com/Luxolog/ekhaya-commerce-platform/commit/5f65f42ccdbe31268472c310ef3c6055db87b9b3) | Add seller-pilot reservation/completion/refund/daily-limit behaviour tests |
| [227bb12](https://github.com/Luxolog/ekhaya-commerce-platform/commit/227bb12903b4cbf0c2a0abcde8412b8465d2b4a3) | Add partner self-commission and payment linkage tests |
| [71d90af](https://github.com/Luxolog/ekhaya-commerce-platform/commit/71d90af8b16f58f02321f5caf8e1b7f9e3c19fbe) | Add synthetic allocation smoke benchmark at 100–10,000 sellers |

## Verified CI evidence

### Database

- [e72fb00 database run](https://github.com/Luxolog/ekhaya-commerce-platform/actions/runs/45062676972): all 21 then-current repository migrations replayed; 69 assertions across 4 SQL files passed.
- [19c49b7 database run](https://github.com/Luxolog/ekhaya-commerce-platform/actions/runs/45063946311): new profile migration replayed; 71 assertions across 5 SQL files passed.
- [dc99eea database run](https://github.com/Luxolog/ekhaya-commerce-platform/actions/runs/45064199594): 76 assertions across 6 SQL files passed; Supabase CLI setup succeeded after pinning.
- [309571e database run](https://github.com/Luxolog/ekhaya-commerce-platform/actions/runs/45064624420): 85 assertions across 7 SQL files passed, including owner/partner RLS isolation.
- [227bb12 database run](https://github.com/Luxolog/ekhaya-commerce-platform/actions/runs/45064750218): 98 assertions across 9 SQL files passed, including commission and seller-pilot lifecycle tests.
- Latest capacity-inclusive run at 71d90af is still running; do not count it as passed until its job log confirms all tests and timing output.

### Quality and security

- [Quality at 71d90af](https://github.com/Luxolog/ekhaya-commerce-platform/actions/runs/45064823921): success.
- [Security at 71d90af](https://github.com/Luxolog/ekhaya-commerce-platform/actions/runs/45064823901): success.
- [Ekhaya Security Scan at 71d90af](https://github.com/Luxolog/ekhaya-commerce-platform/actions/runs/45064819015): success.

## Important implementation finding

The original marketplace constraint required at least one marketplace while the signup page created an auth user without marketplace metadata. The profile trigger therefore attempted to insert a profile with the default empty array and could violate the constraint. The new forward-only migration permits zero selections during initial account creation and still restricts values to takealot, amazon, makro with a maximum of three. The profile bootstrap regression test exercises the actual auth trigger; it does not fake a marketplace default.

## Release blockers

1. Paystack/PayFast provider checkout and webhook source is absent from this branch; payment workflows cannot be declared ready.
2. Production migration history (previously observed at 51 records) is not reconciled with the 22-file branch migration chain.
3. No full browser E2E for seller signup, partner invite acceptance, account linking, owner activation or workspace access.
4. No real SMTP delivery verification. Retry/backoff and stale-claim recovery are not implemented.
5. Latest 10,000-seller allocation benchmark result is pending; no concurrent workload/lock-contention proof exists.
6. No production migration approval, deployment approval or environment runbook sign-off.
7. PR #33 base remains feature/partner-admin-email-otp; dependency chain must be deliberately reconciled before release.

## Safety record

No Vercel deployment, production Supabase write/migration, production secret change, real email, partner invitation, payment or paid provider request was performed. All new database behavioural fixtures use synthetic .invalid email identities and rollback transactions.
