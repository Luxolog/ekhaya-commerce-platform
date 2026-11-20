# Paystack checkout preparation

This branch prepares Paystack-hosted, one-off monthly subscription payments for Ekhaya Price Checker. It deliberately does not enable or deploy checkout to the public website.

## Commercial plan configuration

| Plan | Monthly price | Monthly search credits |
|---|---:|---:|
| Starter | R99 | 50 |
| Growth | R149 | 100 |
| Pro | R199 | 250 |

The Supabase `plan_search_allowances` table already contains the matching 50 / 100 / 250 credit allowances. Do not alter existing seller balances or historical payment records as part of this preparation.

## Checkout design

- Authenticated sellers request a checkout session for a server-allowlisted plan.
- The Edge Function creates a pending subscription and payment transaction, then asks Paystack to initialize a ZAR transaction.
- The seller is redirected to Paystack's hosted authorization page.
- The webhook validates `x-paystack-signature` using HMAC SHA-512 and independently verifies the transaction with Paystack.
- Only a verified successful payment activates the subscription and marks the payment complete.
- The existing database trigger `allocate_search_credits_on_payment_complete` allocates the plan's search credits after payment completion.
- Billing mode is `manual`: this implementation does not silently create a recurring debit mandate. Sellers renew monthly through a fresh hosted checkout until an approved recurring-billing arrangement is deliberately implemented.

## Required Edge Function secrets

Configure these in Supabase Edge Function secrets only after Ekhaya Technologies' Paystack merchant profile is approved:

- `PAYSTACK_SECRET_KEY` — secret key; never expose it in browser code or Git.
- `PAYSTACK_CHECKOUT_ENABLED` — keep unset or `false` until approval and end-to-end testing; set to `true` only when ready.
- `APP_BASE_URL` — approved production application origin, including scheme.
- `APP_ORIGIN` — exact allowed browser origin for CORS.
- Supabase provides `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions.

The webhook URL is `https://itxxnhcjjiynrmivexcb.supabase.co/functions/v1/paystack-billing/webhook`. Register it in the approved Paystack dashboard only after the function has been deployed and verified.

## Pre-launch acceptance tests

1. Checkout remains disabled when `PAYSTACK_CHECKOUT_ENABLED` is absent or false.
2. Unauthenticated callers cannot initialize checkout.
3. Unknown plan codes are rejected.
4. Starter / Growth / Pro initialize at exactly R99 / R149 / R199 in ZAR.
5. Invalid webhook signatures are rejected.
6. Duplicate webhook deliveries do not allocate credits twice.
7. Failed, pending, wrong-currency, wrong-amount and mismatched-reference transactions never activate subscriptions.
8. Verified payment activates the subscription, updates the seller plan and allocates exactly 50 / 100 / 250 credits.
9. A payment is never considered successful based only on the browser return URL.
10. Manual renewal and cancellation behavior is tested before live activation.

## Important release boundary

No Paystack credentials are stored in this repository. Do not enable checkout or advertise live payment availability until merchant approval, secrets configuration, webhook registration and acceptance testing are complete. No Vercel deployment is part of this work.
