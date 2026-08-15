# Capacitor Google Maps (Android / iOS native tracking)

When you wrap the Angular app with Capacitor:

```bash
cd frontend
npm i @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios @capacitor/google-maps
npx cap init LalganjEats com.lalganjeats.app
npx cap add android
npx cap add ios
```

Set the same `GOOGLE_MAPS_API_KEY` in native projects (AndroidManifest / AppDelegate as required by `@capacitor/google-maps`).

Then:

```bash
npm run build
npx cap sync
```

The tracking screen (`features/tracking`) auto-detects Capacitor and prefers the native Google Maps SDK; otherwise it uses the JS map in the WebView.
