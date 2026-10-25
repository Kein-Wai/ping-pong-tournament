import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { api } from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';
import { useEntrenamientosGenerales } from './useEntrenamientosGenerales';

// Se mockea el `api` de bajo nivel (la frontera del sistema) y no los servicios,
// para que estos tests sigan valiendo cuando el acceso a datos cambie de capa.
vi.mock('../api/axios', () => ({
  api: {
    get: vi.fn(),
  },
}));

const envelope = <T,>(data: T) => ({ data: { success: true, data } });

const SCHEDULES = [{ id: 's1', name: 'Clase Adultos' }];
const TRAININGS = [{ id: 't1', date: '2026-10-05T17:00:00.000Z', attendances: [] }];
const USERS = [
  { id: 'p1', name: 'Ana', clubStatus: 'Aprobado' },
  { id: 'p2', name: 'Luis', clubStatus: 'Pendiente' },
  { id: 'p3', name: 'Marta', clubStatus: 'Rechazado' },
];

const serve = () => {
  vi.mocked(api.get).mockImplementation((async (url: string) => {
    if (url === ENDPOINTS.GENERAL_TRAININGS.SCHEDULES) return envelope(SCHEDULES);
    if (url === ENDPOINTS.GENERAL_TRAININGS.BASE) return envelope(TRAININGS);
    if (url === ENDPOINTS.USERS.BASE) return envelope(USERS);
    throw new Error(`Peticion no esperada: ${url}`);
  }) as never);
};

describe('useEntrenamientosGenerales', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serve();
  });

  it('empieza cargando y sin datos', () => {
    const { result } = renderHook(() => useEntrenamientosGenerales());

    expect(result.current.loading).toBe(true);
    expect(result.current.schedules).toEqual([]);
    expect(result.current.trainings).toEqual([]);
    expect(result.current.players).toEqual([]);
  });

  it('pide horarios, entrenamientos y usuarios', async () => {
    const { result } = renderHook(() => useEntrenamientosGenerales());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(api.get).toHaveBeenCalledWith(ENDPOINTS.GENERAL_TRAININGS.SCHEDULES, undefined);
    expect(api.get).toHaveBeenCalledWith(ENDPOINTS.GENERAL_TRAININGS.BASE, undefined);
    expect(api.get).toHaveBeenCalledWith(ENDPOINTS.USERS.BASE, undefined);
    expect(result.current.schedules).toEqual(SCHEDULES);
    expect(result.current.trainings).toEqual(TRAININGS);
  });

  it('solo conserva a los jugadores aprobados', async () => {
    const { result } = renderHook(() => useEntrenamientosGenerales());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.players.map((p) => p.id)).toEqual(['p1']);
  });

  it('si la carga falla deja los datos vacíos, registra el error y deja de cargar', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(api.get).mockRejectedValue(new Error('red caída'));

    const { result } = renderHook(() => useEntrenamientosGenerales());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.schedules).toEqual([]);
    expect(consoleError).toHaveBeenCalled();
  });

  it('refetch vuelve a pedir los tres recursos y pasa otra vez por la carga', async () => {
    const { result } = renderHook(() => useEntrenamientosGenerales());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let pending: Promise<void>;
    act(() => {
      pending = result.current.refetch();
    });
    expect(result.current.loading).toBe(true);
    await act(async () => {
      await pending;
    });

    expect(api.get).toHaveBeenCalledTimes(6);
    expect(result.current.loading).toBe(false);
  });
});
