# Ekhaya AI Marketing — pre-deployment security notes

## Security hardening added

- Quota RPCs are SECURITY DEFINER, callable only by service_role, and explicitly set an empty search_path to prevent object-shadowing attacks.
- All table references in those functions are schema-qualified.
- Seller-facing tables use RLS and explicit Data API grants.
- OpenAI and Paystack credentials remain server-side secrets.
- Checkout has both a source-level hard-disabled release gate and an environment gate.

## Required validation after Supabase Pro is available

- Apply migrations to an isolated development branch, never directly to production first.
- Inspect Supabase security and performance advisors.
- Test seller A cannot read or mutate seller B's records.
- Test anon and authenticated cannot execute quota RPCs.
- Test quota exhaustion, duplicate idempotency keys, concurrent generation and failure refunds.
- Test checkout and webhook idempotency in Paystack sandbox before any live enablement.

## Known product boundary

The content calendar is a planning workspace. Seller approval is an internal review status only; it does not publish or schedule content to a social platform. Research and trend briefs are planning assistance, not verified live research.
