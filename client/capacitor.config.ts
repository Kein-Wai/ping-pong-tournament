import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.keinwaicheung.tttournamentapp',
  appName: 'TT Tournament App',
  webDir: 'dist',
  server: {
    cleartext: true,
    androidScheme: 'http',
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '867880972431-ttqe2fdhj8nj1bu000f7h60ipnoa283i.apps.googleusercontent.com',
      iosClientId: '867880972431-o7c0k6l2b782gc4h2e97uu073erff8rr.apps.googleusercontent.com',
      androidClientId: '867880972431-cns8bu55ncn9a5fjdcdjc7hkrbir36jo.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
    SplashScreen: {
      backgroundColor: '#000000',
    },
  },
};

export default config;
