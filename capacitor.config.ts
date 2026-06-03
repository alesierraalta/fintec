import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fintec.app',
  appName: 'FinTec',
  webDir: 'public', // Using public as placeholder - actual content loaded from server URL
  server: {
    // Point to your deployed web app URL
    // For Android Emulator, use http://10.0.2.2:3000 instead of localhost
    url: 'http://10.0.2.2:3000',
    cleartext: true, // Allow HTTP for local dev
  },
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
