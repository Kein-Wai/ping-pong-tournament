import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { api } from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';
import { useEquipoDetalles } from './useEquipoDetalles';

// Se mockea el `api` de bajo nivel (la frontera del sistema) y no los servicios,
// para que estos tests sigan valiendo cuando el acceso a datos cambie de capa.
vi.mock('../api/axios', () => ({
  api: {
    get: vi.fn(),
  },
}));

const envelope = <T,>(data: T) => ({ data: { success: true, data } });

const TEAMS = [
  { id: 't1', name: 'Equipo A', players: [], matches: [] },
  { id: 't2', name: 'Equipo B', players: [], matches: [] },
];
const USERS = [
  { id: 'p1', name: 'Ana', clubStatus: 'Aprobado' },
  { id: 'p2', name: 'Luis', clubStatus: 'Pendiente' },
  { id: 'p3', name: 'Marta', clubStatus: 'Aprobado' },
];

const serve = (teams: unknown[] = TEAMS) => {
  vi.mocked(api.get).mockImplementation((async (url: string) => {
    if (url === ENDPOINTS.TEAMS.BY_CLUB('club-1')) return envelope(teams);
    if (url === ENDPOINTS.USERS.BASE) return envelope(USERS);
    throw new Error(`Peticion no esperada: ${url}`);
  }) as never);
};

describe('useEquipoDetalles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serve();
  });

  it('empieza cargando, sin equipo ni jugadores', () => {
    const { result } = renderHook(() => useEquipoDetalles('t1', 'club-1'));

    expect(result.current.loading).toBe(true);
    expect(result.current.team).toBeNull();
    expect(result.current.clubPlayers).toEqual([]);
  });

  it('pide los equipos del club y los jugadores', async () => {
    const { result } = renderHook(() => useEquipoDetalles('t1', 'club-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(api.get).toHaveBeenCalledWith(ENDPOINTS.TEAMS.BY_CLUB('club-1'), undefined);
    expect(api.get).toHaveBeenCalledWith(ENDPOINTS.USERS.BASE, undefined);
  });

  it('se queda con el equipo del id y solo con los jugadores aprobados', async () => {
    const { result } = renderHook(() => useEquipoDetalles('t2', 'club-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.team).toMatchObject({ id: 't2', name: 'Equipo B' });
    expect(result.current.clubPlayers.map((p) => p.id)).toEqual(['p1', 'p3']);
  });

  it('si el equipo no está en el club devuelve null', async () => {
    const { result } = renderHook(() => useEquipoDetalles('t9', 'club-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.team).toBeNull();
  });

  it('sin id o sin club no pide nada y sigue cargando', async () => {
    const withoutId = renderHook(() => useEquipoDetalles(undefined, 'club-1'));
    const withoutClub = renderHook(() => useEquipoDetalles('t1', null));

    await act(async () => {});

    expect(api.get).not.toHaveBeenCalled();
    expect(withoutId.result.current.loading).toBe(true);
    expect(withoutClub.result.current.loading).toBe(true);
  });

  it('si la carga falla deja de cargar y no hay equipo', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(api.get).mockRejectedValue(new Error('500'));

    const { result } = renderHook(() => useEquipoDetalles('t1', 'club-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.team).toBeNull();
  });

  it('refetch vuelve a pedir los datos y los actualiza', async () => {
    const { result } = renderHook(() => useEquipoDetalles('t1', 'club-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    serve([{ id: 't1', name: 'Equipo A renombrado', players: [], matches: [] }]);

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.team).toMatchObject({ name: 'Equipo A renombrado' });
  });

  it('al cambiar de club o de equipo vuelve a cargar', async () => {
    const { result, rerender } = renderHook(({ id }) => useEquipoDetalles(id, 'club-1'), {
      initialProps: { id: 't1' },
    });
    await waitFor(() => expect(result.current.team).toMatchObject({ id: 't1' }));

    rerender({ id: 't2' });

    await waitFor(() => expect(result.current.team).toMatchObject({ id: 't2' }));
  });
});
