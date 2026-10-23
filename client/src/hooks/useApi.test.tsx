import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useApi } from './useApi';

describe('Hook useApi (client/src/hooks/useApi.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('carga los datos y marca la carga como finalizada', async () => {
    const fetcher = vi.fn().mockResolvedValue(['a', 'b']);

    const { result } = renderHook(() => useApi(fetcher, []));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual(['a', 'b']);
    expect(result.current.error).toBeUndefined();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('expone el error cuando la carga falla', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('No autorizado'));

    const { result } = renderHook(() => useApi(fetcher, []));

    await waitFor(() => expect(result.current.error).toBeDefined());

    expect(result.current.error?.message).toBe('No autorizado');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('no dispara la carga mientras enabled es false', async () => {
    const fetcher = vi.fn().mockResolvedValue('dato');

    const { result } = renderHook(() => useApi(fetcher, [], { enabled: false }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetcher).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
  });

  it('refetch vuelve a pedir los datos', async () => {
    const fetcher = vi.fn().mockResolvedValue('dato');

    const { result } = renderHook(() => useApi(fetcher, []));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.refetch();
    });

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('vuelve a cargar cuando cambian las dependencias', async () => {
    const fetcher = vi.fn().mockResolvedValue('dato');
    const { rerender } = renderHook(({ id }) => useApi(fetcher, [id]), {
      initialProps: { id: '1' },
    });

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));

    rerender({ id: '2' });

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  });

  it('no vuelve a cargar si la funcion cambia de identidad pero no las deps', async () => {
    const fetcher = vi.fn().mockResolvedValue('dato');
    const { rerender } = renderHook(
      ({ fn }) => useApi(fn, ['constante']),
      { initialProps: { fn: fetcher } },
    );

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));

    rerender({ fn: vi.fn().mockResolvedValue('otro') });

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
  });
});
