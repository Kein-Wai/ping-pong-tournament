import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { GoogleOAuthProvider } from '@react-oauth/google';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <MantineProvider defaultColorScheme="dark">
        <Notifications position="top-right" zIndex={1000} />
        <App />
      </MantineProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>,
);
