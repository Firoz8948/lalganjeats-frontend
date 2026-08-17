import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lalganjeats.customer',
  appName: 'LalganjEats',
  webDir: 'dist/lalganjeats/browser',
  server: {
    // Production-style WebView origin (not a real local server).
    // Requests still go to https://api.lalganjeats.com; only the Origin header
    // becomes https://app.lalganjeats.com instead of https://localhost.
    androidScheme: 'https',
    hostname: 'app.lalganjeats.com',
  },
  android: {
    backgroundColor: '#ffffff',
  },
  plugins: {
    SystemBars: {
      // `index.html` declares `viewport-fit=cover`, which makes Capacitor pass
      // the status/gesture bar insets into CSS and let the page draw under them.
      // The web build is shared with the browser, so MainActivity reserves that
      // space natively instead. See MainActivity.java.
      insetsHandling: 'disable',
      // Dark icons, to stay readable on the white bar areas.
      style: 'LIGHT',
    },
  },
};

export default config;
