# Android APK testing (Android Studio)

This first Android build is a **development test shell** for the existing Next.js Price Checker. It loads the web app from your development computer, so the ReefAPI key stays on the server and does not go inside the APK.

## 1. Requirements

- Node.js 20+
- Android Studio with an Android SDK and emulator (or a USB-connected Android phone)
- The repository branch `price-checker-week-one`

## 2. Get the latest code

```bash
git checkout price-checker-week-one
git pull origin price-checker-week-one
npm install
```

## 3. Start the web server

In terminal 1:

```bash
npm run dev -- --hostname 0.0.0.0
```

Keep this terminal running. The app API route runs on this computer and reads `REEFAPI_KEY` from the local, ignored `.env.local` file. Configure the key on the computer only; never put it in the Android app.

## 4. Generate the Android project

In terminal 2, from the repository root:

```bash
npx cap add android
npx cap sync android
npx cap open android
```

Android Studio opens the generated project. Wait for Gradle sync to finish, then select an emulator and press **Run**.

The default Capacitor URL is `http://10.0.2.2:3000`, which routes the Android Studio emulator to the development computer's port 3000.

## 5. Use a physical Android phone instead

Connect the phone and computer to the same Wi-Fi network. Find the computer's LAN IPv4 address (Windows: run `ipconfig` and use the Wi-Fi adapter's IPv4 address). Stop Android Studio before rebuilding with the phone URL, then run:

PowerShell:
```powershell
$env:CAPACITOR_SERVER_URL="http://192.168.1.100:3000"
npx cap sync android
npx cap open android
```

Replace the example IP with the computer's actual LAN address. Allow Node.js through Windows Firewall on private networks if prompted. Keep the dev server running.

## 6. Build a test APK

In Android Studio choose **Build > Build Bundle(s) / APK(s) > Build APK(s)**. Android Studio will show the output location, normally:

`android/app/build/outputs/apk/debug/app-debug.apk`

Install that debug APK on the emulator or phone.

## Testing boundaries

- The APK is a test shell; it needs the development computer and its web server to be running and reachable.
- The API key remains on the development computer. Do not embed it in the app.
- A Takealot search makes the one enabled Takealot search request. Amazon SA and Makro remain static placeholders and make zero API calls.
- Avoid repeated searches while checking layout; each uncached Takealot search may consume a provider credit.
- This is not a standalone/offline or Play Store release. A production APK/AAB needs a deployed HTTPS backend, final app configuration, and release signing.
- Camera barcode scanning must be tested on a real device. Browser camera permission behaviour inside the Android WebView may need a native permission adjustment if scanning is blocked.
