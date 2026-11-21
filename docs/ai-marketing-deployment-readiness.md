# Ekhaya AI Marketing — deployment readiness

## Release boundary

This is a release checklist only. No production migrations, Edge Function deployments, Vercel deployments, payment activation or infrastructure provisioning have been performed. Keep AI Marketing separate from Price Checker billing and usage.

## Required prerequisites

- Supabase Pro and an isolated non-production environment are available.
- The existing Supabase project and region are confirmed before applying any migration.
- A non-production OPENAI_API_KEY is configured as an Edge Function secret; optionally configure OPENAI_MARKETING_MODEL.
- SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are available to Edge Functions through the platform secret manager.
- APP_ORIGIN is set to the approved application origin.
- Paystack merchant approval is complete before any checkout release consideration.
- Paystack sandbox credentials and a registered webhook endpoint are available for acceptance testing.
- PAYSTACK_SECRET_KEY, PAYSTACK_WEBHOOK_SECRET, APP_BASE_URL and PAYSTACK_MARKETING_CHECKOUT_ENABLED are configured only in the secure function environment when sandbox testing is authorised.
- Source-level MARKETING_CHECKOUT_RELEASE_ENABLED and frontend CHECKOUT_UI_ENABLED remain hard-disabled until a separate release decision and completed payment acceptance tests.

## Migration order

Apply these files to an isolated non-production database in this order, after reviewing the diffs and confirming the base schema is present:

1. 20261121213000_add_ai_marketing_seller_addon.sql
2. 20261121220000_add_ai_marketing_usage_enforcement.sql
3. 20261121230000_add_ai_marketing_calendar.sql
4. 20261122010000_harden_ai_marketing_quota_rpc_search_path.sql
5. 20261122020000_add_marketing_research_reports.sql
6. 20261122030000_expand_marketing_campaigns.sql
7. 20261122040000_allow_seller_campaign_approval.sql
8. 20261122050000_add_marketing_brand_and_products.sql
9. 20261122060000_add_marketing_contacts_and_email_drafts.sql

Do not apply this list directly to production. Confirm migration history and dependencies in the target environment first.


## Brand, product, contacts and email draft notes

- Brand profiles and product records are seller-owned under RLS. Product context is looked up server-side using both the saved product ID and authenticated seller ID.
- Product image references are metadata only; no image upload or media storage integration is enabled.
- Contact records are private seller CRM data. CSV import skips duplicate email addresses within the seller's existing contact list. Contacts imported without a documented consent basis remain non-marketable.
- An email campaign is only a saved draft. The database validates that every selected recipient belongs to the same seller and has a recorded consent, a non-null email address and no opt-out timestamp.
- No email provider is connected. The platform does not send emails, claim delivery or claim open/click tracking.
- Sellers must collect and retain valid consent evidence and honour opt-outs. This workflow is a technical safeguard, not a legal determination of POPIA compliance.

## Edge Function release order

1. ai-marketing-generate
2. ai-marketing-weekly-plan
3. paystack-marketing-billing (checkout and webhook remain disabled)

Deploy only after migrations have been applied and verified in the isolated environment. Keep all provider keys server-side.

## Acceptance and security checks

- Sign in as two separate sellers and verify cross-account reads and writes are denied.
- Verify unauthenticated access is denied.
- Verify subscription, payment and usage rows are seller-scoped and isolated from Price Checker tables.
- Verify quota exhaustion, duplicate idempotency keys, concurrent generation and failure refunds.
- Verify each content format and optional target audience, product facts and brand voice inputs.
- Verify generated reports are seller-context-based and not represented as live verified research.
- Verify campaign approval is an internal seller review state only.
- Verify calendar approval does not publish or schedule posts to external social networks.
- Verify payment webhook signatures, amount, currency, reference, idempotency and subscription ownership in Paystack sandbox before any enablement.
- Verify no client-side bundle contains OpenAI, Paystack secret or Supabase service-role credentials.

## Rollback

- Stop new seller access to Marketing using the application release gate.
- Disable relevant Edge Functions if a security or data-integrity issue is found.
- Preserve transaction and usage evidence for investigation.
- Prefer forward-fix migrations. Do not drop seller data tables as a routine rollback.
- If schema rollback is unavoidable, prepare and review a separate reversible migration against a database backup in non-production first.

## Post-release verification

- Confirm seller login, plan display, quota balances and usage history.
- Confirm report, campaign and calendar persistence.
- Confirm transaction history reads only from the Marketing ledger.
- Confirm Price Checker checkout, subscriptions, marketplace searches and credits remain unchanged.
- Confirm monitoring and support ownership before opening access to sellers.
