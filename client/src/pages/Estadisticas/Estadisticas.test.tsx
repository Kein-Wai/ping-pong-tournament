import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, within } from '@testing-library/react';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { normalizeIds, renderWithProviders } from '../../test/utils';
import { Estadisticas } from './Estadisticas';

// Se mockea el `api` de bajo nivel (la frontera del sistema) y no los servicios,
// para que estos tests sigan valiendo cuando el acceso a datos migre a servicios.
vi.mock('../../api/axios', () => ({
  api: {
    get: vi.fn(),
  },
}));

const makeStats = (overrides: Record<string, unknown> = {}) => ({
  elo: 600,
  matchWon: 2,
  matchLost: 8,
  setWon: 5,
  setLost: 20,
  tournamentPart: 0,
  ...overrides,
});

const makePlayer = (overrides: Record<string, unknown> = {}) => ({
  id: 'p0',
  name: 'Jugador',
  surname: 'Cero',
  avatarUrl: null,
  clubStatus: 'APPROVED',
  birthDate: null,
  stats: makeStats(),
  ...overrides,
});

const ANA = makePlayer({
  id: 'ana',
  name: 'Ana',
  surname: 'Ruiz',
  birthDate: '2000-10-16T00:00:00.000Z',
  stats: makeStats({
    elo: 1100,
    matchWon: 8,
    matchLost: 2,
    setWon: 20,
    setLost: 10,
    tournamentPart: 3,
  }),
});
const BETO = makePlayer({
  id: 'beto',
  name: 'Beto',
  surname: 'Gil',
  birthDate: '1990-01-01T00:00:00.000Z',
});

const TRAININGS = [
  {
    id: 't1',
    schedule: { name: 'Lunes tarde' },
    attendances: [
      { playerId: 'ana', attended: true },
      { playerId: 'beto', attended: true },
      { playerId: 'fantasma', attended: true },
    ],
  },
  {
    id: 't2',
    schedule: { name: 'Lunes tarde' },
    attendances: [
      { playerId: 'ana', attended: true },
      { playerId: 'beto', attended: false },
    ],
  },
];

const MATCHES = [
  { id: 'm1', status: 'Completado' },
  { id: 'm2', status: 'Cancelado' },
  { id: 'm3', status: 'Pendiente' },
];

interface Data {
  users?: unknown[];
  matches?: unknown[];
  trainings?: unknown[];
}

const serve = ({ users = [ANA, BETO], matches = MATCHES, trainings = TRAININGS }: Data = {}) => {
  vi.mocked(api.get).mockImplementation(((url: string) => {
    const bodies: Record<string, unknown[]> = {
      [ENDPOINTS.USERS.BASE]: users,
      [ENDPOINTS.MATCHES.BASE]: matches,
      [ENDPOINTS.GENERAL_TRAININGS.BASE]: trainings,
    };
    return Promise.resolve({ data: { success: true, data: bodies[url] } });
  }) as never);
};

const renderLoaded = async () => {
  const view = renderWithProviders(<Estadisticas />);
  await screen.findByRole('heading', { name: 'Centro de Estadísticas' });
  return view;
};

const rankingRows = () => {
  const table = screen.getByRole('table');
  return within(table).getAllByRole('row').slice(1);
};

// Tarjeta de una seccion, localizada por el titulo de su cabecera.
const card = (title: string) =>
  screen.getByRole('heading', { name: title }).closest('.mantine-Card-root') as HTMLElement;

