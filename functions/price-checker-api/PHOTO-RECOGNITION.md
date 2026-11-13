# Ekhaya Price Checker photo recognition

The Price Checker accepts one product photo on both the web app and Android app. The browser compresses the selected image before sending it to the authenticated Appwrite Function.

## Recognition flow

1. The user takes or uploads a product photo.
2. The browser attempts to decode a visible EAN/UPC barcode from that exact image using ZXing (there is no live camera barcode-scanner screen).
3. The same image is sent to the Appwrite Function for visual reading of the brand, product name, model and packaging description.
4. If the barcode decoder finds digits, those digits take priority as the marketplace search query. Otherwise, the extracted brand/name/model/description are combined into an editable search query.
5. The user checks the detected details and starts the selected marketplace searches.

A barcode is never fabricated. If the photo does not show a readable barcode, search falls back to visible product details.

## Appwrite Function environment

Configure these variables on the existing `ekhaya-marketplace-search` Appwrite Function before enabling a deployment:

- `OPENAI_API_KEY` — secret server-side API key used only by the function for image understanding. Add it in Appwrite Function Variables; never put it in the website/mobile bundle or commit it to Git.
- `OPENAI_VISION_MODEL` — optional; defaults to `gpt-4o-mini`.

The existing marketplace provider also needs `REEFAPI_KEY`, and the function's existing Appwrite server credentials and database configuration must remain valid.

After setting variables, deploy a new function version and test the identify-product action with a non-sensitive sample product photo. Then test marketplace search for both a photo with a visible barcode and a photo where the barcode is not visible. Only enable/live the function after these checks pass.

## Request contract

Authenticated Appwrite Function execution body:

```json
{
  "action": "identify_product",
  "image_data_url": "data:image/jpeg;base64,..."
}
```

The image must be JPEG, PNG or WebP and no larger than 5 MB after client-side compression. The response contains product fields, confidence, a barcode (if legibly visible) and the preferred editable marketplace search query.

## Chrome installation

The website route `/price-checker/` is configured as a scoped PWA with a web manifest and service worker. Chrome offers installation when its installability requirements are met (HTTPS, valid manifest, service worker and suitable icons). Verify on the production domain after deployment. The install prompt is shown by the web UI when Chrome exposes `beforeinstallprompt`.

The Android APK remains a separate Capacitor build. The PWA can be installed through Chrome while Google Play publication is pending.
