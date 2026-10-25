import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { api } from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';
import { useJugadoresLista } from './useJugadoresLista';

// Se mockea el `api` de bajo nivel (la frontera del sistema) y no los servicios,
// para que estos tests sigan valiendo cuando el acceso a datos cambie de capa.
vi.mock('../api/axios', () => ({
  api: {
    get: vi.fn(),
  },
}));

const envelope = <T,>(data: T) => ({ data: { success: true, data } });

const PLAYERS = [
  { id: 'p1', name: 'Ana', clubStatus: 'Aprobado' },
  { id: 'p2', name: 'Luis', clubStatus: 'Pendiente' },
];

describe('useJugadoresLista', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue(envelope(PLAYERS) as never);
  });

  it('empieza cargando y sin jugadores', () => {
    const { result } = renderHook(() => useJugadoresLista());

    expect(result.current.loading).toBe(true);
    expect(result.current.players).toEqual([]);
  });

  it('pide los jugadores y los expone al terminar', async () => {
    const { result } = renderHook(() => useJugadoresLista());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(api.get).toHaveBeenCalledWith(ENDPOINTS.USERS.BASE, undefined);
    expect(result.current.players).toEqual(PLAYERS);
  });

  it('si el servidor no devuelve una lista deja la plantilla vacía', async () => {
    vi.mocked(api.get).mockResolvedValue(envelope({ no: 'lista' }) as never);

    const { result } = renderHook(() => useJugadoresLista());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.players).toEqual([]);
  });

  it('si la carga falla deja la plantilla vacía, registra el error y deja de cargar', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(api.get).mockRejectedValue(new Error('red caída'));

    const { result } = renderHook(() => useJugadoresLista());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.players).toEqual([]);
    expect(consoleError).toHaveBeenCalled();
  });

  it('refetch vuelve a pedir los jugadores y pasa otra vez por la carga', async () => {
    const { result } = renderHook(() => useJugadoresLista());
    await waitFor(() => expect(result.current.loading).toBe(false));
    vi.mocked(api.get).mockResolvedValue(envelope([PLAYERS[0]]) as never);

    let pending: Promise<void>;
    act(() => {
      pending = result.current.refetch();
    });
    expect(result.current.loading).toBe(true);
    await act(async () => {
      await pending;
    });

    expect(api.get).toHaveBeenCalledTimes(2);
    expect(result.current.loading).toBe(false);
    expect(result.current.players).toEqual([PLAYERS[0]]);
  });
});