describe('Estadisticas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // La edad media depende de «hoy»: se congela solo Date.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-15T12:00:00.000Z'));
    serve();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('carga', () => {
    it('pide jugadores, partidos y entrenamientos generales', async () => {
      await renderLoaded();

      const urls = vi.mocked(api.get).mock.calls.map(([url]) => url);
      expect(urls).toEqual(
        expect.arrayContaining([
          ENDPOINTS.USERS.BASE,
          ENDPOINTS.MATCHES.BASE,
          ENDPOINTS.GENERAL_TRAININGS.BASE,
        ]),
      );
      expect(urls).toHaveLength(3);
    });

    it('no rompe si falla la carga y deja los estados vacios', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(api.get).mockRejectedValue(new Error('red caida'));

      await renderLoaded();

      expect(screen.getByText('No hay jugadores suficientes')).toBeInTheDocument();
      expect(screen.getByText('No hay jugadores con estadísticas registradas.')).toBeInTheDocument();
      expect(screen.getByText('No hay partidos registrados aún.')).toBeInTheDocument();
      expect(consoleError).toHaveBeenCalled();
    });
  });

  describe('ranking oficial', () => {
    it('ordena por ELO de mayor a menor y calcula win rate, partidos y diferencia de sets', async () => {
      serve({ users: [BETO, ANA] });

      await renderLoaded();

      const [first, second] = rankingRows();
      expect(first).toHaveTextContent('Ana Ruiz');
      expect(first).toHaveTextContent('1100');
      expect(first).toHaveTextContent('80%');
      expect(first).toHaveTextContent('8 - 2');
      expect(first).toHaveTextContent('+10');
      expect(second).toHaveTextContent('Beto Gil');
      expect(second).toHaveTextContent('600');
      expect(second).toHaveTextContent('20%');
      expect(second).toHaveTextContent('2 - 8');
      expect(second).toHaveTextContent('-15');
    });

    it('descarta a los jugadores sin estadisticas', async () => {
      serve({ users: [ANA, makePlayer({ id: 'sin', name: 'Sin', surname: 'Stats', stats: null })] });

      await renderLoaded();

      expect(rankingRows()).toHaveLength(1);
      expect(screen.queryByText('Sin Stats')).not.toBeInTheDocument();
    });

    it('lee las estadisticas aunque lleguen dentro de una lista', async () => {
      serve({ users: [makePlayer({ id: 'ana', name: 'Ana', surname: 'Ruiz', stats: [makeStats({ elo: 900 })] })] });

      await renderLoaded();

      expect(rankingRows()[0]).toHaveTextContent('900');
    });

    it('avisa cuando no hay jugadores con estadisticas', async () => {
      serve({ users: [] });

      await renderLoaded();

      expect(screen.getByText('No hay jugadores con estadísticas registradas.')).toBeInTheDocument();
    });

    it('pagina de diez en diez y numera con el puesto absoluto', async () => {
      serve({
        users: Array.from({ length: 12 }, (_, index) =>
          makePlayer({
            id: `p${index + 1}`,
            name: `Jugador${String(index + 1).padStart(2, '0')}`,
            surname: null,
            stats: makeStats({ elo: 2000 - index }),
          }),
        ),
      });
      await renderLoaded();
      expect(rankingRows()).toHaveLength(10);

      fireEvent.click(screen.getByRole('button', { name: '2' }));

      const rows = rankingRows();
      expect(rows).toHaveLength(2);
      expect(rows[0]).toHaveTextContent('11º');
      expect(rows[0]).toHaveTextContent('Jugador11');
      expect(rows[1]).toHaveTextContent('12º');
    });
  });

  describe('secciones de actividad', () => {
    it('lista los torneos jugados y omite a quien no ha participado', async () => {
      await renderLoaded();

      const section = within(card('Afluencia a Torneos (Top 5)'));
      expect(section.getByText('Ana Ruiz')).toBeInTheDocument();
      expect(section.getByText('3 Torneos')).toBeInTheDocument();
      expect(section.queryByText('Beto Gil')).not.toBeInTheDocument();
    });

    it('avisa cuando nadie ha participado en torneos', async () => {
      serve({ users: [BETO] });

      await renderLoaded();

      expect(screen.getByText('No hay participaciones registradas aún.')).toBeInTheDocument();
    });

    it('cuenta las asistencias confirmadas y nombra «Desconocido» al jugador que ya no existe', async () => {
      await renderLoaded();

      const section = within(card('Top 10 Asistencias (Ironmans)'));
      const rows = section.getAllByText(/Sesiones$/);
      expect(rows.map((row) => row.textContent)).toEqual([
        '2 Sesiones',
        '1 Sesiones',
        '1 Sesiones',
      ]);
      expect(section.getByText('Ana Ruiz')).toBeInTheDocument();
      expect(section.getByText('Beto Gil')).toBeInTheDocument();
      expect(section.getByText('Desconocido')).toBeInTheDocument();
    });

    it('avisa cuando no hay asistencias ni clases', async () => {
      serve({ trainings: [] });

      await renderLoaded();

      expect(screen.getByText('No hay datos de asistencia aún.')).toBeInTheDocument();
      expect(screen.getByText('No hay clases registradas aún.')).toBeInTheDocument();
    });

    it('avisa cuando no hay partidos', async () => {
      serve({ matches: [] });

      await renderLoaded();

      expect(screen.getByText('No hay partidos registrados aún.')).toBeInTheDocument();
    });
  });

  describe('demografia', () => {
    it('calcula la edad media redondeada sobre los jugadores con fecha de nacimiento', async () => {
      await renderLoaded();

      // Ana cumple 25 mañana y Beto tiene 36: media 30,5 -> 31.
      expect(screen.getByText('31 años')).toBeInTheDocument();
      expect(screen.getByText('Calculado sobre 2 jugadores')).toBeInTheDocument();
    });

    it('muestra «Sin datos» cuando nadie tiene fecha de nacimiento', async () => {
      serve({ users: [makePlayer({ id: 'x', name: 'X', surname: null })] });

      await renderLoaded();

      expect(screen.getByText('Sin datos')).toBeInTheDocument();
      expect(screen.getByText('Calculado sobre 0 jugadores')).toBeInTheDocument();
      expect(screen.getByText('No hay suficientes datos registrados.')).toBeInTheDocument();
    });
  });

  describe('snapshot', () => {
    it('mantiene la estructura de la pantalla cargada', async () => {
      const { container } = await renderLoaded();

      expect(normalizeIds(container.innerHTML)).toMatchSnapshot();
    });
  });
});
