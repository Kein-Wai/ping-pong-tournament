import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { refreshSession } from './api/session';
import { useAuthStore } from './store/authStore';
import App from './App';

// Se mockea la renovación (acceso a la red) y la app nativa de Capacitor; el store es el real.
vi.mock('./api/session', () => ({
  ACCESS_TOKEN_KEY: 'pingpong_token',
  REFRESH_TOKEN_KEY: 'pingpong_refresh_token',
  refreshSession: vi.fn(),
}));
vi.mock('./api/axios', () => ({ api: { get: vi.fn(), post: vi.fn() } }));
vi.mock('@capacitor/app', () => ({
  App: { addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }) },
}));

const tokenExpiring = (secondsFromNow: number) =>
  `h.${btoa(JSON.stringify({ id: 'u1', exp: Math.floor(Date.now() / 1000) + secondsFromNow }))}.s`;

const renderApp = () =>
  render(
    <MantineProvider>
      <App />
    </MantineProvider>,
  );

describe('App: arranque con el token de acceso caducado', () => {
  const fetchProfile = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    window.history.pushState({}, '', '/');
    const token = tokenExpiring(-60);
    useAuthStore.setState({ token, user: null, isAuthenticated: true, fetchProfile });
  });

  it('intenta renovar la sesión y, si no se puede, la cierra', async () => {
    vi.mocked(refreshSession).mockResolvedValue(null);

    renderApp();

    await waitFor(() => expect(useAuthStore.getState().isAuthenticated).toBe(false));
    expect(refreshSession).toHaveBeenCalledTimes(1);
  });

  it('si la renovación funciona no cierra la sesión', async () => {
    vi.mocked(refreshSession).mockResolvedValue(tokenExpiring(3600));

    renderApp();

    await waitFor(() => expect(refreshSession).toHaveBeenCalledTimes(1));
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('sin red no cierra la sesión: el refresh token sigue siendo válido', async () => {
    vi.mocked(refreshSession).mockRejectedValue(new Error('Network Error'));

    renderApp();

    await waitFor(() => expect(refreshSession).toHaveBeenCalledTimes(1));
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });
});
