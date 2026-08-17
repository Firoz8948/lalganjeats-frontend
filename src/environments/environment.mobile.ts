export const environment = {
  production: false,
  // Phone cannot reach PC via localhost — use your Wi‑Fi LAN IP.
  // Update this if `ipconfig` shows a different IPv4 address.
  apiBaseUrl: 'http://192.168.1.19:8000/api/v1',
  wsBaseUrl: 'ws://192.168.1.19:8000/api/v1',
  appName: 'LalganjEats',
  version: '1.0.0',
  tokenKey: 'le_token',
  userKey: 'le_user',
  clientChannel: 'android_app' as 'web' | 'android_app' | 'ios_app' | 'auto',
};
