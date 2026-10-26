import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { api } from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';
import { useJugadorPerfil } from './useJugadorPerfil';

// Se mockea el `api` de bajo nivel (la frontera del sistema).
vi.mock('../api/axios', () => ({
  api: {
    get: vi.fn(),
  },
}));

const envelope = <T,>(data: T) => ({ data: { success: true, data } });

const PLAYER = { id: 'p1', name: 'Luis', clubId: 'club-1' };
const SEASONS = [
  { name: 'Temporada 2025/2026', isCurrent: false },
  { name: 'Temporada 2026/2027', isCurrent: true },
];
const PLAN = { id: 'plan1', weeks: 8 };

const match = (id: string, dateStart: string, overrides: Record<string, unknown> = {}) => ({
  id,
  dateStart,
  status: 'Completado',
  playerOneId: 'p1',
  playerTwoId: 'r1',
  ...overrides,
});

const serve = ({
  player = PLAYER as unknown,
  matches = [] as unknown[],
  seasons = SEASONS as unknown[],
  trainings = [PLAN] as unknown[],
} = {}) => {
  vi.mocked(api.get).mockImplementation((async (url: string) => {
    if (url === ENDPOINTS.USERS.BY_ID('p1')) return envelope(player);
    if (url === ENDPOINTS.MATCHES.BASE) return envelope(matches);
    if (url === ENDPOINTS.SEASONS.BASE) return envelope(seasons);
    if (url === ENDPOINTS.TRAININGS.BY_PLAYER('p1')) return envelope(trainings);
    throw new Error(`Peticion no esperada: ${url}`);
  }) as never);
};

const load = async (id: string | undefined = 'p1', canViewTrainings = true) => {
  const hook = renderHook(
    ({ id, canViewTrainings }) => useJugadorPerfil(id, canViewTrainings),
    { initialProps: { id, canViewTrainings } },
  );
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
};

describe('useJugadorPerfil', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serve();
  });

  it('empieza cargando y sin datos', () => {
    const { result } = renderHook(() => useJugadorPerfil('p1', true));

    expect(result.current.loading).toBe(true);
    expect(result.current.player).toBeNull();
    expect(result.current.recentMatches).toEqual([]);
    expect(result.current.trainings).toEqual([]);
    expect(result.current.currentSeason).toBe('');
  });

  it('pide el jugador, los partidos y las temporadas', async () => {
    await load();

    expect(api.get).toHaveBeenCalledWith(ENDPOINTS.USERS.BY_ID('p1'), undefined);
    expect(api.get).toHaveBeenCalledWith(ENDPOINTS.MATCHES.BASE, undefined);
    expect(api.get).toHaveBeenCalledWith(ENDPOINTS.SEASONS.BASE, undefined);
  });

  it('devuelve el jugador y el nombre de la temporada vigente', async () => {
    const { result } = await load();

    expect(result.current.player).toMatchObject({ id: 'p1', name: 'Luis' });
    expect(result.current.currentSeason).toBe('Temporada 2026/2027');
  });

  it('sin temporada vigente deja el nombre vacío', async () => {
    serve({ seasons: [{ name: 'Temporada 2025/2026', isCurrent: false }] });

    const { result } = await load();

    expect(result.current.currentSeason).toBe('');
  });

  it('se queda con los partidos completados del jugador, del más reciente al más antiguo', async () => {
    serve({
      matches: [
        match('antiguo', '2026-08-01T10:00:00.000Z'),
        match('reciente', '2026-10-01T10:00:00.000Z', { playerOneId: 'r1', playerTwoId: 'p1' }),
        match('ajeno', '2026-09-01T10:00:00.000Z', { playerOneId: 'x', playerTwoId: 'y' }),
        match('pendiente', '2026-09-15T10:00:00.000Z', { status: 'Programado' }),
      ],
    });

    const { result } = await load();

    expect(result.current.recentMatches.map((m) => m.id)).toEqual(['reciente', 'antiguo']);
  });

  it('limita el historial a los diez partidos más recientes', async () => {
    serve({
      matches: Array.from({ length: 12 }, (_, i) =>
        match(`m${i}`, `2026-09-${String(i + 1).padStart(2, '0')}T10:00:00.000Z`),
      ),
    });

    const { result } = await load();

    expect(result.current.recentMatches).toHaveLength(10);
    expect(result.current.recentMatches[0].id).toBe('m11');
  });

  it('pide los macrociclos solo si se pueden ver', async () => {
    const withTrainings = await load('p1', true);
    expect(api.get).toHaveBeenCalledWith(ENDPOINTS.TRAININGS.BY_PLAYER('p1'), undefined);
    expect(withTrainings.result.current.trainings).toEqual([PLAN]);

    vi.mocked(api.get).mockClear();
    const withoutTrainings = await load('p1', false);
    expect(api.get).not.toHaveBeenCalledWith(ENDPOINTS.TRAININGS.BY_PLAYER('p1'), undefined);
    expect(withoutTrainings.result.current.trainings).toEqual([]);
  });

  it('si la carga falla deja de cargar y no hay jugador', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(api.get).mockRejectedValue(new Error('500'));

    const { result } = await load();

    expect(result.current.player).toBeNull();
  });

  it('sin id no pide nada y sigue cargando', async () => {
    const { result } = renderHook(() => useJugadorPerfil(undefined, true));

    await act(async () => {});

    expect(api.get).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(true);
  });

  it('refetch vuelve a pedir los datos y los actualiza', async () => {
    const { result } = await load();
    serve({ player: { ...PLAYER, name: 'Luis Renombrado' } });

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.player).toMatchObject({ name: 'Luis Renombrado' });
  });
});
