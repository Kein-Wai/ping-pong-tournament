import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { APP_ROUTES } from '../../constants/routes';
import { useAuthStore } from '../../store/authStore';
import { loginAs, renderWithProviders } from '../../test/utils';
import { Equipos } from './Equipos';

// Se mockea el `api` de bajo nivel (la frontera del sistema) y no los servicios,
// para que estos tests sigan valiendo cuando el acceso a datos migre a servicios.
vi.mock('../../api/axios', () => ({
  api: {
    get: vi.fn(),
  },
}));

const TEAMS = [
  { id: 't1', name: 'Equipo A', category: 'Senior', level: 'Avanzado', _count: { players: 8 } },
  { id: 't2', name: 'Equipo B', category: 'Sub-18', level: 'Intermedio' },
];

const serve = ({ seasons = [{ name: 'Temporada 2026/2027', isCurrent: true }], teams = TEAMS } = {}) => {
  vi.mocked(api.get).mockImplementation((async (url: string) => {
    if (url === ENDPOINTS.SEASONS.BASE) return { data: { data: seasons } };
    if (url === ENDPOINTS.TEAMS.BY_CLUB('club-1')) return { data: { data: teams } };
    throw new Error(`Peticion no esperada: ${url}`);
  }) as never);
};

const renderPage = () =>
  renderWithProviders(
    <Routes>
      <Route path={APP_ROUTES.HOME} element={<Equipos />} />
      <Route path={APP_ROUTES.EQUIPOS.NEW} element={<div>Pantalla de equipo nuevo</div>} />
      <Route path={APP_ROUTES.EQUIPOS.DETAILS_PATH} element={<div>Pantalla de equipo</div>} />
    </Routes>,
  );

const renderLoaded = async () => {
  const view = renderPage();
  await screen.findByRole('heading', { name: 'Equipos del Club' });
  return view;
};

describe('Equipos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
    serve();
    loginAs({ role: 'AdminClub' });
  });

  it('lista los equipos del club con categoria, nivel y plantilla', async () => {
    await renderLoaded();

    expect(api.get).toHaveBeenCalledWith(ENDPOINTS.TEAMS.BY_CLUB('club-1'));
    expect(screen.getByText('Equipo A')).toBeInTheDocument();
    expect(screen.getByText('Senior')).toBeInTheDocument();
    expect(screen.getByText('Avanzado')).toBeInTheDocument();
    expect(screen.getByText('Plantilla: 8 Jugadores')).toBeInTheDocument();
    expect(screen.getByText('Plantilla: 0 Jugadores')).toBeInTheDocument();
  });

  it('muestra la temporada vigente o un texto de carga si no hay ninguna', async () => {
    await renderLoaded();
    expect(await screen.findByText('Temporada 2026/2027')).toBeInTheDocument();
  });

  it('muestra "Cargando temporada..." cuando ninguna temporada es la vigente', async () => {
    serve({ seasons: [{ name: 'Temporada 2025/2026', isCurrent: false }] });

    await renderLoaded();

    expect(screen.getByText('Cargando temporada...')).toBeInTheDocument();
  });

  it('avisa cuando el club no tiene equipos', async () => {
    serve({ teams: [] });

    await renderLoaded();

    expect(screen.getByText('Tu club aún no ha registrado ningún equipo para ligas.')).toBeInTheDocument();
  });

  it('sin club asignado no pide los equipos', async () => {
    loginAs({ role: 'Player', clubId: null });

    await renderLoaded();

    expect(api.get).not.toHaveBeenCalledWith(ENDPOINTS.TEAMS.BY_CLUB('club-1'));
    expect(screen.getByText('Tu club aún no ha registrado ningún equipo para ligas.')).toBeInTheDocument();
  });

  it('pulsar un equipo lleva a su detalle', async () => {
    await renderLoaded();

    fireEvent.click(screen.getByText('Equipo A'));

    expect(await screen.findByText('Pantalla de equipo')).toBeInTheDocument();
  });

  describe('crear equipo', () => {
    it.each(['AdminClub', 'SuperAdmin'])('un %s puede crear equipos', async (role) => {
      loginAs({ role });

      await renderLoaded();
      fireEvent.click(screen.getByRole('button', { name: 'Crear Equipo' }));

      expect(await screen.findByText('Pantalla de equipo nuevo')).toBeInTheDocument();
    });

    it('un Player no ve el boton de crear equipo', async () => {
      loginAs({ role: 'Player' });

      await renderLoaded();

      expect(screen.queryByRole('button', { name: 'Crear Equipo' })).not.toBeInTheDocument();
    });
  });
});
