import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { api } from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';
import { useLigaDetalles } from './useLigaDetalles';

vi.mock('../api/axios', () => ({ api: { get: vi.fn() } }));

const LEAGUE = { id: 'l1', name: 'Liga', participants: [] };
const MATCHES = [{ id: 'm1', round: 1 }];
const STANDINGS = { final: false, standings: [] };

const serve = () => {
  vi.mocked(api.get).mockImplementation(async (url: string) => {
    const bodies: Record<string, unknown> = {
      [ENDPOINTS.LEAGUES.BY_ID('l1')]: LEAGUE,
      [ENDPOINTS.LEAGUES.MATCHES('l1')]: MATCHES,
      [ENDPOINTS.LEAGUES.STANDINGS('l1')]: STANDINGS,
    };
    return { data: { success: true, data: bodies[url] } } as never;
  });
};

describe('useLigaDetalles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serve();
  });

  it('carga la liga, su calendario y su clasificación', async () => {
    const { result } = renderHook(() => useLigaDetalles('l1'));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.league).toEqual(LEAGUE);
    expect(result.current.matches).toEqual(MATCHES);
    expect(result.current.standings).toEqual(STANDINGS);
  });

  it('recarga los tres datos con reload', async () => {
    const { result } = renderHook(() => useLigaDetalles('l1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    vi.mocked(api.get).mockClear();

    await act(async () => {
      await result.current.reload();
    });

    expect(api.get).toHaveBeenCalledTimes(3);
  });

  it('si la liga no se puede cargar, termina sin liga y sin romperse', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('404'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useLigaDetalles('l1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.league).toBeNull();
    expect(result.current.matches).toEqual([]);
    consoleError.mockRestore();
  });

  it('sin id no pide nada', async () => {
    const { result } = renderHook(() => useLigaDetalles(undefined));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(api.get).not.toHaveBeenCalled();
    expect(result.current.league).toBeNull();
  });
});
