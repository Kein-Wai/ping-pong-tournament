import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { api } from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';
import { APP_ROUTES } from '../constants/routes';
import { useAuthStore, type User } from '../store/authStore';
import { normalizeIds, renderWithProviders } from '../test/utils';
import { Dashboard } from './Dashboard';

// Se mockea el `api` de bajo nivel (la frontera del sistema) y no los servicios,
// para que estos tests sigan valiendo cuando el acceso a datos migre a servicios.
// Los widgets de la pantalla se montan de verdad: hacen sus propias peticiones.
vi.mock('../api/axios', () => ({
  api: {
    get: vi.fn(),
  },
}));

const SEASONS = [
  { name: 'Temporada 2025/2026', isCurrent: false },
  { name: 'Temporada 2026/2027', isCurrent: true },
];

const CLUB = { id: 'club-1', city: 'Valencia', address: null, _count: { users: 12 } };
const TEAMS = [{ id: 't1' }, { id: 't2' }, { id: 't3' }];

const PLAYER_DATA = {
  id: 'p1',
  stats: { elo: 1100, matchWon: 5, matchLost: 2, tournamentPart: 3 },
  teams: [
    {
      name: 'Equipo A',
      matches: [
        {
          id: 'm1',
          rivalName: 'Rival Próximo',
          date: '2026-11-20T18:00:00.000Z',
          isHome: true,
          status: 'Programado',
        },
        {
          id: 'm2',
          rivalName: 'Rival Lejano',
          date: '2026-12-20T18:00:00.000Z',
          isHome: true,
          status: 'Programado',
        },
        {
          id: 'm3',
          rivalName: 'Rival Pasado',
          date: '2026-09-01T18:00:00.000Z',
          isHome: true,
          status: 'Programado',
        },
      ],
    },
  ],
};

const UPCOMING_TRAININGS = [
  { id: 's1', exercises: [{ completed: true }, { completed: false }], _count: { exercises: 2 } },
];
const ENROLLED = [{ id: 'tn1', name: 'Open Primavera', status: 'Grupos' }];

interface Served {
  seasons?: unknown[] | Error;
  player?: unknown;
  trainings?: unknown[];
  enrolled?: unknown[];
}

// Respuesta con el sobre real de la API: el adaptador `http` solo desenvuelve si existe `success`.
const envelope = (data: unknown) => ({ data: { success: true, data } });

const serve = ({
  seasons = SEASONS,
  player = PLAYER_DATA,
  trainings = UPCOMING_TRAININGS,
  enrolled = ENROLLED,
}: Served = {}) => {
  vi.mocked(api.get).mockImplementation((async (url: string) => {
    if (url === ENDPOINTS.SEASONS.BASE) {
      if (seasons instanceof Error) throw seasons;
      return envelope(seasons);
    }
    if (url === ENDPOINTS.CLUBS.BY_ID('club-1')) return envelope(CLUB);
    if (url === ENDPOINTS.TEAMS.BY_CLUB('club-1')) return envelope(TEAMS);
    if (url === ENDPOINTS.USERS.BY_ID('p1')) return envelope(player);
    if (url === ENDPOINTS.TRAININGS.UPCOMING('p1')) return envelope(trainings);
    if (url === ENDPOINTS.TOURNAMENTS.ENROLLED('p1')) return envelope(enrolled);
    throw new Error(`Peticion no esperada: ${url}`);
  }) as never);
};

const loginAs = (overrides: Partial<User> = {}) => {
  useAuthStore.setState({
    token: 'token-test',
    user: {
      id: 'p1',
      email: 'ana@test.com',
      name: 'Ana',
      surname: 'Pérez',
      role: 'Player',
      clubId: 'club-1',
      clubStatus: 'Aprobado',
      ...overrides,
    } as User,
    isAuthenticated: true,
  });
};

