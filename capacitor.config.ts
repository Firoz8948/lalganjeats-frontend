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
};

export default config;
