# Ekhaya Commerce Platform

A Next.js 15 application for Ekhaya Technologies' marketplace price-comparison product and future commerce services.

## Current Price Checker status

- Takealot search is the only live marketplace source currently wired into the Price Checker server route.
- Amazon SA and Makro are visible as planned sources only. They are not queried and consume **zero API credits**.
- A Price Checker search currently makes one Takealot search request. Product detail and seller-offer requests are not triggered automatically.
- Search results are candidate listings. Verify the exact product variant, seller, stock, delivery and checkout price before buying.

See [the ReefAPI integration notes](docs/reefapi-takealot-integration.md) for configuration and credit controls.

## Development

Requirements: Node.js 20+.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

Available checks:

```bash
npm run lint
npm run build
```

## Environment configuration

For local development, place server-only secrets in the ignored `.env.local` file. The Takealot search route expects:

```env
REEFAPI_KEY=your_reefapi_key
```

Set the same variable in the production hosting environment before deploying. Never use a `NEXT_PUBLIC_*` prefix for this key, and never commit `.env.local`, API keys, payment secrets, database credentials or customer data.

## APK / Android status

A Capacitor Android test-shell configuration and Android Studio setup guide have been added. The native Android project still needs to be generated locally with `npx cap add android`; no APK has been built or device-tested yet. See [Android APK testing](docs/android-apk-testing.md).

For the development test APK, start the Next.js server on the development computer and load it through the Android emulator or a phone on the same Wi-Fi network. The API key stays on the development computer. A standalone production APK/AAB still requires a deployed HTTPS backend, final app identity/icons/splash configuration, permissions and release signing.

## Not yet production-complete

- Confirmed production deployment and end-to-end testing of the Takealot route.
- Durable user accounts and search allowance/quota enforcement.
- Subscription checkout, recurring billing and payment webhook verification.
- Persistent comparison history and live partner/referral account data.
- Amazon SA and Makro integrations (intentionally disabled for now).
- Android wrapper, native project and APK/AAB release pipeline.

## Security and data accuracy

Keep provider credentials server-side. If a key is exposed in chat, screenshots, source code or a public repository, rotate it and update the server environment. Never invent missing marketplace prices or present stale indexed data as a verified checkout quote.
