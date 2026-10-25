import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { api } from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';
import type { TrackedMatch } from '../types/manualMatch';
import { useManualMatch } from './useManualMatch';

// Se mockea el `api` de bajo nivel (la frontera del sistema) y no los servicios,
// para que estos tests sigan valiendo cuando el acceso a datos cambie de capa.
vi.mock('../api/axios', () => ({
  api: {
    get: vi.fn(),
  },
}));

const envelope = <T>(data: T) => ({ data: { success: true, data } });

const MATCH = {
  id: 'm1',
  opponentName: 'Carlos',
  status: 'Iniciado',
  points: [],
} as unknown as TrackedMatch;

describe('useManualMatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue(envelope(MATCH) as never);
  });

  it('empieza sin partido', () => {
    const { result } = renderHook(() => useManualMatch('m1'));

    expect(result.current.match).toBeNull();
    expect(result.current.loaded).toBeNull();
  });

  it('pide el partido por id y lo expone al llegar', async () => {
    const { result } = renderHook(() => useManualMatch('m1'));

    await waitFor(() => expect(result.current.match).toEqual(MATCH));

    expect(api.get).toHaveBeenCalledWith(ENDPOINTS.MANUAL_MATCHES.BY_ID('m1'), undefined);
    expect(result.current.loaded).toEqual(MATCH);
  });

  it('setMatch cambia el partido sin tocar lo que se cargó del servidor', async () => {
    const { result } = renderHook(() => useManualMatch('m1'));
    await waitFor(() => expect(result.current.match).not.toBeNull());

    act(() => result.current.setMatch({ ...MATCH, opponentName: 'Otro' }));

    expect(result.current.match?.opponentName).toBe('Otro');
    expect(result.current.loaded?.opponentName).toBe('Carlos');
  });

  it('al cambiar de partido vuelve a pedirlo', async () => {
    const { result, rerender } = renderHook(({ id }) => useManualMatch(id), {
      initialProps: { id: 'm1' },
    });
    await waitFor(() => expect(result.current.match).not.toBeNull());

    rerender({ id: 'm2' });

    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith(ENDPOINTS.MANUAL_MATCHES.BY_ID('m2'), undefined),
    );
  });

  it('si la carga falla se queda sin partido', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('red caída'));

    const { result } = renderHook(() => useManualMatch('m1'));
    await waitFor(() => expect(api.get).toHaveBeenCalled());

    expect(result.current.match).toBeNull();
  });
});
