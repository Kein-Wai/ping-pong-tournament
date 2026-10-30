import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { APP_ROUTES } from '../../constants/routes';
import { useAuthStore } from '../../store/authStore';
import { loginAs, renderWithProviders } from '../../test/utils';
import { LigaDetalles } from './LigaDetalles';

vi.mock('../../api/axios', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
// Las confirmaciones se aceptan al instante: aquí se prueba la pantalla, no el modal.
vi.mock('../../utils/modals', () => ({
  openAppConfirmModal: vi.fn(({ onConfirm }: { onConfirm: () => void }) => {
    void onConfirm();
  }),
}));

const participant = (id: string, name: string, status: string) => ({
  id: `pp-${id}`,
  leagueId: 'l1',
  playerId: id,
  registeredAt: '2026-11-01T10:00:00.000Z',
  status,
  player: { id, name, surname: 'Test', avatarUrl: null },
});

const league = (overrides: Record<string, unknown> = {}) => ({
  id: 'l1',
  clubId: 'club-1',
  name: 'Liga de invierno',
  dateStart: '2026-11-20T10:00:00.000Z',
  status: 'Programado',
  setsToWin: 2,
  doubleRound: false,
  numPlayers: 0,
  participants: [
    participant('a', 'Ana', 'Confirmado'),
    participant('b', 'Luis', 'Confirmado'),
    participant('c', 'Eva', 'Confirmado'),
  ],
  ...overrides,
});

const matchBetween = (id: string, round: number, overrides: Record<string, unknown> = {}) => ({
  id,
  leagueId: 'l1',
  round,
  matchOrder: round,
  walkover: false,
  status: 'Programado',
  playerOneId: 'a',
  playerTwoId: 'b',
  playerOne: { id: 'a', name: 'Ana', surname: 'Test' },
  playerTwo: { id: 'b', name: 'Luis', surname: 'Test' },
  ...overrides,
});

const STANDINGS = {
  final: false,
  standings: [
    { playerId: 'a', position: 1, played: 1, gamesWon: 1, gamesLost: 0, setsWon: 2, setsLost: 0, pointsWon: 22, pointsLost: 10, pointsClas: 2 },
  ],
};

interface Scenario {
  league?: ReturnType<typeof league> | null;
  matches?: unknown[];
  standings?: unknown;
  clubPlayers?: unknown[];
}

const serve = ({ league: leagueData = league(), matches = [], standings = STANDINGS, clubPlayers = [] }: Scenario = {}) => {
  vi.mocked(api.get).mockImplementation(async (url: string) => {
    if (url === ENDPOINTS.LEAGUES.BY_ID('l1')) {
      if (leagueData === null) throw new Error('404');
      return { data: { success: true, data: leagueData } } as never;
    }
    const bodies: Record<string, unknown> = {
      [ENDPOINTS.LEAGUES.MATCHES('l1')]: matches,
      [ENDPOINTS.LEAGUES.STANDINGS('l1')]: standings,
      [ENDPOINTS.USERS.BASE]: clubPlayers,
    };
    return { data: { success: true, data: bodies[url] } } as never;
  });
};

const renderPage = () =>
  renderWithProviders(
    <Routes>
      <Route path={APP_ROUTES.LIGAS.DETAILS_PATH} element={<LigaDetalles />} />
      <Route path={APP_ROUTES.LIGAS.LIST} element={<div>Pantalla de ligas</div>} />
    </Routes>,
    { initialEntries: [APP_ROUTES.LIGAS.DETAILS('l1')] },
  );

const renderLoaded = async () => {
  const view = renderPage();
  await screen.findByRole('heading', { name: 'Liga de invierno' });
  return view;
};

describe('LigaDetalles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, data: {} } } as never);
    vi.mocked(api.put).mockResolvedValue({ data: { success: true, data: {} } } as never);
    vi.mocked(api.delete).mockResolvedValue({ data: { success: true, data: {} } } as never);
    serve();
    loginAs({ id: 'admin-1', role: 'AdminClub' });
  });

  it('carga la liga y muestra sus pestañas', async () => {
    await renderLoaded();

    expect(api.get).toHaveBeenCalledWith(ENDPOINTS.LEAGUES.BY_ID('l1'), undefined);
    expect(screen.getByRole('tab', { name: 'Jugadores' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Calendario' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Clasificación' })).toBeInTheDocument();
  });

  it('si la liga no se puede cargar, lo dice y permite volver al listado', async () => {
    serve({ league: null });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderPage();

    expect(await screen.findByText('No se ha podido cargar la liga.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Volver a Ligas' }));

    expect(await screen.findByText('Pantalla de ligas')).toBeInTheDocument();
    consoleError.mockRestore();
  });

  describe('liga Programada (administrador)', () => {
    it('abre en la pestaña de jugadores con todos los inscritos', async () => {
      await renderLoaded();

      expect(screen.getByText('Ana Test')).toBeInTheDocument();
      expect(screen.getByText('Luis Test')).toBeInTheDocument();
    });

    it('inicia la liga cuando hay 3 jugadores confirmados', async () => {
      await renderLoaded();

      fireEvent.click(screen.getByRole('button', { name: 'Iniciar Liga' }));

      await waitFor(() =>
        expect(api.post).toHaveBeenCalledWith(ENDPOINTS.LEAGUES.START('l1'), undefined, undefined),
      );
    });

    it('con menos de 3 confirmados no se puede iniciar', async () => {
      serve({ league: league({ participants: [participant('a', 'Ana', 'Confirmado'), participant('b', 'Luis', 'Pendiente')] }) });
      await renderLoaded();

      expect(screen.getByRole('button', { name: 'Iniciar Liga' })).toBeDisabled();
    });

    it('añade jugadores del club desde el modal', async () => {
      serve({
        clubPlayers: [
          { id: 'a', name: 'Ana', surname: 'Test', avatarUrl: null },
          { id: 'z', name: 'Zoe', surname: 'Nueva', avatarUrl: null },
        ],
      });
      await renderLoaded();

      fireEvent.click(screen.getByRole('button', { name: /Añadir jugadores/ }));
      fireEvent.click(await screen.findByText('Zoe Nueva'));
      fireEvent.click(screen.getByRole('button', { name: 'Añadir 1 jugadores' }));

      await waitFor(() =>
        expect(api.post).toHaveBeenCalledWith(
          ENDPOINTS.LEAGUES.PARTICIPANTS('l1'),
          { playerIds: ['z'] },
          undefined,
        ),
      );
    });

    it('elimina la liga y vuelve al listado', async () => {
      await renderLoaded();

      fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));

      expect(await screen.findByText('Pantalla de ligas')).toBeInTheDocument();
      expect(api.delete).toHaveBeenCalledWith(ENDPOINTS.LEAGUES.BY_ID('l1'), undefined);
    });
  });

  describe('liga Iniciada', () => {
    const ongoing = () =>
      serve({
        league: league({ status: 'Iniciado' }),
        matches: [matchBetween('m1', 1)],
      });

    it('abre en la clasificación', async () => {
      ongoing();
      await renderLoaded();

      expect(await screen.findByText('Ana Test')).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Pts' })).toBeInTheDocument();
    });

    it('el administrador registra un resultado desde el calendario', async () => {
      ongoing();
      await renderLoaded();

      fireEvent.click(screen.getByRole('tab', { name: 'Calendario' }));
      fireEvent.click(await screen.findByRole('button', { name: 'Resultado' }));

      expect(await screen.findByText('Actualizar Marcador del Partido')).toBeInTheDocument();
    });

    it('el administrador finaliza la liga', async () => {
      ongoing();
      await renderLoaded();

      fireEvent.click(screen.getByRole('button', { name: 'Finalizar Liga' }));

      await waitFor(() =>
        expect(api.post).toHaveBeenCalledWith(ENDPOINTS.LEAGUES.FINISH('l1'), undefined, undefined),
      );
    });

    it('retira a un jugador desde la pestaña de jugadores', async () => {
      ongoing();
      await renderLoaded();

      fireEvent.click(screen.getByRole('tab', { name: 'Jugadores' }));
      const row = (await screen.findByText('Luis Test')).closest('tr') as HTMLElement;
      fireEvent.click(within(row).getByRole('button', { name: 'Retirar' }));

      await waitFor(() =>
        expect(api.post).toHaveBeenCalledWith(ENDPOINTS.LEAGUES.WITHDRAW('l1', 'b'), undefined, undefined),
      );
    });
  });

  describe('jugador', () => {
    beforeEach(() => {
      loginAs({ id: 'z', role: 'Player' });
    });

    it('se inscribe en una liga Programada', async () => {
      await renderLoaded();

      fireEvent.click(screen.getByRole('button', { name: 'Inscribirme' }));

      await waitFor(() =>
        expect(api.post).toHaveBeenCalledWith(ENDPOINTS.LEAGUES.REGISTER('l1'), undefined, undefined),
      );
    });

    it('si ya está inscrito puede darse de baja', async () => {
      loginAs({ id: 'b', role: 'Player' });
      await renderLoaded();

      fireEvent.click(screen.getByRole('button', { name: 'Darme de Baja' }));

      await waitFor(() =>
        expect(api.delete).toHaveBeenCalledWith(ENDPOINTS.LEAGUES.REGISTER('l1'), undefined),
      );
    });

    it('no ve las acciones de administración ni puede registrar resultados', async () => {
      serve({ league: league({ status: 'Iniciado' }), matches: [matchBetween('m1', 1)] });
      await renderLoaded();

      expect(screen.queryByRole('button', { name: 'Finalizar Liga' })).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('tab', { name: 'Calendario' }));
      expect(await screen.findByText('Jornada 1')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Resultado' })).not.toBeInTheDocument();
    });
  });
});
