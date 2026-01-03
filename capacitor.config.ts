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
      resize: 'body',
      resizeOnFullScreen: true,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#000000',
    },
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
