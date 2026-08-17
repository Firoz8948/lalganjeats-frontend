import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lalganjeats.customer',
  appName: 'LalganjEats',
  webDir: 'dist/lalganjeats/browser',
  server: {
    androidScheme: 'https',
  },
};

export default config;
