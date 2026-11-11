# Ekhaya Price Checker

A price intelligence and profitability tool for South African resellers, built by Ekhaya Technologies.

## Current build

- Responsive price calculator at /price-checker
- Capacitor Android wrapper for debug APK testing
- Shared marketplace cache schema, demand-based TTL policy, refresh queue, price history and API usage ledger
- Server-side integration architecture documented; ReefAPI and Supabase credentials are not stored in the repository or APK

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

## Android debug APK

    npm install
    npm run build
    npx cap add android
    npx cap sync android
    cd android && ./gradlew assembleDebug

See docs/android-build-and-test.md.

## Environment

Copy .env.example to .env.local for server-side integration work. Never commit real keys. The current Android debug build contains the static calculator/app shell only; live marketplace research requires a deployed server-side API and database.

## Safety

Never commit API keys, payment secrets, database credentials, customer data, or .env files.
