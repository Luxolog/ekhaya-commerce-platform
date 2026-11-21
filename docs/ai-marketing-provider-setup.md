# AI Marketing provider setup

## AI content generation

The existing content-generation Edge Function requires server-side OPENAI_API_KEY. OPENAI_MARKETING_MODEL is optional and defaults in code to gpt-4o-mini. Set secrets only in the Supabase function secret manager. Never expose these values through NEXT_PUBLIC variables.

## Email delivery status

The current seller email workspace creates drafts only. No provider is connected and no marketing email is sent. The new delivery-event table is an audit schema foundation, not evidence of delivery.

Before choosing an email provider, compare South African sender-domain support, free-tier limits, POPIA/data-processing terms, bounce and complaint webhooks, suppression support, rate limits and total cost. Provider selection and any paid plan require owner approval.

## Required provider contract

A provider adapter must implement: sender/domain verification, test-send, batch send, idempotency key, provider message ID, webhook signature verification, delivery/bounce/complaint events and suppression. Provider credentials must remain server-side.

## Mandatory send-time checks

Immediately before each send, re-query the recipient by both contact ID and authenticated seller ID. Require a valid email, documented consent, a recorded consent timestamp, no opt-out and no suppression. Re-check immediately before dispatch; a previously saved draft is not sufficient evidence of current consent.

## Safe rollout

1. Select and approve a provider and data-processing terms.
2. Verify the sending domain and sender identity.
3. Configure secrets only in a non-production Supabase environment.
4. Test only with synthetic allowlisted recipients.
5. Verify signed webhooks, retries, duplicate prevention and unsubscribe suppression.
6. Keep live sending disabled until a separate written release approval.
