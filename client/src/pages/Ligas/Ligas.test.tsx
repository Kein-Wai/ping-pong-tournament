import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, within } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { APP_ROUTES } from '../../constants/routes';
import { useAuthStore } from '../../store/authStore';
import { loginAs, renderWithProviders } from '../../test/utils';
import { Ligas } from './Ligas';

vi.mock('../../api/axios', () => ({ api: { get: vi.fn() } }));

const makeLeague = (overrides: Record<string, unknown> = {}) => ({
  id: 'l0',
  name: 'Liga',
  clubId: 'club-1',
  dateStart: '2026-11-20T10:00:00.000Z',
  status: 'Programado',
  setsToWin: 2,
  doubleRound: false,
  numPlayers: 0,
  _count: { participants: 5 },
  ...overrides,
});

const INVIERNO = makeLeague({ id: 'l1', name: 'Liga de invierno' });
const PRIMAVERA = makeLeague({
  id: 'l2',
  name: 'Liga de primavera',
  status: 'Iniciado',
  setsToWin: 3,
  doubleRound: true,
  _count: { participants: 8 },
});

const serve = (leagues: unknown = [INVIERNO, PRIMAVERA]) => {
  vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: leagues } } as never);
};

const renderPage = () =>
  renderWithProviders(
    <Routes>
      <Route path={APP_ROUTES.HOME} element={<Ligas />} />
      <Route path={APP_ROUTES.LIGAS.NEW} element={<div>Pantalla de liga nueva</div>} />
      <Route path={APP_ROUTES.LIGAS.DETAILS_PATH} element={<div>Pantalla de liga</div>} />
    </Routes>,
  );

const renderLoaded = async () => {
  const view = renderPage();
  await screen.findByRole('heading', { name: 'Ligas' });
  return view;
};

const cardOf = (name: string) =>
  screen.getByText(name).closest('[class*="mantine-Card-root"]') as HTMLElement;

describe('Ligas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
    serve();
    loginAs({ role: 'AdminClub' });
  });

  it('pide las ligas y muestra una tarjeta por cada una', async () => {
    await renderLoaded();

    expect(api.get).toHaveBeenCalledWith(ENDPOINTS.LEAGUES.BASE, undefined);
    expect(screen.getByText('Liga de invierno')).toBeInTheDocument();
    expect(screen.getByText('Liga de primavera')).toBeInTheDocument();
  });

  it('muestra estado, fecha, jugadores, formato de sets y vueltas', async () => {
    await renderLoaded();

    const invierno = within(cardOf('Liga de invierno'));
    expect(invierno.getByText('Programado')).toBeInTheDocument();
    expect(invierno.getByText('20 nov 2026')).toBeInTheDocument();
    expect(invierno.getByText('5 jugadores')).toBeInTheDocument();
    expect(invierno.getByText('Mejor de 3 sets · Una vuelta')).toBeInTheDocument();

    const primavera = within(cardOf('Liga de primavera'));
    expect(primavera.getByText('Iniciado')).toBeInTheDocument();
    expect(primavera.getByText('Mejor de 5 sets · Ida y vuelta')).toBeInTheDocument();
  });

  it('avisa cuando no hay ligas', async () => {
    serve([]);

    await renderLoaded();

    expect(screen.getByText('No se han encontrado ligas.')).toBeInTheDocument();
  });

  it('filtra por nombre', async () => {
    await renderLoaded();

    fireEvent.change(screen.getByPlaceholderText('Buscar por nombre...'), {
      target: { value: 'primavera' },
    });

    expect(screen.queryByText('Liga de invierno')).not.toBeInTheDocument();
    expect(screen.getByText('Liga de primavera')).toBeInTheDocument();
  });

  it('abre el detalle al pulsar una tarjeta', async () => {
    await renderLoaded();

    fireEvent.click(screen.getByText('Liga de invierno'));

    expect(await screen.findByText('Pantalla de liga')).toBeInTheDocument();
  });

  it('el administrador ve el botón de crear liga y navega al formulario', async () => {
    await renderLoaded();

    fireEvent.click(screen.getByRole('button', { name: /Crear Liga/ }));

    expect(await screen.findByText('Pantalla de liga nueva')).toBeInTheDocument();
  });

  it('un jugador no ve el botón de crear liga', async () => {
    loginAs({ role: 'Player' });

    await renderLoaded();

    expect(screen.queryByRole('button', { name: /Crear Liga/ })).not.toBeInTheDocument();
  });

  it('si la carga falla, deja la pantalla vacía sin romperse', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('fallo'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    await renderLoaded();

    expect(screen.getByText('No se han encontrado ligas.')).toBeInTheDocument();
    consoleError.mockRestore();
  });
});
