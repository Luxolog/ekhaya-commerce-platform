# Remaining Release Blockers

| Blocker | Owner / dependency | Required action | Production approval? |
|---|---|---|---|
| Isolated Supabase Auth + database test environment absent | Owner / platform setup | Provide isolated project, test users and non-production secrets | No production approval; separate test setup |
| Invitation and activation full E2E not run | Engineering + isolated Supabase | Test owner create, duplicate rejection, invite, accept, account link and activate | No, if isolated |
| Invitation linking/status update is a multi-step write | Engineering | Design and test atomic acceptance/rollback behaviour | Yes before any production change |
| Live referral signup and attribution row unverified | QA + isolated Supabase | Complete controlled signup and inspect resulting referral row | No, if isolated |
| SMTP delivery unverified | Owner / email provider | Configure sandbox and test owner + partner notifications | No real recipients |
| Seller signup/workspace E2E unverified | QA + isolated Supabase | Verify email confirmation, acknowledgements, referral and workspace | No, if isolated |
| Query planner not integrated with provider orchestration | Engineering | Implement bounded adapter flow with budget and failure tests | Branch-only first; no deployment |
| Credit lifecycle integration coverage missing | Engineering | Mock RPC/provider adapters for cache, retries, failure, duplicate and concurrency cases | Branch-only |
| Provider timeout/partial failure coverage missing | Engineering | Add deterministic mocked adapter tests | Branch-only |
| Billing source/webhook idempotency not verifiable | Engineering + payment sandbox | Locate authoritative billing source and add sandbox tests | No real payments |
| Production/branch migration reconciliation unavailable | Owner / Supabase access | Read-only inventory, staging preflight, migration diff | Approval before production migration |
| RLS/Auth dashboard settings unverified | Owner / Supabase access | Inspect private table RLS, leaked-password protection and redirect allowlist | Do not change without approval |
| Deployed Edge Function source parity unverified | Owner / Supabase access | Compare deployed source with branch, especially marketplace-search v59 | No deployment |
| PR dependency branch needs reconciliation | Engineering / owner | Review commits in `feature/partner-admin-email-otp` and determine safe base before release | Owner review before base/merge change |
| Vercel deployment rate limit | Owner / hosting | Previous bot report shows `api-deployments-free-per-day`; do not retry until deliberately approved | Yes |

## Release decision

**Not ready for controlled live onboarding or production deployment.** The final-head CI is green, but live integration and external acceptance gates remain open.

No PR merge, deployment, migration, paid provider call, real invitation, email or payment was performed.
