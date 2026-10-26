import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { GoogleOAuthProvider } from '@react-oauth/google';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/charts/styles.css';
import './index.css';
import { setUnauthorizedHandler } from './api/axios';
import { setTokenRefreshedHandler } from './api/session';
import { useAuthStore } from './store/authStore';

// Un 401 fuera del login significa sesión caducada: el interceptor avisa y el store la cierra.
setUnauthorizedHandler(() => useAuthStore.getState().logout());
// Al renovar la sesión el store debe seguir con el token vigente, no con el caducado.
setTokenRefreshedHandler((token) => useAuthStore.setState({ token }));

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <MantineProvider defaultColorScheme="light">
        <Notifications position="bottom-right" zIndex={1000} />
        <App />
      </MantineProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>,
);
