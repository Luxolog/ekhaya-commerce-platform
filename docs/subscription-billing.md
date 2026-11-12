# Ekhaya Price Checker billing model

## Customer-facing prices

| Plan | First month | Monthly renewal |
|---|---:|---:|
| Starter | R49 once-off | R99 |
| Growth | R49 once-off | R149 |
| Pro | R49 once-off | R199 |

Custom solutions are available by contacting Ekhaya Technologies. They are tailored to the customer and are not a fixed self-service subscription tier.

The R49 introductory amount is charged once only. The selected plan's normal monthly price starts on the first renewal date.

## Search allowances

- Starter: 50 searches per month.
- Growth: 100 searches per month.
- Pro: 150–250 searches per month.
- Custom: search allowance and product scope agreed directly with the customer.

## Renewal choices

- Manual: customer pays each renewal using a fresh payment link. No recurring debit authority or automatic charge is created.
- Automatic: customer explicitly authorises a recurring payment. The first renewal amount and date must be shown before consent. The customer can cancel future renewals.

## Checkout disclosure

Before the payment button, show the amount due today, first renewal date, first renewal amount, subsequent monthly amount, payment mode, and cancellation/expiry terms. Manual renewal reminders should be scheduled before period end. Do not imply that access renews until payment is confirmed.

## Payment processing status

The pricing and checkout disclosure page is a preview only. Live payment processing remains disabled until PayFast merchant credentials, recurring-payment configuration, verified ITN/webhook handling, and test transactions are completed. Never place merchant secrets or provider tokens in browser code.

## Operational requirements

- Verify payment notifications server-side and make callbacks idempotent.
- Store each payment and provider reference.
- Send receipts only after verified payment.
- Notify customers of failed automatic payments.
- For manual billing, send renewal reminders and a secure payment link.
- Apply a documented grace period before restricting access.
- Never silently convert manual billing into automatic billing.
