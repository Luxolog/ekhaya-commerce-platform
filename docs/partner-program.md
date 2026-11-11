# Ekhaya Marketplace Price Checker — Partner Programme

## Programme model

The partner programme is a referral-based customer acquisition channel for marketplace educators, product sourcers, supplier reviewers, creators and seller communities.

### Initial commercial settings

- Standard partner rate: 20% of qualifying subscription revenue.
- Founding partner rate: 30%, granted by written approval.
- Strategic partner rates: individually approved; never above the platform limit of 50%.
- Attribution: one referred customer per authenticated account; first approved referral attribution is retained.
- Commission window: 12 months from the referred customer's first successful qualifying subscription payment.
- Calculation: percentage of subscription revenue actually received, less VAT, refunds, reversals and chargebacks.
- Payout cycle: monthly, by the 7th working day of the following month.
- Minimum payout: R100; lower balances roll forward.
- Payout method: EFT after admin approval and partner bank-detail verification.
- No commission on self-referrals, duplicate/fraudulent accounts, failed payments or unpaid trial registrations.

These are proposed programme defaults. Each partner's signed agreement and approved partner record control their actual rate and terms.

## Product surfaces

- Public overview and earnings estimator: /partners
- Partner dashboard route: /partners/dashboard
- Partner account applications, referrals, commissions and payouts are stored in Supabase after migration 0002_partner_program.sql is applied.

## Data and security design

- Partner profiles are linked to Supabase Auth users.
- Row Level Security allows a partner to read only their own profile, referral clicks, referred accounts, commission ledger and payouts.
- Application submission is limited to the authenticated applicant.
- Platform administration is granted through platform_admins; never trust a client-supplied admin flag.
- Payment webhooks must verify the payment provider signature and use the server-side service role before calling record_partner_commission.
- payment_event_id is unique, making commission creation idempotent for webhook retries.
- The service role key must never be exposed to the browser.
- Commission payments are not automatic: the system records monthly liabilities and an authorised administrator approves and records EFT payouts.

## Remaining integration work before launch

1. Apply the migration to the intended Supabase project and verify RLS policies.
2. Connect Supabase Auth and implement the authenticated application flow.
3. Build the partner admin approval and partner-code issuance workflow.
4. Persist referral clicks and attribution through signup and checkout; define and document the attribution window.
5. Connect verified PayFast subscription payment and refund/webhook events to the commission ledger.
6. Build live partner dashboard queries and monthly statements.
7. Add bank-detail collection with appropriate encryption/access controls and admin payout reconciliation.
8. Test RLS with two partner accounts, an unauthenticated visitor and a platform admin.
9. Complete legal, tax, POPIA and partner-agreement review before public launch.

The dashboard currently shows a clear not-connected state rather than fabricated referral or earnings figures. The earnings estimator is illustrative only.
