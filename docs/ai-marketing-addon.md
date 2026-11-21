# Ekhaya AI Marketing seller add-on

## Scope
AI Marketing is an optional add-on inside the existing Ekhaya Marketplace seller account. It uses the existing Supabase project and seller authentication. It does not modify Price Checker plans, search allowances, marketplace subscriptions or historical payments.

## Initial package
- Marketing Mini: R29 per month (proposed launch price)
- 10 AI-generated social posts
- 4 campaign ideas
- 5 marketing research queries
- 1 monthly trend report

Allowances are stored in `marketing_plans`. Consumption is recorded in `marketing_usage_events` by trusted server-side code only.

## Data model
- `marketing_plans`: server-controlled package and allowance catalogue.
- `seller_marketing_subscriptions`: separate seller add-on entitlement.
- `marketing_usage_events`: auditable feature consumption ledger.
- `marketing_campaigns`: seller-owned drafts and approval workflow.
- `marketing_payment_transactions`: separate payment ledger; does not trigger marketplace search-credit allocation.

## Security
All tables have RLS enabled. Sellers can read only their own subscription, usage, campaigns and payment records. Sellers can create and edit their own campaign drafts, but cannot mark campaigns as approved. Subscription, usage and payment writes are reserved for trusted server-side functions.

## Payment/release gate
Paystack checkout is not enabled by this change. The existing Price Checker Paystack function has a hard-disabled release gate and uses manual renewal. Do not activate or advertise live AI Marketing payments until merchant approval, secrets, webhook handling, transaction verification, idempotency and end-to-end tests are complete. Do not silently create recurring debit mandates.

## Current release boundary
This is a GitHub-only implementation branch. No production database migration, Edge Function deployment, website deployment, or live payment was performed.
