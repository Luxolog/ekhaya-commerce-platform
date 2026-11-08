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
