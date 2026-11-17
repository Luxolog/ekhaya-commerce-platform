# Ekhaya Price Checker

A price intelligence and profitability tool for South African resellers, built by Ekhaya Technologies.

## Current application

- Responsive Price Checker at /price-checker with product-name search, barcode identification and photo-based identification flows.
- The web application contains client-side calls to the deployed Supabase Edge Functions for marketplace search and product identification. These flows still require authorised end-to-end acceptance testing before they can be described as production-verified.
- Takealot is the only marketplace currently selectable in the Price Checker. Amazon South Africa is marked as testing; Makro, Bobshop and Leroy Merlin are not available integrations.
- Profitability figures are estimates. Confirm current marketplace fee schedules and all category, size, weight, fulfilment and VAT assumptions before relying on them for purchasing decisions.
- Seller account, pricing, marketplace guidance and privacy pages are present.
- Capacitor Android wrapper and GitHub Actions debug APK build. The debug APK is for internal testing only and is not a public app release.

## Cache refresh policy

- Popular listings (50+ searches in 24 hours): 30 minutes
- Regular listings (5–49 searches): 6 hours
- Inactive listings (0–4 searches): 24 hours
- Manual refresh cooldown: 15 minutes per customer/product, with a server-wide duplicate-request guard

Cache is shared across customers. Cache hits do not consume a new provider lookup. Failed refreshes preserve the last successful price and mark it stale.

## Development

Requirements: Node.js 20+.

    npm install
    npm run dev

## Android internal debug build

    npm install
    npm run build
    npx cap sync android
    cd android && ./gradlew assembleDebug

See docs/android-build-and-test.md. A successful debug build does not constitute a signed, tested public Android release.

## Environment and security

Copy .env.example to .env.local for local server-side integration work. Never commit real keys. Keep service-role credentials server-side and out of browser bundles and Android packages. Do not ask users to send API keys through chat, email or screenshots.

## Release status

The production website's availability does not by itself verify authentication, live search, barcode/photo identification, search-credit accounting, payment callbacks, notifications or backup restoration. Complete the documented production-readiness acceptance tests before wider seller onboarding.
