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


## Brand, product and contact-data safeguards

- Seller brand profiles and saved product records have seller ownership policies. The generation Edge Function queries the saved brand profile by authenticated user ID and selected products by both product ID and authenticated user ID.
- Product image references are plain metadata. There is no file upload or public object-storage path in this release.
- Contact records contain personal information. RLS restricts access to the owning seller. CSV imports do not assume consent: rows without an explicit consent status and documented basis are stored as unknown.
- The contact workspace supports recording an opt-out. Email draft recipient validation is enforced by a database trigger and only accepts same-seller contacts with a recorded consent, email address and no opt-out timestamp.
- Email campaigns are saved drafts only. There is no outbound email provider or sending operation. If a provider is added later, consent and opt-out status must be rechecked at send time, not merely when the draft is saved.
- This is an engineering safeguard, not a legal opinion or a guarantee of POPIA compliance. Sellers remain responsible for a lawful basis, transparency, retention and honouring data-subject requests.

## Additional acceptance tests required

- Verify two seller accounts cannot read or update each other's brand profiles, products, contacts or email drafts.
- Verify a seller cannot attach another seller's product ID to an AI generation request.
- Verify CSV duplicate emails are skipped and malformed files fail safely.
- Verify contacts with unknown or withdrawn consent cannot be selected for an email draft.
- Verify the database trigger rejects foreign-seller, opted-out and non-consented recipient IDs even when the client is bypassed.
- Verify a contact opt-out after a draft is saved is revalidated before any future provider send integration is enabled.
