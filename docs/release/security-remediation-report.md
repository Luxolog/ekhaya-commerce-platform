# Security Remediation Report

**Audit head:** `80c0862fde0b9e40644eeb412184ce23d3d85bc3`

## Completed remediation

- Referral navigation now explicitly permits only `http:` and `https:` URLs and requires same-origin navigation before carrying referral attribution.
- This addresses the reported incomplete URL scheme check (including `data:` and `vbscript:`) in `src/components/EkhayaReferralAttribution.tsx`.
- Fix commit: `c619920c2f69f5ac8abdd039b9f0027cff544616`.
- CodeQL analysis passed on this commit.

## Source-level controls observed

- Marketplace search validates the bearer token against Supabase Auth before processing a request.
- Owner actions check the authenticated user's app metadata role and require a valid session ID; configured email OTP is checked against a verified-session record.
- Partner invitation creation checks authenticated user access against `partner_owner_access`.
- Partner acceptance requires a verified email, a valid pending/unexpired invitation and matching invited email. The database operation now atomically links the programme and marks the invitation accepted through a service-role-only RPC.
- Invitation guard tests cover verified email, request parsing, invited-email matching, expiry and identifier/referral-code formats.
- Secret scanning and dependency audit passed in the final-head security workflow.

## Remaining security verification

| Item | Status | Required evidence |
|---|---|---|
| Owner-only partner creation/invitation/activation | PARTIAL | Isolated API tests for non-owner, expired session and OTP-required cases |
| Invitation single-use under concurrency | PARTIAL | Transactional/concurrency test against isolated database |
| Atomic acceptance/linking | PARTIAL | Atomic service-role-only RPC is implemented in branch migration and called by the Edge Function; isolated transaction/concurrency and rollback tests remain outstanding. |
| CORS allowlist behaviour | PARTIAL | Browser preflight and disallowed-origin tests in isolated environment |
| Rate limiting and OTP replay/expiry | BLOCKED | Isolated Auth/DB integration tests |
| Service-role exposure | PARTIAL | Source review and secret scan passed; production secret/configuration review remains outside this audit |
| Auth redirect allowlist and leaked-password protection | BLOCKED | Owner/dashboard review required; no production setting changed |

## CI evidence

- Latest-head Security workflow: run 45031036260 (in progress at report preparation; final result must be checked before release).
- [Quality workflow](https://github.com/Luxolog/ekhaya-commerce-platform/actions/runs/45010909803): passed.

## Safety

No production secrets, Auth settings, RLS policies, functions or environment variables were changed.
