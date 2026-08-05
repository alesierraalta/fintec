import type { CapacitorConfig } from '@capacitor/cli';

import { resolveCapacitorServerTarget } from './lib/mobile/server-target';

// The native shell bundles no web assets, so this origin is the whole app on device.
// It is resolved from the environment (CAP_SERVER_URL for local development, otherwise
// NEXT_PUBLIC_APP_URL for the deployed origin) so a released APK follows every web
// deploy without being rebuilt. `cleartext` is derived from the protocol, never set by
// hand. See lib/mobile/server-target.ts.
const server = resolveCapacitorServerTarget(process.env);

const config: CapacitorConfig = {
  appId: 'com.fintec.app',
  appName: 'FinTec',
  webDir: 'public', // Using public as placeholder - actual content loaded from server URL
  server,
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#000000',
      showSpinner: false,
    },
    Keyboard: {
      resize: 'native',  // WebView nativo maneja el resize, más compatible con CSS moderno
      resizeOnFullScreen: true,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#000000',
    },
    // App plugin required for appUrlOpen deep-link listener (REQ-12, REQ-13, REQ-14)
    // The fintec:// custom URL scheme is registered in:
    //   Android: android/app/src/main/AndroidManifest.xml (intent-filter)
    //   iOS:     ios/App/App/Info.plist (CFBundleURLTypes → CFBundleURLSchemes)
    // Supabase redirect URL to allow: fintec://auth/callback
    App: {},
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#000000',
  },
  android: {
    backgroundColor: '#000000',
  },
};

export default config;
