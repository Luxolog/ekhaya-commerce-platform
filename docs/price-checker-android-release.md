# Ekhaya Price Checker — Android Release Architecture

## Current decision

The repository already uses Capacitor 7 and has an Android debug APK workflow. Continue with Capacitor for the first direct-distribution APK rather than introducing a second native packaging stack in parallel.

The Android wrapper must open only:

`https://pricechecker.ekhayatech.co.za/price-checker/`

It must not launch the Ekhaya Technologies marketing homepage or expose unrelated site journeys as the app's primary experience.

## Current configuration

- Application ID: `za.co.ekhaya.technologies.pricechecker`
- Display name: `Ekhaya Price Checker`
- Web runtime: production Price Checker PWA URL, configurable through `PRICE_CHECKER_APP_URL` for an approved test environment
- Cleartext HTTP: disabled
- Allowed navigation: Price Checker production hostname only
- Web application/backend: existing Next.js PWA and Supabase services

The wrapper uses the existing PWA for its application experience. PWA updates are delivered by the website; native wrapper changes require a new APK build.

## Why Capacitor first

Capacitor is already present in dependencies, configuration and the repository's debug APK workflow. This avoids adding Bubblewrap/TWA as a competing build path before the first device-tested APK exists.

A Trusted Web Activity can be evaluated later if Play Store distribution becomes a priority. TWA requires a Digital Asset Links association and a verified signing certificate fingerprint. Do not publish `/.well-known/assetlinks.json` with a guessed fingerprint.

## Build workflow

The GitHub Actions workflow `.github/workflows/android-apk.yml` creates the Android platform during the CI job, builds a debug APK and uploads it as a short-retention artifact.

No Android project directory or APK is currently committed to the repository. No release signing credentials are stored in GitHub source.

## Release blockers

1. Run and inspect the Android debug workflow on the feature branch.
2. Install the generated APK on a physical Android device.
3. Verify login, session refresh, camera barcode scanning, photo recognition, live search and subscription/search-limit enforcement.
4. Confirm Android back navigation and external-link behaviour.
5. Obtain owner-controlled release signing credentials before creating a distributable release APK.
6. Decide whether a direct APK release or Google Play distribution is the first Android release channel.

## Security constraints

- Never commit keystores, passwords or private signing material.
- Do not weaken Supabase authentication or seller permissions.
- The wrapper must not bypass server-side search quotas or subscription checks.
- Do not advertise an APK until a real signed package has been produced and verified.
- The PWA remains the primary cross-platform install option.
