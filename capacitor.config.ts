import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.nexus.productivity',
  appName: 'NEXUS',
  webDir: 'out',
  android: {
    buildOptions: {
      releaseType: 'APK',
    },
  },
  server: {
    // Load the live site so PWA/service-worker never conflicts with WebView
    url: 'https://nexus-future.web.app',
    cleartext: false,
  },
};

export default config;
