import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { refreshSession } from './api/session';
import { resetAppLocalStore, setAppLocalStore } from './offline/appLocalStore';
import { createMemoryLocalStore } from './offline/memoryLocalStore';
import { cacheProfile } from './offline/profileCache';
import { useAuthStore, type User } from './store/authStore';
import { useConnectivityStore } from './store/connectivityStore';
import App from './App';

const ANA: User = { id: 'u1', email: 'ana@test.com', name: 'Ana', role: 'Player', clubId: 'club-1' };

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
    resetAppLocalStore();
    setAppLocalStore(createMemoryLocalStore());
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

  it('si al renovar no hay red, arranca con el perfil guardado en el móvil', async () => {
    await cacheProfile(ANA);
    vi.mocked(refreshSession).mockRejectedValue(new Error('Network Error'));

    renderApp();

    await waitFor(() => expect(useAuthStore.getState().user).toEqual(ANA));
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });
});

describe('App: arranque sin conexión', () => {
  const fetchProfile = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    window.history.pushState({}, '', '/');
    resetAppLocalStore();
    setAppLocalStore(createMemoryLocalStore());
    useConnectivityStore.setState({ networkOnline: true, workOffline: false });
    useAuthStore.setState({ token: null, user: null, isAuthenticated: false, fetchProfile });
  });

  afterEach(() => {
    useConnectivityStore.setState({ networkOnline: true, workOffline: false });
  });

  /** El arranque termina cuando desaparece el cargador que se muestra mientras se inicializa la sesión. */
  const bootFinished = () =>
    waitFor(() => expect(document.querySelector('[class*="mantine-Loader"]')).toBeNull());

  const signInWith = (token: string) =>
    useAuthStore.setState({ token, user: null, isAuthenticated: true, fetchProfile });

  it('sin red y con el token vigente usa el perfil guardado sin pedir nada al servidor', async () => {
    await cacheProfile(ANA);
    useConnectivityStore.setState({ networkOnline: false });
    signInWith(tokenExpiring(3600));

    renderApp();

    await waitFor(() => expect(useAuthStore.getState().user).toEqual(ANA));
    expect(fetchProfile).not.toHaveBeenCalled();
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it('sin red y con el token caducado no intenta renovarlo ni cierra la sesión', async () => {
    await cacheProfile(ANA);
    useConnectivityStore.setState({ networkOnline: false });
    signInWith(tokenExpiring(-60));

    renderApp();

    await waitFor(() => expect(useAuthStore.getState().user).toEqual(ANA));
    expect(refreshSession).not.toHaveBeenCalled();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('con red pero «Trabajar offline» activado tampoco pide nada al servidor', async () => {
    await cacheProfile(ANA);
    useConnectivityStore.setState({ networkOnline: true, workOffline: true });
    signInWith(tokenExpiring(3600));

    renderApp();

    await waitFor(() => expect(useAuthStore.getState().user).toEqual(ANA));
    expect(fetchProfile).not.toHaveBeenCalled();
  });

  it('sin red y sin perfil guardado mantiene la sesión abierta', async () => {
    useConnectivityStore.setState({ networkOnline: false });
    signInWith(tokenExpiring(3600));

    renderApp();

    await bootFinished();
    expect(useAuthStore.getState()).toMatchObject({ user: null, isAuthenticated: true });
    expect(fetchProfile).not.toHaveBeenCalled();
  });

  it('con red sigue pidiendo el perfil al servidor como siempre', async () => {
    signInWith(tokenExpiring(3600));

    renderApp();

    await waitFor(() => expect(fetchProfile).toHaveBeenCalledTimes(1));
  });

  it('no usa el perfil guardado de otro usuario', async () => {
    await cacheProfile({ ...ANA, id: 'otro' });
    useConnectivityStore.setState({ networkOnline: false });
    signInWith(tokenExpiring(3600));

    renderApp();

    await bootFinished();
    expect(useAuthStore.getState().user).toBeNull();
  });
});
