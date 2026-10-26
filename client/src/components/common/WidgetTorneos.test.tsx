import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { APP_ROUTES } from '../../constants/routes';
import { useAuthStore } from '../../store/authStore';
import { loginAs, renderWithProviders } from '../../test/utils';
import { WidgetTorneos } from './WidgetTorneos';

// Se mockea el `api` de bajo nivel (la frontera del sistema) y no los servicios,
// para que estos tests sigan valiendo cuando el acceso a datos migre a servicios.
vi.mock('../../api/axios', () => ({
  api: {
    get: vi.fn(),
  },
}));

const makeTournament = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  name: `Torneo ${id}`,
  status: 'Grupos',
  ...overrides,
});

const serve = (tournaments: unknown[] = [makeTournament('t1', { name: 'Open Primavera' })]) => {
  vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: tournaments } } as never);
};

const renderWidget = () =>
  renderWithProviders(
    <Routes>
      <Route path={APP_ROUTES.HOME} element={<WidgetTorneos />} />
      <Route path={APP_ROUTES.TORNEOS.LIST} element={<div>Pantalla de torneos</div>} />
      <Route path={APP_ROUTES.TORNEOS.DETAILS_PATH} element={<div>Pantalla de un torneo</div>} />
    </Routes>,
  );

describe('WidgetTorneos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
    serve();
    loginAs({ id: 'p1', role: 'Player' });
  });

  it('pide los torneos en los que esta inscrito el jugador', async () => {
    renderWidget();
    await screen.findByText('Mis Torneos Activos');

    expect(api.get).toHaveBeenCalledWith(ENDPOINTS.TOURNAMENTS.ENROLLED('p1'), undefined);
  });

  it('muestra el nombre y la fase de cada torneo', async () => {
    renderWidget();

    expect(await screen.findByText('Open Primavera')).toBeInTheDocument();
    expect(screen.getByText('Fase: Grupos')).toBeInTheDocument();
  });

  it('muestra como maximo tres torneos', async () => {
    serve(['a', 'b', 'c', 'd'].map((id) => makeTournament(id)));

    renderWidget();
    await screen.findByText('Mis Torneos Activos');

    expect(screen.getAllByRole('button', { name: 'Ver Cuadro' })).toHaveLength(3);
    expect(screen.queryByText('Torneo d')).not.toBeInTheDocument();
  });

  it('«Ver Cuadro» lleva al detalle del torneo', async () => {
    renderWidget();

    fireEvent.click(await screen.findByRole('button', { name: 'Ver Cuadro' }));

    expect(await screen.findByText('Pantalla de un torneo')).toBeInTheDocument();
  });

  it('invita a buscar torneos cuando no esta inscrito en ninguno', async () => {
    serve([]);

    renderWidget();

    expect(
      await screen.findByText('No estás inscrito en ningún torneo activo actualmente.'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Buscar Torneos' }));
    expect(await screen.findByText('Pantalla de torneos')).toBeInTheDocument();
  });

  it('si falla la carga muestra el estado vacio', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(api.get).mockRejectedValue(new Error('red caida'));

    renderWidget();

    expect(
      await screen.findByText('No estás inscrito en ningún torneo activo actualmente.'),
    ).toBeInTheDocument();
    expect(consoleError).toHaveBeenCalled();
  });

  it('sin sesion no pide nada y muestra el estado vacio', async () => {
    useAuthStore.setState({ token: null, user: null, isAuthenticated: false });

    renderWidget();

    expect(
      await screen.findByText('No estás inscrito en ningún torneo activo actualmente.'),
    ).toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
  });
});
