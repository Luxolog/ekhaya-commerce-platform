# Ekhaya Platform — staged rollout plan

## Release order

The platform will be introduced in three controlled stages. Work on later stages must not delay or destabilise the current release stage.

### Stage 1 — Price Checker (first priority)

**Objective:** Prove that the core Price Checker is reliable for real sellers before introducing additional paid modules.

Release gates:

- [ ] Seller registration, email verification, sign-in and account recovery work end to end.
- [ ] Seller approval and referral attribution persist through the complete signup journey.
- [ ] Subscription status, marketplace entitlements, search limits and credit deductions are correct.
- [ ] Each marketplace adapter returns correctly attributed results; unsupported marketplaces remain clearly disabled.
- [ ] Cached and fresh searches apply the intended credit rules consistently.
- [ ] Marketplace fee and profit figures are labelled as estimates, with the required seller acknowledgement before access.
- [ ] Supplier comparison, barcode/image lookup and product matching handle missing or ambiguous results safely.
- [ ] Payment checkout, webhook verification, idempotency, failed payments and subscription renewal states are tested.
- [ ] Seller dashboards, usage history and support/admin visibility are accurate.
- [ ] Live pilot feedback and production monitoring show no release-blocking defects.

**Stage 1 release rule:** Do not launch or promote the next module until the Price Checker gates are reviewed and signed off. Do not change existing Price Checker pricing, credits or payment behaviour as part of the AI Marketing work.

### Stage 2 — Ekhaya AI Marketing

**Objective:** Introduce AI Marketing as an optional seller add-on only after Stage 1 is stable.

Prerequisites:

- [ ] Stage 1 is signed off.
- [ ] Marketing database migrations and RLS policies are validated in a non-production database.
- [ ] Quota reservation, idempotency, exhaustion and failure-release paths are tested.
- [ ] OpenAI key is stored only as a server-side secret; generation is tested without exposing credentials.
- [ ] Generated material is saved as drafts; no automatic publishing is implied.
- [ ] Paystack merchant approval is received.
- [ ] Marketing checkout and webhook flows pass sandbox and end-to-end tests.
- [ ] Marketing billing and usage remain isolated from Price Checker subscriptions, credits and payment triggers.
- [ ] Release gate is explicitly enabled only after approval and testing.

**Current status:** Feature implementation is on the GitHub feature branch / draft PR. Checkout remains hard-disabled. No production migration, Edge Function deployment or Vercel deployment is authorised by this plan.

### Stage 3 — Ekhaya Support Desk

**Objective:** Introduce seller support after Price Checker and AI Marketing are stable.

Prerequisites:

- [ ] Stage 1 and Stage 2 have been signed off.
- [ ] Support roles and permissions are defined separately from seller permissions.
- [ ] Ticket ownership, status changes, internal notes and seller-visible replies are tested.
- [ ] Email notifications and attachment handling are tested with appropriate access controls.
- [ ] Audit history and escalation paths are available.
- [ ] Support Desk does not expose one seller's data to another seller.
- [ ] Any support subscription or charge is separately specified and approved before implementation.

## Working and deployment rules

- GitHub is the source of truth during the current development period.
- Do not deploy to Vercel until explicitly authorised.
- Do not apply feature migrations to the production Supabase project.
- Do not enable Paystack Marketing checkout while merchant approval is pending.
- Do not merge the AI Marketing draft PR until its stage gate is reached and the user explicitly approves.
- Keep each stage independently testable, with its own release checklist and rollback plan.
