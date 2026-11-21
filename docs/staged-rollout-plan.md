# Ekhaya Platform — staged rollout plan

## Release order

The Price Checker is complete, deployed and working. Development focus now moves to Ekhaya AI Marketing, followed by Ekhaya Support Desk. Later stages must remain isolated from the live Price Checker.

### Stage 1 — Ekhaya Price Checker

<status>Complete — deployed and working</status>

The user has confirmed that the Price Checker is complete, deployed and working. Do not reopen Stage 1 or change its live pricing, credits, subscriptions, payment flows or marketplace behaviour as part of Marketing development unless a specific defect is reported.

### Stage 2 — Ekhaya AI Marketing (current priority)

**Objective:** Build and prepare an optional seller marketing suite that can be introduced after the Supabase Pro upgrade and non-production validation.

Current product foundation:

- Seller-facing AI Marketing dashboard inside the existing account.
- Marketing Mini package proposed at R29/month, separate from Price Checker billing.
- AI social posts, campaign ideas, research briefs and trend-planning briefs.
- Seven-day AI content calendar saved as drafts.
- Seller campaign workspace.
- Separate marketing subscription, usage and payment records.
- Atomic usage reservation and release functions.
- Dedicated Paystack billing function, with checkout hard-disabled.

Build and acceptance priorities:

- [ ] Make the content studio and campaign workspace useful for managing saved content, not just generating it.
- [ ] Improve seller onboarding and explain the value, allowances and limitations of each tool.
- [ ] Add clear usage visibility and helpful quota-exhaustion messaging.
- [ ] Add robust input validation, rate limits, abuse protection and safe error handling.
- [ ] Review all Edge Function authentication, CORS, idempotency and service-role operations.
- [ ] Review all SQL grants, RLS policies, security-definer functions and indexes.
- [ ] Validate every migration on a non-production Supabase branch after Pro is available.
- [ ] Test active, pending, expired and cancelled subscription states.
- [ ] Test quota limits, duplicate requests, model failures and quota release.
- [ ] Configure OpenAI secrets only in Supabase Edge Function secrets; never commit secrets.
- [ ] Receive Paystack merchant approval and test the separate Marketing payment flow in sandbox.
- [ ] Keep Marketing billing and allowances isolated from Price Checker subscriptions, credits and payment triggers.
- [ ] Prepare release notes, support guidance and rollback steps.
- [ ] Enable Marketing gradually only after the user approves the release.

**Current release boundary:** GitHub-only development. Do not create a Supabase development branch until the organisation is on Pro and the cost is understood. Do not apply migrations to production, deploy Edge Functions, enable checkout or deploy to Vercel until separately authorised.

### Stage 3 — Ekhaya Support Desk

**Objective:** Build a seller support service after AI Marketing is ready for staged introduction.

Requirements:

- [ ] Define seller, support-agent and administrator roles.
- [ ] Build ticket creation, assignment, priority and status management.
- [ ] Support seller-visible replies and private internal notes.
- [ ] Add email notifications and escalation paths.
- [ ] Secure attachment access and seller data isolation.
- [ ] Maintain ticket history and audit events.
- [ ] Define service levels and support operating procedures.
- [ ] Specify any support subscription or fee separately before implementation.

## Working and deployment rules

- GitHub is the source of truth during current development.
- Do not deploy to Vercel until explicitly authorised.
- Do not apply feature migrations to the production Supabase project.
- Do not enable Paystack Marketing checkout while merchant approval is pending.
- Do not merge the AI Marketing draft PR until its stage gate is reached and the user explicitly approves.
- Keep the live Price Checker stable and independently deployable.
- Keep each stage independently testable, with its own release checklist and rollback plan.
