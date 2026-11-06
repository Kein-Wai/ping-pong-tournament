import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { api } from '../../api/axios';
import { APP_ROUTES } from '../../constants/routes';
import { useAuthStore } from '../../store/authStore';
import { useSyncStore } from '../../store/syncStore';
import { useConnectivityStore } from '../../store/connectivityStore';
import { loginAs, renderWithProviders } from '../../test/utils';
import { MainLayout } from './MainLayout';

const nativeMock = vi.hoisted(() => ({ native: true }));

vi.mock('../../utils/platform', () => ({ isNativeApp: () => nativeMock.native }));
vi.mock('../../api/axios', () => ({ api: { get: vi.fn(), put: vi.fn() } }));

const renderAt = (path: string) =>
  renderWithProviders(
    <Routes>
      <Route element={<MainLayout />}>
        <Route path={APP_ROUTES.HOME} element={<div>Pantalla de inicio</div>} />
        <Route path={APP_ROUTES.TORNEOS.LIST} element={<div>Pantalla de torneos</div>} />
        <Route path={APP_ROUTES.CALENTAMIENTO} element={<div>Pantalla de calentamiento</div>} />
      </Route>
    </Routes>,
    { initialEntries: [path] },
  );

describe('MainLayout sin conexión', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    nativeMock.native = true;
    useConnectivityStore.setState({ networkOnline: true, workOffline: false });
    useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: {} } } as never);
    loginAs({ clubStatus: 'Aprobado', dominantHand: 'Diestro', playstyle: 'Ofensivo', birthDate: '2000-01-01', rubberForehand: 'LISA', rubberBackhand: 'LISA' });
  });

  it('con red muestra las pantallas con normalidad y sin candados', () => {
    renderAt(APP_ROUTES.TORNEOS.LIST);

    expect(screen.getByText('Pantalla de torneos')).toBeInTheDocument();
    expect(screen.queryByLabelText('Requiere conexión')).not.toBeInTheDocument();
  });

  it('sin red una sección que necesita conexión muestra «Requiere conexión»', () => {
    useConnectivityStore.setState({ networkOnline: false });

    renderAt(APP_ROUTES.TORNEOS.LIST);

    expect(screen.queryByText('Pantalla de torneos')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Requiere conexión' })).toBeInTheDocument();
  });

  it('sin red Calentamiento y el inicio siguen funcionando', () => {
    useConnectivityStore.setState({ networkOnline: false });

    renderAt(APP_ROUTES.CALENTAMIENTO);

    expect(screen.getByText('Pantalla de calentamiento')).toBeInTheDocument();
  });

  it('sin red el menú pone candado a Torneos y no a Calentamiento', () => {
    useConnectivityStore.setState({ networkOnline: false });

    renderAt(APP_ROUTES.HOME);

    const torneos = screen.getByText('Torneos').closest('a, button') as HTMLElement;
    const calentamiento = screen.getByText('Calentamiento').closest('a, button') as HTMLElement;
    expect(within(torneos).getByLabelText('Requiere conexión')).toBeInTheDocument();
    expect(within(calentamiento).queryByLabelText('Requiere conexión')).not.toBeInTheDocument();
  });

  it('sin red y sin perfil guardado pide abrir la app con conexión', () => {
    useConnectivityStore.setState({ networkOnline: false });
    useAuthStore.setState({ user: null });

    renderAt(APP_ROUTES.HOME);

    expect(screen.getByText(/al menos una vez/)).toBeInTheDocument();
  });

  it('«Trabajar offline» del menú de usuario activa el interruptor', async () => {
    renderAt(APP_ROUTES.HOME);

    await userEvent.click(screen.getByText('Usuario'));
    await userEvent.click(await screen.findByText('Trabajar offline'));

    expect(useConnectivityStore.getState().workOffline).toBe(true);
  });

  it('en el navegador no hay interruptor ni candados', async () => {
    nativeMock.native = false;
    useConnectivityStore.setState({ networkOnline: false });

    renderAt(APP_ROUTES.TORNEOS.LIST);
    await userEvent.click(screen.getByText('Usuario'));

    expect(screen.getByText('Pantalla de torneos')).toBeInTheDocument();
    expect(screen.queryByText('Trabajar offline')).not.toBeInTheDocument();
  });

  it('cerrar sesión con pendientes avisa antes de salir', async () => {
    useSyncStore.setState({ pending: 2, needsAttention: 0 });
    renderAt(APP_ROUTES.HOME);

    await userEvent.click(screen.getByText('Usuario'));
    await userEvent.click(await screen.findByText('Cerrar Sesión'));

    expect(await screen.findByText('Tienes datos sin enviar')).toBeInTheDocument();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('cerrar sesión sin pendientes sale directamente', async () => {
    useSyncStore.setState({ pending: 0, needsAttention: 0 });
    renderAt(APP_ROUTES.HOME);

    await userEvent.click(screen.getByText('Usuario'));
    await userEvent.click(await screen.findByText('Cerrar Sesión'));

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
