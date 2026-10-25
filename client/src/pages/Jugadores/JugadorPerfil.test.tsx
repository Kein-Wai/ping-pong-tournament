import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { APP_ROUTES } from '../../constants/routes';
import { useAuthStore, type User } from '../../store/authStore';
import { normalizeIds, renderWithProviders } from '../../test/utils';
import { JugadorPerfil } from './JugadorPerfil';

// Se mockea el `api` de bajo nivel (la frontera del sistema) y no los servicios,
// para que estos tests sigan valiendo cuando el acceso a datos migre a servicios.
vi.mock('../../api/axios', () => ({
  api: {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// jsdom no tiene layout, asi que los graficos de recharts no pintan nada util.
// Los stubs exponen los datos que recibe cada grafico para poder comprobarlos.
vi.mock('@mantine/charts', async () => {
  const { createElement } = await import('react');

  return {
    RadarChart: ({ data }: { data: unknown }) =>
      createElement('div', { 'data-testid': 'radar-chart' }, JSON.stringify(data)),
    BarChart: ({ data }: { data: unknown }) =>
      createElement('div', { 'data-testid': 'bar-chart' }, JSON.stringify(data)),
  };
});

// --- Datos de prueba ---------------------------------------------------------

const SKILLS = {
  derechaPlano: 70,
  revesPlano: 65,
  topspinDerecha: 60,
  topspinReves: 55,
  corte: 50,
  bloqueoDerecha: 45,
  bloqueoReves: 40,
  servicio: 35,
  recepcion: 30,
  movilidad: 25,
  fortalezaMental: 20,
  experiencia: 15,
};

const NO_PENDING = Object.fromEntries(Object.keys(SKILLS).map((key) => [key, null]));

const STATS = {
  elo: 1200,
  matchWon: 3,
  matchLost: 1,
  setWon: 9,
  setLost: 4,
  pointWon: 150,
  pointLost: 100,
  tournamentWon: 1,
  tournamentPart: 2,
};

const NEXT_MATCH = {
  id: 'tm1',
  rivalName: 'Rival Próximo',
  date: '2026-11-20T18:00:00.000Z',
  isHome: true,
  location: 'Pabellón Norte',
  status: 'Programado',
  ourScore: null,
  rivalScore: null,
};
const HOME_WIN = {
  id: 'tm2',
  rivalName: 'Rival Ganado',
  date: '2026-09-10T18:00:00.000Z',
  isHome: true,
  location: null,
  status: 'Completado',
  ourScore: 3,
  rivalScore: 1,
};
const AWAY_LOSS = {
  id: 'tm3',
  rivalName: 'Rival Visitante',
  date: '2026-09-05T18:00:00.000Z',
  isHome: false,
  location: null,
  status: 'Completado',
  ourScore: 2,
  rivalScore: 3,
};
const CANCELLED = {
  id: 'tm4',
  rivalName: 'Rival Cancelado',
  date: '2026-09-01T18:00:00.000Z',
  isHome: true,
  location: null,
  status: 'Cancelado',
  ourScore: null,
  rivalScore: null,
};

const PLAYER = {
  id: 'p1',
  email: 'luis@test.com',
  name: 'Luis',
  surname: 'Pérez',
  nickname: 'Luchi',
  avatarUrl: null,
  level: 'Intermedio',
  clubId: 'club-1',
  dominantHand: 'Diestro',
  playstyle: 'Ofensivo',
  rubberForehand: 'PICOS_CORTOS',
  rubberBackhand: 'LISA',
  birthDate: '2000-05-20',
  stats: STATS,
  skills: SKILLS,
  pendingSkills: { ...NO_PENDING, derechaPlano: 1.5 },
  teams: [
    { id: 't1', name: 'Equipo A', category: 'Senior', matches: [NEXT_MATCH, HOME_WIN, AWAY_LOSS, CANCELLED] },
    { id: 't2', name: 'Equipo B', category: 'Sub-18', matches: [] },
  ],
  generalAttendances: [
    { generalTraining: { date: '2026-10-10T12:00:00.000Z' } },
    { generalTraining: { date: '2025-01-10T12:00:00.000Z' } },
  ],
};

const ME = { id: 'p1', name: 'Luis', dominantHand: 'Diestro', playstyle: 'Ofensivo' };
const RIVAL_ZURDO = {
  id: 'r1',
  name: 'Zoe',
  surname: 'Zurda',
  dominantHand: 'Zurdo',
  playstyle: 'Defensivo',
};
const RIVAL_DIESTRO = {
  id: 'r2',
  name: 'Dani',
  surname: 'Diestro',
  dominantHand: 'Diestro',
  playstyle: 'Ofensivo',
};

const makeMatch = (overrides: Record<string, unknown> = {}) => ({
  id: 'm0',
  status: 'Completado',
  dateStart: '2026-10-01T10:00:00.000Z',
  playerOneId: 'p1',
  playerTwoId: 'r1',
  playerOne: ME,
  playerTwo: RIVAL_ZURDO,
  tournament: { name: 'Liga Local' },
  setOnePlayerOne: 11,
  setOnePlayerTwo: 5,
  setTwoPlayerOne: 11,
  setTwoPlayerTwo: 6,
  setThreePlayerOne: 11,
  setThreePlayerTwo: 7,
  setFourPlayerOne: null,
  setFourPlayerTwo: null,
  setFivePlayerOne: null,
  setFivePlayerTwo: null,
  ...overrides,
});

// Victoria por 3-0 contra un zurdo defensivo, jugando como jugador uno.
const MATCH_WIN = makeMatch({ id: 'm1' });
// Derrota por 1-3 contra un diestro ofensivo, jugando como jugador dos.
const MATCH_LOSS = makeMatch({
  id: 'm2',
  dateStart: '2026-09-20T10:00:00.000Z',
  playerOneId: 'r2',
  playerTwoId: 'p1',
  playerOne: RIVAL_DIESTRO,
  playerTwo: ME,
  tournament: null,
  setOnePlayerOne: 11,
  setOnePlayerTwo: 5,
  setTwoPlayerOne: 11,
  setTwoPlayerTwo: 6,
  setThreePlayerOne: 9,
  setThreePlayerTwo: 11,
  setFourPlayerOne: 11,
  setFourPlayerTwo: 8,
});
// Estos dos no deben aparecer: no es del jugador / no esta completado.
const MATCH_OTHERS = makeMatch({ id: 'm3', playerOneId: 'x', playerTwoId: 'y' });
const MATCH_PENDING = makeMatch({ id: 'm4', status: 'Programado' });

const PLAN = {
  id: 'plan1',
  weeks: 8,
  startDate: '2026-09-15T12:00:00.000Z',
  strengths: 'Pegada de top consistente',
  weaknesses: 'Mejorar el saque',
  _count: { sessions: 12 },
};

const SEASONS = [
  { name: 'Temporada 2025/2026', isCurrent: false },
  { name: 'Temporada 2026/2027', isCurrent: true },
];

// --- Utilidades --------------------------------------------------------------

interface Served {
  player?: unknown;
  matches?: unknown[];
  seasons?: unknown[];
  trainings?: unknown[];
}

const serve = ({
  player = PLAYER,
  matches = [MATCH_WIN, MATCH_LOSS, MATCH_OTHERS, MATCH_PENDING],
  seasons = SEASONS,
  trainings = [PLAN],
}: Served = {}) => {
  vi.mocked(api.get).mockImplementation((async (url: string) => {
    if (url === ENDPOINTS.USERS.BY_ID('p1')) {
      return { data: { success: true, data: player } };
    }
    if (url === ENDPOINTS.MATCHES.BASE) return { data: { success: true, data: matches } };
    if (url === ENDPOINTS.SEASONS.BASE) return { data: { success: true, data: seasons } };
    if (url === ENDPOINTS.TRAININGS.BY_PLAYER('p1')) return { data: { success: true, data: trainings } };
    throw new Error(`Peticion no esperada: ${url}`);
  }) as never);
};

const loginAs = (overrides: Partial<User> & { authProvider?: string } = {}) => {
  useAuthStore.setState({
    token: 'token-test',
    user: {
      id: 'viewer-1',
      email: 'viewer@test.com',
      name: 'Visitante',
      role: 'Player',
      clubId: 'club-1',
      ...overrides,
    } as User,
    isAuthenticated: true,
  });
};

const OWN = { id: 'p1', role: 'Player' } as const;
const ADMIN = { id: 'admin-1', role: 'AdminClub' } as const;

const renderPage = () =>
  renderWithProviders(
    <Routes>
      <Route path={APP_ROUTES.JUGADORES.PROFILE_PATH} element={<JugadorPerfil />} />
      <Route path={APP_ROUTES.JUGADORES.LIST} element={<div>Pantalla de jugadores</div>} />
      <Route path={APP_ROUTES.ENTRENAMIENTOS.NEW_PATH} element={<div>Pantalla de plan nuevo</div>} />
      <Route path={APP_ROUTES.ENTRENAMIENTOS.DETAILS_PATH} element={<div>Pantalla de plan</div>} />
    </Routes>,
    { initialEntries: [APP_ROUTES.JUGADORES.PROFILE('p1')] },
  );

const renderProfile = async () => {
  const view = renderPage();
  await screen.findByText('Perfil Técnico (Atributos)');
  return view;
};

const statCard = (title: string) =>
  screen.getByText(title).closest('[class*="mantine-Paper-root"]') as HTMLElement;

const chartData = (testId: string) =>
  screen.getAllByTestId(testId).map((el) => JSON.parse(el.textContent ?? '[]'));

const clickIcon = (container: HTMLElement, icon: string) => {
  const button = container.querySelector(`.tabler-icon-${icon}`)?.closest('button');
  if (!button) throw new Error(`No hay boton con el icono "${icon}"`);
  fireEvent.click(button);
};

describe('JugadorPerfil', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Solo se congela la fecha: los temporizadores reales siguen funcionando.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-15T12:00:00.000Z'));
    useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
    serve();
    vi.mocked(api.put).mockResolvedValue({ data: { data: {} } } as never);
    vi.mocked(api.delete).mockResolvedValue({ data: { data: {} } } as never);
    loginAs(OWN);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('carga y contrato', () => {
    it('pide el jugador, los partidos y las temporadas', async () => {
      await renderProfile();

      expect(api.get).toHaveBeenCalledWith(ENDPOINTS.USERS.BY_ID('p1'), undefined);
      expect(api.get).toHaveBeenCalledWith(ENDPOINTS.MATCHES.BASE, undefined);
      expect(api.get).toHaveBeenCalledWith(ENDPOINTS.SEASONS.BASE, undefined);
    });

    it('pide los macrociclos al ver el propio perfil', async () => {
      await renderProfile();

      expect(api.get).toHaveBeenCalledWith(ENDPOINTS.TRAININGS.BY_PLAYER('p1'), undefined);
    });

    it('pide los macrociclos si quien mira es administrador', async () => {
      loginAs(ADMIN);

      await renderProfile();

      expect(api.get).toHaveBeenCalledWith(ENDPOINTS.TRAININGS.BY_PLAYER('p1'), undefined);
    });

    it('no pide los macrociclos al mirar el perfil de otro jugador', async () => {
      loginAs({ id: 'otro', role: 'Player' });

      await renderProfile();

      expect(api.get).not.toHaveBeenCalledWith(ENDPOINTS.TRAININGS.BY_PLAYER('p1'), undefined);
    });

    it('muestra "Jugador no encontrado" si el servidor no devuelve el jugador', async () => {
      serve({ player: null });

      renderPage();

      expect(await screen.findByText('Jugador no encontrado.')).toBeInTheDocument();
    });

    it('muestra "Jugador no encontrado" si falla la carga', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(api.get).mockRejectedValue(new Error('red caida'));

      renderPage();

      expect(await screen.findByText('Jugador no encontrado.')).toBeInTheDocument();
      expect(consoleError).toHaveBeenCalled();
    });
  });

  describe('cabecera', () => {
    it('muestra nombre, mote, temporada vigente, ELO y nivel', async () => {
      await renderProfile();

      expect(screen.getByRole('heading', { name: 'Luis Pérez' })).toBeInTheDocument();
      expect(screen.getByText('"Luchi"')).toBeInTheDocument();
      expect(screen.getByText('Temporada 2026/2027')).toBeInTheDocument();
      expect(screen.getByText('1200 ELO')).toBeInTheDocument();
      expect(screen.getByText('Intermedio')).toBeInTheDocument();
    });

    it('muestra mano, estilo, gomas y equipos', async () => {
      await renderProfile();

      expect(screen.getByText('🖐️ Diestro')).toBeInTheDocument();
      expect(screen.getByText('⚔️ Ofensivo')).toBeInTheDocument();
      expect(screen.getByText('🔴 Der: PICOS CORTOS')).toBeInTheDocument();
      expect(screen.getByText('⚫ Rev: LISA')).toBeInTheDocument();
      expect(screen.getByText('Equipo A / Equipo B')).toBeInTheDocument();
    });

    it('usa 500 de ELO cuando el jugador no tiene estadisticas', async () => {
      serve({ player: { ...PLAYER, stats: undefined } });

      await renderProfile();

      expect(screen.getByText('500 ELO')).toBeInTheDocument();
    });

    it('muestra el correo en el propio perfil y a un administrador', async () => {
      await renderProfile();
      expect(screen.getByText('luis@test.com')).toBeInTheDocument();
    });

    it('oculta el correo a otro jugador', async () => {
      loginAs({ id: 'otro', role: 'Player' });

      await renderProfile();

      expect(screen.queryByText('luis@test.com')).not.toBeInTheDocument();
    });
  });

  describe('acciones segun quien mira', () => {
    const buttons = () => ({
      back: screen.queryByRole('button', { name: 'Volver a Jugadores' }),
      edit: screen.queryByRole('button', { name: 'Editar Perfil' }),
      kick: screen.queryByRole('button', { name: 'Dar de Baja' }),
      consolidate: screen.queryByRole('button', { name: 'Consolidar Mejoras' }),
    });

    it('el propio jugador puede editarse, sin volver, dar de baja ni consolidar', async () => {
      await renderProfile();

      const { back, edit, kick, consolidate } = buttons();
      expect(back).toBeNull();
      expect(edit).not.toBeNull();
      expect(kick).toBeNull();
      expect(consolidate).toBeNull();
    });

    it('otro jugador solo puede volver al listado', async () => {
      loginAs({ id: 'otro', role: 'Player' });

      await renderProfile();

      const { back, edit, kick, consolidate } = buttons();
      expect(back).not.toBeNull();
      expect(edit).toBeNull();
      expect(kick).toBeNull();
      expect(consolidate).toBeNull();
    });

    it('un AdminClub del mismo club puede editar, dar de baja y consolidar', async () => {
      loginAs(ADMIN);

      await renderProfile();

      const { back, edit, kick, consolidate } = buttons();
      expect(back).not.toBeNull();
      expect(edit).not.toBeNull();
      expect(kick).not.toBeNull();
      expect(consolidate).not.toBeNull();
    });

    it('un AdminClub de otro club no puede dar de baja al jugador', async () => {
      loginAs({ ...ADMIN, clubId: 'club-2' });

      await renderProfile();

      expect(buttons().kick).toBeNull();
      expect(buttons().edit).not.toBeNull();
    });

    it('un SuperAdmin puede dar de baja a un jugador de cualquier club', async () => {
      loginAs({ id: 'super-1', role: 'SuperAdmin', clubId: null });

      await renderProfile();

      expect(buttons().kick).not.toBeNull();
    });

    it('un administrador no puede darse de baja a si mismo', async () => {
      loginAs({ id: 'p1', role: 'AdminClub' });

      await renderProfile();

      expect(buttons().kick).toBeNull();
    });

    it('no ofrece consolidar cuando no hay mejoras pendientes', async () => {
      serve({ player: { ...PLAYER, pendingSkills: NO_PENDING } });
      loginAs(ADMIN);

      await renderProfile();

      expect(buttons().consolidate).toBeNull();
    });
  });

  describe('habilidades', () => {
    it('muestra cada habilidad y la mejora pendiente', async () => {
      await renderProfile();

      expect(screen.getByText('Plano Der.')).toBeInTheDocument();
      expect(screen.getByText('Experiencia')).toBeInTheDocument();
      expect(screen.getByText('(+1.50)')).toBeInTheDocument();
    });

    it('alimenta el radar con el valor, la mejora y el potencial de cada habilidad', async () => {
      await renderProfile();

      const [radar] = chartData('radar-chart');
      expect(radar).toHaveLength(12);
      expect(radar[0]).toEqual({
        attribute: 'Plano Der.',
        value: 70,
        pending: 1.5,
        potential: 71.5,
      });
      expect(radar[11]).toEqual({ attribute: 'Experiencia', value: 15, pending: 0, potential: 15 });
    });

    it('acepta las habilidades como array y usa el primer elemento', async () => {
      serve({ player: { ...PLAYER, skills: [SKILLS] } });

      await renderProfile();

      expect(chartData('radar-chart')[0][0].value).toBe(70);
    });

    it('avisa cuando el jugador no tiene habilidades registradas', async () => {
      serve({ player: { ...PLAYER, skills: undefined } });

      await renderProfile();

      expect(screen.getAllByText('Sin habilidades registradas.')).toHaveLength(2);
      expect(screen.queryByTestId('radar-chart')).not.toBeInTheDocument();
    });
  });

  describe('estadisticas competitivas', () => {
    it('resume partidos, torneos, sets y puntos', async () => {
      await renderProfile();

      expect(within(statCard('Partidos')).getByText('3V - 1D')).toBeInTheDocument();
      expect(within(statCard('Partidos')).getByText('75% de Victorias')).toBeInTheDocument();
      expect(within(statCard('Torneos Jugados')).getByText('1 Ganados')).toBeInTheDocument();
      expect(within(statCard('Balance de Sets')).getByText('9 - 4')).toBeInTheDocument();
      expect(within(statCard('Balance de Sets')).getByText('Diferencia: 5')).toBeInTheDocument();
      expect(within(statCard('Puntos Totales')).getByText('Ratio: 1.50')).toBeInTheDocument();
    });

    it('cuenta las asistencias totales y las del mes actual', async () => {
      await renderProfile();

      expect(within(statCard('Asistencias Totales')).getByText('2')).toBeInTheDocument();
      expect(within(statCard('Asistencias este Mes')).getByText('1')).toBeInTheDocument();
      expect(screen.getByText('En octubre')).toBeInTheDocument();
    });

    it('calcula los porcentajes del grafico de balance general', async () => {
      await renderProfile();

      const [efficiency] = chartData('bar-chart');
      expect(efficiency).toEqual([
        { metric: 'Partidos', Victorias: 75, Derrotas: 25 },
        { metric: 'Sets', Victorias: 69, Derrotas: 31 },
        { metric: 'Puntos', Victorias: 60, Derrotas: 40 },
        { metric: 'Campeon Torneos', Victorias: 50, Participaciones: 100 },
      ]);
    });

    it('reparte los resultados por mano y estilo del rival', async () => {
      await renderProfile();

      const [, porMano, porEstilo] = chartData('bar-chart');
      expect(porMano).toEqual([
        { Rasgo: 'vs Diestros', Victorias: 0, Derrotas: 1 },
        { Rasgo: 'vs Zurdos', Victorias: 1, Derrotas: 0 },
      ]);
      expect(porEstilo).toEqual([
        { Rasgo: 'vs Ofensivos', Victorias: 0, Derrotas: 1 },
        { Rasgo: 'vs Defensivos', Victorias: 1, Derrotas: 0 },
      ]);
    });

    it('invita a jugar el primer partido cuando no hay estadisticas', async () => {
      serve({ player: { ...PLAYER, stats: undefined }, matches: [] });

      await renderProfile();

      expect(screen.getByText(/Juega tu primer partido/)).toBeInTheDocument();
      expect(screen.getByText('Sin datos de enfrentamientos.')).toBeInTheDocument();
      expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
      expect(within(statCard('Partidos')).getByText('0V - 0D')).toBeInTheDocument();
    });
  });

  describe('ultimos partidos jugados', () => {
    it('lista solo los partidos completados del jugador, con resultado, rival y marcador', async () => {
      await renderProfile();

      const rows = screen.getAllByRole('row').filter((row) => within(row).queryByText(/Victoria|Derrota/));
      expect(rows).toHaveLength(2);

      const win = within(rows[0]);
      expect(win.getByText('Victoria')).toBeInTheDocument();
      expect(win.getByText('01 oct 2026')).toBeInTheDocument();
      expect(win.getByText('Liga Local')).toBeInTheDocument();
      expect(win.getByText('Zoe Zurda')).toBeInTheDocument();
      expect(win.getByText('3 - 0')).toBeInTheDocument();

      const loss = within(rows[1]);
      expect(loss.getByText('Derrota')).toBeInTheDocument();
      expect(loss.getByText('20 sept 2026')).toBeInTheDocument();
      expect(loss.getByText('Amistoso')).toBeInTheDocument();
      expect(loss.getByText('Dani Diestro')).toBeInTheDocument();
      expect(loss.getByText('1 - 3')).toBeInTheDocument();
    });

    it('muestra como maximo los diez partidos mas recientes', async () => {
      const many = Array.from({ length: 12 }, (_, index) =>
        makeMatch({ id: `mm${index}`, dateStart: `2026-10-${String(index + 1).padStart(2, '0')}T10:00:00.000Z` }),
      );
      serve({ matches: many });

      await renderProfile();

      expect(screen.getAllByText('Victoria')).toHaveLength(10);
    });

    it('avisa cuando no hay historial', async () => {
      serve({ matches: [] });

      await renderProfile();

      expect(screen.getByText('No hay historial de partidos registrados.')).toBeInTheDocument();
    });
  });

  describe('calendario de equipos', () => {
    it('no aparece si los equipos no tienen partidos', async () => {
      serve({ player: { ...PLAYER, teams: [{ id: 't2', name: 'Equipo B', category: 'Sub-18', matches: [] }] } });

      await renderProfile();

      expect(screen.queryByText('Calendario de Equipos')).not.toBeInTheDocument();
    });

    it('destaca el siguiente compromiso programado con su lugar', async () => {
      await renderProfile();

      expect(screen.getByText('🔥 Siguiente Compromiso')).toBeInTheDocument();
      expect(screen.getByText(/Rival Próximo/)).toBeInTheDocument();
      expect(screen.getByText('viernes, 20 de noviembre de 2026, 18:00')).toBeInTheDocument();
      expect(screen.getByText('Pabellón Norte')).toBeInTheDocument();
    });

    it('lista el resto de partidos con su marcador segun jugara en casa o fuera', async () => {
      await renderProfile();

      expect(screen.getByText('Historial y Resto del Calendario')).toBeInTheDocument();
      expect(screen.getByText(/Rival Ganado/)).toBeInTheDocument();
      expect(screen.getByText('3 - 1')).toBeInTheDocument();
      expect(screen.getByText('3 - 2')).toBeInTheDocument();
      expect(screen.getByText('Cancelado')).toBeInTheDocument();
      expect(screen.getByText('10/9/26, 18:00')).toBeInTheDocument();
      expect(screen.getByText('5/9/26, 18:00')).toBeInTheDocument();
      expect(screen.getByText('1/9/26, 18:00')).toBeInTheDocument();
    });

    it('pagina el historial de cuatro en cuatro', async () => {
      const others = Array.from({ length: 5 }, (_, index) => ({
        ...HOME_WIN,
        id: `old${index + 1}`,
        rivalName: `Rival ${index + 1}`,
        date: `2026-09-0${index + 1}T18:00:00.000Z`,
      }));
      serve({
        player: {
          ...PLAYER,
          teams: [{ id: 't1', name: 'Equipo A', category: 'Senior', matches: [NEXT_MATCH, ...others] }],
        },
      });
      await renderProfile();

      expect(screen.getByText(/Rival 5/)).toBeInTheDocument();
      expect(screen.queryByText(/Rival 1$/)).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: '2' }));

      expect(screen.getByText(/Rival 1$/)).toBeInTheDocument();
    });
  });

  describe('macrociclos y analisis tecnico', () => {
    it('un administrador ve los planes, puede crear uno y abrirlos', async () => {
      loginAs(ADMIN);
      await renderProfile();

      expect(screen.getByText('Historial de Macrociclos')).toBeInTheDocument();
      expect(screen.getByText('Plan de 8 Semanas')).toBeInTheDocument();
      expect(screen.getByText('Inicio: 15/9/2026')).toBeInTheDocument();
      expect(screen.getByText('12 Sesiones')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Ver Macrociclo' }));

      expect(await screen.findByText('Pantalla de plan')).toBeInTheDocument();
    });

    it('un administrador puede crear un plan nuevo', async () => {
      loginAs(ADMIN);
      await renderProfile();

      fireEvent.click(screen.getByRole('button', { name: '+ Crear Plan' }));

      expect(await screen.findByText('Pantalla de plan nuevo')).toBeInTheDocument();
    });

    it('muestra las fortalezas y debilidades del ultimo plan', async () => {
      loginAs(ADMIN);
      await renderProfile();

      expect(screen.getByText('Pegada de top consistente')).toBeInTheDocument();
      expect(screen.getByText('Mejorar el saque')).toBeInTheDocument();
    });

    it('un administrador avisa de que no hay planes asignados', async () => {
      loginAs(ADMIN);
      serve({ trainings: [] });

      await renderProfile();

      expect(screen.getByText('No hay planes de entrenamiento asignados.')).toBeInTheDocument();
      expect(
        screen.getByText('El entrenador aún no ha creado un macrociclo para ti.'),
      ).toBeInTheDocument();
    });

    it('el propio jugador ve sus planes pero no puede crearlos ni borrarlos', async () => {
      await renderProfile();

      expect(screen.getByText('Plan de 8 Semanas')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '+ Crear Plan' })).not.toBeInTheDocument();
      expect(document.querySelector('.tabler-icon-trash')).toBeNull();
    });

    it('el propio jugador no ve la seccion si no tiene planes', async () => {
      serve({ trainings: [] });

      await renderProfile();

      expect(screen.queryByText('Historial de Macrociclos')).not.toBeInTheDocument();
    });

    it('otro jugador no ve los planes', async () => {
      loginAs({ id: 'otro', role: 'Player' });

      await renderProfile();

      expect(screen.queryByText('Historial de Macrociclos')).not.toBeInTheDocument();
    });

    it('eliminar un plan pide confirmacion, lo borra y recarga el perfil', async () => {
      loginAs(ADMIN);
      await renderProfile();
      const callsBefore = vi.mocked(api.get).mock.calls.length;

      clickIcon(screen.getByText('Plan de 8 Semanas').closest('.mantine-Card-root') as HTMLElement, 'trash');
      fireEvent.click(await screen.findByRole('button', { name: 'Sí, eliminar plan' }));

      await waitFor(() =>
        expect(api.delete).toHaveBeenCalledWith(ENDPOINTS.TRAININGS.DELETE_PLAN('plan1'), undefined),
      );
      await waitFor(() => expect(vi.mocked(api.get).mock.calls.length).toBeGreaterThan(callsBefore));
    });
  });

  describe('dar de baja', () => {
    it('pide confirmacion, rechaza al jugador en su club y vuelve al listado', async () => {
      loginAs(ADMIN);
      await renderProfile();

      fireEvent.click(screen.getByRole('button', { name: 'Dar de Baja' }));
      fireEvent.click(await screen.findByRole('button', { name: 'Sí, dar de baja' }));

      await waitFor(() =>
        expect(api.put).toHaveBeenCalledWith(
          ENDPOINTS.CLUBS.MEMBER_STATUS('club-1', 'p1'),
          { status: 'Rechazado' },
          undefined,
        ),
      );
      expect(await screen.findByText('Pantalla de jugadores')).toBeInTheDocument();
    });
  });

  describe('editar perfil', () => {
    const openEdit = async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Editar Perfil' }));
      await screen.findByText('Editar Mis Datos');
    };
    const OWN_PAYLOAD = {
      name: 'Luis',
      surname: 'Pérez',
      nickname: 'Luchi',
      avatarUrl: '',
      dominantHand: 'Diestro',
      playstyle: 'Ofensivo',
      rubberForehand: 'PICOS_CORTOS',
      rubberBackhand: 'LISA',
      birthDate: '2000-05-20T00:00:00.000Z',
      skills: SKILLS,
    };

    it('precarga los datos actuales del jugador', async () => {
      await renderProfile();

      await openEdit();

      expect(screen.getByLabelText(/^Nombre/)).toHaveValue('Luis');
      expect(screen.getByLabelText('Apellidos')).toHaveValue('Pérez');
      expect(screen.getByLabelText(/^Nickname/)).toHaveValue('Luchi');
    });

    it('guarda el propio perfil en /users/me, actualiza la sesion y recarga', async () => {
      await renderProfile();
      await openEdit();
      fireEvent.change(screen.getByLabelText(/^Nickname/), { target: { value: 'El Muro' } });
      const callsBefore = vi.mocked(api.get).mock.calls.length;

      fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));

      await waitFor(() =>
        expect(api.put).toHaveBeenCalledWith(
          ENDPOINTS.USERS.ME,
          { ...OWN_PAYLOAD, nickname: 'El Muro' },
          undefined,
        ),
      );
      await waitFor(() => expect(useAuthStore.getState().user?.nickname).toBe('El Muro'));
      await waitFor(() => expect(vi.mocked(api.get).mock.calls.length).toBeGreaterThan(callsBefore));
    });

    it('un administrador guarda el perfil ajeno en /users/:id y puede tocar los atributos base', async () => {
      loginAs(ADMIN);
      await renderProfile();
      await openEdit();
      expect(screen.getByText('Atributos Técnicos Base (Modificación Manual)')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));

      await waitFor(() =>
        expect(api.put).toHaveBeenCalledWith(ENDPOINTS.USERS.BY_ID('p1'), OWN_PAYLOAD, undefined),
      );
    });

    // Regresión: al guardar el perfil de otro jugador se copiaban sus datos a la sesión del
    // administrador (updateUserFields), que pasaba a llamarse como el jugador editado.
    it('un administrador que edita a otro jugador no modifica su propia sesión', async () => {
      loginAs(ADMIN);
      await renderProfile();
      await openEdit();
      fireEvent.change(screen.getByLabelText(/^Nickname/), { target: { value: 'El Muro' } });

      fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));

      await waitFor(() => expect(api.put).toHaveBeenCalled());
      await waitFor(() => expect(api.get).toHaveBeenCalledTimes(8));
      expect(useAuthStore.getState().user).toMatchObject({ id: 'admin-1', name: 'Visitante' });
      expect(useAuthStore.getState().user?.nickname).toBeUndefined();
    });

    it('el propio jugador no ve los atributos base ni, sin cuenta local, el cambio de contrasena', async () => {
      await renderProfile();

      await openEdit();

      expect(screen.queryByText('Atributos Técnicos Base (Modificación Manual)')).not.toBeInTheDocument();
      expect(screen.queryByText('Cambiar Contraseña (Opcional)')).not.toBeInTheDocument();
    });

    describe('cambio de contrasena (cuenta local)', () => {
      const fill = (current: string, next: string, confirm: string) => {
        fireEvent.change(screen.getByLabelText('Contraseña Actual'), { target: { value: current } });
        fireEvent.change(screen.getByLabelText(/^Nueva Contraseña/), { target: { value: next } });
        fireEvent.change(screen.getByLabelText(/^Confirmar Nueva/), { target: { value: confirm } });
      };

      beforeEach(() => {
        loginAs({ ...OWN, authProvider: 'LOCAL' });
      });

      it('rechaza contrasenas que no coinciden sin llamar a la API', async () => {
        await renderProfile();
        await openEdit();
        fill('Vieja123@', 'Abcdef1@', 'Otra1234@');

        fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));

        expect(await screen.findByText('Las contraseñas nuevas no coinciden.')).toBeInTheDocument();
        expect(api.put).not.toHaveBeenCalled();
      });

      it('rechaza una contrasena debil sin llamar a la API', async () => {
        await renderProfile();
        await openEdit();
        fill('Vieja123@', 'abc', 'abc');

        fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));

        expect(await screen.findByText('Contraseña débil')).toBeInTheDocument();
        expect(api.put).not.toHaveBeenCalled();
      });

      it('envia las tres contrasenas junto al resto de datos cuando son validas', async () => {
        await renderProfile();
        await openEdit();
        fill('Vieja123@', 'Abcdef1@', 'Abcdef1@');

        fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));

        await waitFor(() =>
          expect(api.put).toHaveBeenCalledWith(
            ENDPOINTS.USERS.ME,
            {
              ...OWN_PAYLOAD,
              currentPassword: 'Vieja123@',
              newPassword: 'Abcdef1@',
              confirmPassword: 'Abcdef1@',
            },
            undefined,
          ),
        );
      });
    });
  });

  describe('consolidar mejoras', () => {
    const openConsolidate = async () => {
      loginAs(ADMIN);
      await renderProfile();
      fireEvent.click(screen.getByRole('button', { name: 'Consolidar Mejoras' }));
      await screen.findByText('Consolidar Progreso');
    };

    it('lista las habilidades con su base y el total estimado', async () => {
      await openConsolidate();

      expect(screen.getByText('Plano Derecha')).toBeInTheDocument();
      expect(screen.getByText('71.50')).toBeInTheDocument();
      expect(screen.getByText('65.00')).toBeInTheDocument();
    });

    it('aplica las subidas sumandolas a la base y recarga el perfil', async () => {
      await openConsolidate();
      const callsBefore = vi.mocked(api.get).mock.calls.length;

      fireEvent.click(screen.getByRole('button', { name: 'Confirmar y Aplicar Subidas' }));

      await waitFor(() =>
        expect(api.put).toHaveBeenCalledWith(
          ENDPOINTS.SKILLS.CONSOLIDATE('p1'),
          { ...SKILLS, derechaPlano: 71.5 },
          undefined,
        ),
      );
      await waitFor(() => expect(vi.mocked(api.get).mock.calls.length).toBeGreaterThan(callsBefore));
    });
  });

  describe('estructura del DOM', () => {
    // Verificador mecanico de la regla de oro del JSX: si una extraccion cambia
    // el HTML renderizado, este snapshot falla. Se congela la fecha y se evitan
    // fechas con formato local para que no dependa de la zona horaria.
    it('el perfil que ve un administrador conserva su estructura', async () => {
      loginAs(ADMIN);
      serve({ player: { ...PLAYER, teams: [] }, matches: [] });

      const { container } = await renderProfile();

      expect(normalizeIds(container.innerHTML)).toMatchSnapshot();
    });

    // El estilo en línea de la raíz del diálogo es el de la transición de Mantine y depende del tiempo.
    const stableDialog = (element: HTMLElement) =>
      normalizeIds(element.outerHTML)
        .replace(/mantine-[a-z0-9]{9,}/g, 'mantine-id')
        .replace(/^(<[^>]*?) style="[^"]*"/, '$1');

    it('el modal de edición de un administrador conserva su estructura', async () => {
      loginAs(ADMIN);
      await renderProfile();
      fireEvent.click(screen.getByRole('button', { name: 'Editar Perfil' }));

      expect(stableDialog(await screen.findByRole('dialog'))).toMatchSnapshot();
    });

    it('el modal de edición del propio jugador con cuenta local conserva su estructura', async () => {
      loginAs({ ...OWN, authProvider: 'LOCAL' });
      await renderProfile();
      fireEvent.click(screen.getByRole('button', { name: 'Editar Perfil' }));

      expect(stableDialog(await screen.findByRole('dialog'))).toMatchSnapshot();
    });

    it('el modal de consolidación conserva su estructura', async () => {
      loginAs(ADMIN);
      await renderProfile();
      fireEvent.click(screen.getByRole('button', { name: 'Consolidar Mejoras' }));

      expect(stableDialog(await screen.findByRole('dialog'))).toMatchSnapshot();
    });
  });
});