const renderLoaded = async () => {
  const view = renderWithProviders(
    <Routes>
      <Route path={APP_ROUTES.HOME} element={<Dashboard />} />
      <Route path={APP_ROUTES.LOGIN} element={<div>Pantalla de login</div>} />
      <Route path={APP_ROUTES.MI_CLUB} element={<div>Pantalla de mi club</div>} />
      <Route path={APP_ROUTES.CLUB_SELECTION} element={<div>Pantalla de clubes</div>} />
    </Routes>,
  );
  await screen.findByRole('button', { name: 'Cerrar Sesión' });
  return view;
};

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Solo se congela la fecha: los temporizadores reales siguen funcionando.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-15T12:00:00.000Z'));
    useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
    serve();
    loginAs();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('cabecera', () => {
    it('saluda con el mote cuando el usuario lo tiene', async () => {
      loginAs({ nickname: 'Luchi' });

      await renderLoaded();

      expect(screen.getByText(/Bienvenido de nuevo, Luchi/)).toBeInTheDocument();
    });

    it('saluda con nombre y apellido cuando no tiene mote', async () => {
      await renderLoaded();

      expect(screen.getByText(/Bienvenido de nuevo, Ana Pérez/)).toBeInTheDocument();
    });

    it('muestra el rol y la temporada vigente', async () => {
      await renderLoaded();

      expect(screen.getByText('Player')).toBeInTheDocument();
      expect(screen.getByText('Temporada 2026/2027')).toBeInTheDocument();
    });

    it('sigue mostrando la pantalla si falla la carga de la temporada', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      serve({ seasons: new Error('red caida') });

      await renderLoaded();

      expect(screen.getByText(/Bienvenido de nuevo/)).toBeInTheDocument();
      expect(screen.queryByText('Temporada 2026/2027')).not.toBeInTheDocument();
      expect(consoleError).toHaveBeenCalled();
    });

    it('cerrar sesion limpia la sesion y lleva al login', async () => {
      await renderLoaded();

      fireEvent.click(screen.getByRole('button', { name: 'Cerrar Sesión' }));

      expect(await screen.findByText('Pantalla de login')).toBeInTheDocument();
      expect(useAuthStore.getState().user).toBeNull();
    });
  });

  describe('AdminClub', () => {
    beforeEach(() => loginAs({ id: 'admin-1', role: 'AdminClub' }));

    it('carga el club y los equipos y muestra el resumen operativo', async () => {
      await renderLoaded();
      await screen.findByText('Resumen Operativo de la Sede');

      expect(api.get).toHaveBeenCalledWith(ENDPOINTS.CLUBS.BY_ID('club-1'), undefined);
      expect(api.get).toHaveBeenCalledWith(ENDPOINTS.TEAMS.BY_CLUB('club-1'), undefined);
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('Operativa')).toBeInTheDocument();
    });

    it('pide completar el perfil del club si no tiene direccion', async () => {
      await renderLoaded();
      await screen.findByText('Tu sede necesita un toque extra');

      expect(screen.getByText('Valencia')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Completar perfil del Club' }));

      expect(await screen.findByText('Pantalla de mi club')).toBeInTheDocument();
    });

    it('no muestra el aviso de direccion si el club ya la tiene', async () => {
      vi.mocked(api.get).mockImplementation((async (url: string) => {
        if (url === ENDPOINTS.SEASONS.BASE) return envelope(SEASONS);
        if (url === ENDPOINTS.CLUBS.BY_ID('club-1'))
          return envelope({ ...CLUB, address: 'Calle Mayor 1' });
        if (url === ENDPOINTS.TEAMS.BY_CLUB('club-1')) return envelope(TEAMS);
        throw new Error(`Peticion no esperada: ${url}`);
      }) as never);

      await renderLoaded();
      await screen.findByText('Resumen Operativo de la Sede');

      expect(screen.queryByText('Tu sede necesita un toque extra')).not.toBeInTheDocument();
    });

    it('sin club asignado no consulta el club ni sus equipos', async () => {
      loginAs({ id: 'admin-1', role: 'AdminClub', clubId: null });

      await renderLoaded();

      expect(api.get).not.toHaveBeenCalledWith(ENDPOINTS.CLUBS.BY_ID('club-1'), undefined);
      expect(screen.queryByText('Resumen Operativo de la Sede')).not.toBeInTheDocument();
    });

    it('no muestra el rendimiento de jugador', async () => {
      await renderLoaded();

      expect(screen.queryByText(/Mi Rendimiento/)).not.toBeInTheDocument();
    });
  });

  describe('Player', () => {
    it('sin club se presenta como jugador libre y ofrece explorar clubes', async () => {
      loginAs({ clubId: null, clubStatus: null });

      await renderLoaded();

      expect(screen.getByText('Estatus: Jugador Libre')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Explorar Lista de Clubes' }));
      expect(await screen.findByText('Pantalla de clubes')).toBeInTheDocument();
    });

    it.each(['Pendiente', 'pendiente'])('con la solicitud en estado %s avisa de la revision', async (clubStatus) => {
      loginAs({ clubStatus });

      await renderLoaded();

      expect(screen.getByText('Solicitud en revisión')).toBeInTheDocument();
      expect(screen.queryByText('Estatus: Jugador Libre')).not.toBeInTheDocument();
      expect(screen.queryByText(/Mi Rendimiento/)).not.toBeInTheDocument();
    });

    it('con club aprobado muestra su rendimiento de la temporada', async () => {
      await renderLoaded();
      await screen.findByText('Mi Rendimiento (Temporada 2026/2027)');

      expect(api.get).toHaveBeenCalledWith(ENDPOINTS.USERS.BY_ID('p1'), undefined);
      expect(screen.getByText('1100')).toBeInTheDocument();
      expect(screen.getByText('Nivel ELO')).toBeInTheDocument();
      expect(screen.getByText('Torneos Jugados')).toBeInTheDocument();
    });

    // Antes fijaba el fallo de la API que devolvia el jugador sin el sobre { success, data }.
    // El adaptador `http` acepta cuerpos sin sobre, asi que aqui se fija lo que sigue
    // valiendo: sin datos del jugador la pantalla usa 500 de ELO.
    it('usa 500 de ELO si la API no devuelve datos del jugador', async () => {
      serve({ player: null });

      await renderLoaded();
      await screen.findByText('Mi Rendimiento (Temporada 2026/2027)');

      expect(screen.getByText('500')).toBeInTheDocument();
      expect(screen.queryByText('1100')).not.toBeInTheDocument();
    });

    it('acepta las estadisticas como array y usa el primer elemento', async () => {
      serve({ player: { ...PLAYER_DATA, stats: [PLAYER_DATA.stats] } });

      await renderLoaded();
      await screen.findByText('Mi Rendimiento (Temporada 2026/2027)');

      expect(screen.getByText('1100')).toBeInTheDocument();
    });

    it('destaca el proximo partido de liga futuro mas cercano', async () => {
      await renderLoaded();
      await screen.findByText('Próximo Partido de Liga');

      expect(screen.getByText(/Rival Próximo/)).toBeInTheDocument();
      expect(screen.queryByText(/Rival Lejano/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Rival Pasado/)).not.toBeInTheDocument();
    });

    it('no muestra proximo partido si no hay ninguno programado', async () => {
      serve({ player: { ...PLAYER_DATA, teams: [] } });

      await renderLoaded();
      await screen.findByText('Mi Rendimiento (Temporada 2026/2027)');

      expect(screen.queryByText('Próximo Partido de Liga')).not.toBeInTheDocument();
    });

    it('muestra los entrenamientos pendientes con su progreso', async () => {
      await renderLoaded();
      await screen.findByText('Entrenamientos Pendientes');

      expect(api.get).toHaveBeenCalledWith(ENDPOINTS.TRAININGS.UPCOMING('p1'), undefined);
      expect(screen.getByText('Siguiente Sesión')).toBeInTheDocument();
      expect(screen.getByText('Progreso: 1 / 2 ejercicios')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Continuar' })).toBeInTheDocument();
    });

    it('oculta el widget de entrenamientos cuando no hay sesiones', async () => {
      serve({ trainings: [] });

      await renderLoaded();
      await screen.findByText('Mi Rendimiento (Temporada 2026/2027)');

      expect(screen.queryByText('Entrenamientos Pendientes')).not.toBeInTheDocument();
    });

    it('muestra los torneos en los que esta inscrito', async () => {
      await renderLoaded();
      await screen.findByText('Mis Torneos Activos');

      expect(api.get).toHaveBeenCalledWith(ENDPOINTS.TOURNAMENTS.ENROLLED('p1'), undefined);
      expect(screen.getByText('Open Primavera')).toBeInTheDocument();
      expect(screen.getByText('Fase: Grupos')).toBeInTheDocument();
    });

    it('invita a buscar torneos cuando no esta inscrito en ninguno', async () => {
      serve({ enrolled: [] });

      await renderLoaded();

      expect(
        await screen.findByText('No estás inscrito en ningún torneo activo actualmente.'),
      ).toBeInTheDocument();
    });
  });

  describe('SuperAdmin', () => {
    it('solo ve la cabecera: no carga datos de club ni de jugador', async () => {
      loginAs({ id: 'super-1', role: 'SuperAdmin', clubId: null });

      await renderLoaded();

      expect(api.get).toHaveBeenCalledTimes(1);
      expect(api.get).toHaveBeenCalledWith(ENDPOINTS.SEASONS.BASE, undefined);
      expect(screen.queryByText('Resumen Operativo de la Sede')).not.toBeInTheDocument();
      expect(screen.queryByText(/Mi Rendimiento/)).not.toBeInTheDocument();
    });
  });

  describe('estructura del DOM', () => {
    // Verificador mecanico de la regla de oro del JSX: si una extraccion cambia
    // el HTML renderizado, este snapshot falla. Se congela la fecha y la zona
    // horaria para que no dependa de la maquina.
    it('el panel de un jugador con club conserva su estructura', async () => {
      const { container } = await renderLoaded();
      await screen.findByText('Mis Torneos Activos');
      await screen.findByText('Entrenamientos Pendientes');

      expect(normalizeIds(container.innerHTML)).toMatchSnapshot();
    });
  });
});
