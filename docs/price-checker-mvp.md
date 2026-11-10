# Ekhaya Price Checker — Phase 1 MVP

## Goal
Launch a useful, paid-first product pricing calculator for South African resellers. Phase 1 provides transparent calculations; automated public listing research and AI matching are later milestones.

## Current route
- `/price-checker`

## Phase 1 features
- Buying cost and planned selling price inputs
- Editable marketplace percentage and fixed fees
- Other cost / shipping contribution input
- Estimated profit per sale
- Profit margin calculation
- Suggested selling price for a target margin
- Responsive calculator interface

## Calculation notes
- Marketplace percentage fee is applied to the entered selling price.
- Profit = selling price − buying cost − percentage fee − fixed fee − other entered costs.
- Suggested price solves for the selected target margin using the entered cost and fee assumptions.
- Fees are estimates supplied by the user; the application must not represent them as official current marketplace fees.

## Not yet implemented
- Accounts and saved products
- Subscription billing and payment gateway
- Live competitor price collection
- AI exact / similar product matching
- Price history or alerts
- Official marketplace fee tables

## Next engineering milestones
1. Review and test the calculator on desktop and mobile.
2. Add validation and test cases for edge cases (zero price, 100% fees, empty fields).
3. Decide hosting/runtime support and database.
4. Add accounts, usage quotas, subscription plans and payment flow only after the pricing model and billing requirements are confirmed.
5. Add public listing research using permitted sources and display source URLs and timestamps.
6. Add AI matching with explicit exact / similar / not comparable labels and confidence indicators.

## Security
Never commit API keys, payment secrets, database credentials, customer data or environment files.


## One-week delivery plan (working target)

The first seven-day release should be a usable MVP, not a promise of complete marketplace-wide automated crawling.

- **Day 1 — Calculator hardening:** extract calculations into a pure helper, handle invalid/zero inputs and impossible target margins, and review responsive UI.
- **Day 2 — Product lookup UX:** product name / barcode entry, result state, and a clear path for supported sources. No fabricated live results.
- **Day 3 — Comparison records:** define a consistent product/listing schema (product identifier, seller, marketplace, price, delivery, availability, source URL, observed timestamp, match quality).
- **Day 4 — Source integration spike:** confirm approved access and data collection approach for the first marketplace/source. Implement only when the source permits it.
- **Day 5 — Comparison results:** show sourced listings with delivery-inclusive total, timestamp, source link, and exact/similar match labels.
- **Day 6 — QA:** test responsive layouts, arithmetic, empty/error states, stale source data and accessibility.
- **Day 7 — Demo release:** deploy a testable version, document what's live versus simulated, and collect early-user feedback.

### Release boundary

The MVP can only display live comparisons for sources for which access is configured and allowed. Until then, the product lookup should clearly say that results are unavailable rather than showing invented prices. Subscription payments, user accounts, alerts, and AI matching remain outside the first week's critical path unless the core comparison source is confirmed early.


## Agreed lean reseller MVP (Nov 10, 2026)

Keep the first product intentionally minimal. Primary journey: identify product → compare the three marketplaces → enter buy/sell prices → view estimated profit → save product.

### Product input and matching
- Support barcode input and product-name search as the initial lookup entry points; photo capture/upload is a required user-facing path when image recognition is available.
- Prefer an exact match using barcode/GTIN, brand and model identifiers.
- When exact match is not found, show alternatives explicitly labelled “Similar product”; never present a substitute as exact.
- Listing results must carry marketplace, item title, listed price, URL, observation time, match status and source.
- Do not invent or silently reuse stale marketplace prices. If source access is unavailable, show “Price unavailable” with an explanation.

### Marketplace profit estimate
For each supported marketplace, show:
- Seller-entered selling price and product cost
- Estimated commission/success fee
- Estimated fulfilment fee (where relevant)
- Shipping to fulfilment centre and other costs (optional inputs)
- Revenue, total estimated marketplace fees, estimated net payout before product costs, estimated profit after all entered costs, and profit margin
- Explicit disclosure: marketplace fees are estimates and exclude the Price Checker subscription; actual fees vary by category, size/weight and fulfilment method.

Keep marketplace fee logic distinct per marketplace. Do not reuse one platform’s fee formula for another. If we lack a reliable category/weight fee table, allow editable estimates rather than pretending the fee is official.

### Product allowance / subscriptions
- Free: 5 saved products
- Paid limits: 30, 50, 100, and 150+ saved products
- Product count applies to saved/tracked products, not scans.
- Subscription price and payment integration remain unconfirmed; do not charge or represent a plan as purchasable until billing is implemented.

### Lean launch boundary
No analytics dashboard, price alerts, inventory, repricing or broad business-suite features in this MVP. Start with one useful scan-to-profit workflow. Live marketplace prices and photo recognition require a permitted, configured data/recognition source; a demo must clearly distinguish sourced data from mock or manually entered values.
