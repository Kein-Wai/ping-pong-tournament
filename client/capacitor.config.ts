import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.keinwaicheung.tttournamentapp',
  appName: 'tttournamentapp',
  webDir: 'dist',
  server: {
    cleartext: true,
    androidScheme: 'http',
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: 'TU_WEB_CLIENT_ID.apps.googleusercontent.com', // El Client ID de Tipo Web
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
