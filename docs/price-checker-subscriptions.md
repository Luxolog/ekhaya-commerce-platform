# Price Checker subscription and welcome offer

## Customer offer

Every newly registered account receives **5 free product comparisons once only** (15 marketplace searches at the current three-marketplace setup). This welcome allowance is separate from any paid monthly plan allowance and does not renew monthly.

After the welcome comparisons are used, the customer can choose a paid plan:

| Plan | First paid month | Standard monthly price | Product comparisons per paid month | Maximum marketplace API calls |
|---|---:|---:|---:|---:|
| Basic | **R49 introductory price** | R99 | 50 | 150 |
| Standard | R149 | R149 | 100 | 300 |
| Advanced | R199 | R199 | 150 | 450 |
| Premium | R249 | R249 | 250 | 750 |

The R49 introductory price applies to the Basic plan only and only to the customer's first paid month. From the next renewal, Basic is R99 per month. Other plans are charged at their standard monthly prices from the first paid month.

## Billing calendar

- Paid subscriptions renew on the **1st day of each calendar month**.
- Proposed launch billing flow: collect the first-month amount when the customer subscribes; schedule the first recurring renewal for the next calendar month's 1st, then renew on the 1st of each month after that.
- A customer who subscribes after the 1st therefore has a shorter first paid period. The checkout must disclose the next renewal date and amount before payment. Do not imply that the first payment buys a full month when it does not.
- The Basic introductory R49 amount is charged only for the first paid month; the next Basic renewal is R99. Standard, Advanced and Premium renew at their normal listed price.
- The payment provider's verified webhook, not the browser redirect, is authoritative for activating a subscription or recording a successful renewal.
- Before production billing is enabled, verify that the selected payment gateway supports the required recurring schedule and that its customer consent/mandate flow supports the first payment and calendar-month renewal arrangement. If it cannot schedule this reliably, do not silently substitute anniversary billing.

## Comparison and provider-call accounting

A customer-facing product comparison is one allowance unit. The current search design fans each new comparison out to three retailer searches: Amazon SA, Takealot and Makro. The customer sees comparison units, not API calls.

- Welcome grant: 5 comparisons once per account (15 potential provider calls).
- Basic: 50 comparisons per paid billing month (150 potential provider calls).
- Standard: 100 comparisons per paid billing month (300 potential provider calls).
- Advanced: 150 comparisons per paid billing month (450 potential provider calls).
- Premium: 250 comparisons per paid billing month (750 potential provider calls).
- Do not add the welcome allowance to the monthly paid allowance display as though it repeats every month.
- Deduct one comparison only after a successful comparison request has produced a usable response.
- If the entire comparison fails, do not deduct allowance.
- Recommended partial-result rule: count one comparison when at least one marketplace returns a usable listing; show individual provider failures clearly.
- Cache identical normalized queries for a short, configurable period to reduce repeated provider calls. A valid cache hit should not consume a new comparison allowance.
- Enforce usage on the server, per authenticated account and applicable billing period. Never trust a client-side counter.
- Reserve usage atomically before provider calls to prevent concurrent requests bypassing limits; release the reservation if the comparison fails completely.
- Unused monthly comparisons do not roll over.
- Premium is capped at 250 comparisons; there is no unlimited tier.
- Log provider calls separately from customer comparison usage so actual API costs can be monitored.

## Account lifecycle to implement

1. On first successful account creation, grant 5 welcome comparisons exactly once. Store a unique grant/ledger record so deleting browser data or signing in on another device cannot reissue it.
2. Let the customer use the welcome allowance without entering payment details.
3. When the welcome allowance is exhausted, show the plan selection and checkout.
4. Activate paid access only after verified payment confirmation.
5. Track the selected plan, introductory-price eligibility, amount charged, next renewal date, billing status and monthly allowance in a durable server-side subscription record.
6. At each successful monthly renewal, grant the selected plan's monthly comparison allowance for the new calendar billing period. Do not re-grant the welcome allowance.
7. Handle failed renewals, cancellations, refunds, duplicate webhooks and plan changes idempotently. Define a customer-facing grace/suspension policy before launch.

## Release status and prerequisites

These prices and rules are the intended commercial offer. They are **not yet active, purchasable, or enforced** in the MVP. The current app does not yet have complete customer authentication, a durable usage ledger, recurring billing, or verified payment webhook handling.

Before advertising subscriptions as live, implement and test:
1. User authentication and account ownership.
2. One-time welcome grant and a durable server-side comparison ledger.
3. Atomic server-side quota reservation, completion and failure release.
4. Provider-call accounting and query caching.
5. Payment gateway recurring mandate/schedule and verified webhooks.
6. Calendar-month renewal dates, first-month disclosure, introductory-price eligibility, cancellations, failed payments and refunds.
7. Tests proving a customer cannot claim the welcome offer more than once or bypass quotas through parallel requests.

Do not rely on browser local storage for quota enforcement. Keep all provider API keys on the server.
