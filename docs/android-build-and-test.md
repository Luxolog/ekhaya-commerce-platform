# Android debug build and test

The Android app is a Capacitor wrapper around the static Next.js export. It currently packages the calculator and app shell; live marketplace lookups require the hosted server-side ReefAPI/Supabase service and must not put API secrets in the APK.

## Local build

Requirements: Node.js 20+, Java 21, Android SDK / Android Studio, and Android platform tools.

    npm install
    npm run build
    npx cap add android
    npx cap sync android
    cd android
    ./gradlew assembleDebug

APK output: android/app/build/outputs/apk/debug/app-debug.apk.

## GitHub Actions build

The workflow at .github/workflows/android-apk.yml builds the debug APK and uploads it as an Actions artifact named ekhaya-price-checker-debug-apk.

## Tonight's device test checklist

- Install the debug APK on a physical Android device.
- Confirm launch, app name and Ekhaya branding.
- Open the Price Checker and verify all calculator inputs.
- Test zero buying cost, zero selling price, high marketplace fees and target-margin changes.
- Confirm the layout works in portrait and landscape and that keyboard input does not cover essential controls.
- Confirm the app does not expose API keys or Supabase credentials.
- Record device model, Android version and any crash/log output before release.

A debug APK is for testing only. A signed release build, store listing, privacy policy and production backend are separate release steps.
