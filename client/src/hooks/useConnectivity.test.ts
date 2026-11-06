import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { startConnectivityMonitoring } from '../offline/connectivityMonitor';
import { useConnectivityStore } from '../store/connectivityStore';
import { isNativeApp } from '../utils/platform';
import { useConnectivity, useConnectivityMonitor } from './useConnectivity';

vi.mock('../offline/connectivityMonitor', () => ({ startConnectivityMonitoring: vi.fn() }));
vi.mock('../utils/platform', () => ({ isNativeApp: vi.fn() }));

describe('useConnectivity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useConnectivityStore.setState({ networkOnline: true, workOffline: false });
    vi.mocked(isNativeApp).mockReturnValue(true);
  });

  it('con red y sin el interruptor, hay conexión', () => {
    const { result } = renderHook(() => useConnectivity());

    expect(result.current).toMatchObject({
      isNative: true,
      isOnline: true,
      networkOnline: true,
      workOffline: false,
    });
  });

  it('sin red no hay conexión pero el interruptor sigue apagado', () => {
    useConnectivityStore.setState({ networkOnline: false });

    const { result } = renderHook(() => useConnectivity());

    expect(result.current.isOnline).toBe(false);
    expect(result.current.workOffline).toBe(false);
  });

  it('activar «Trabajar offline» quita la conexión aunque haya red', () => {
    const { result } = renderHook(() => useConnectivity());

    act(() => result.current.setWorkOffline(true));

    expect(result.current.workOffline).toBe(true);
    expect(result.current.networkOnline).toBe(true);
    expect(result.current.isOnline).toBe(false);
  });

  it('en el navegador avisa de que no es nativo', () => {
    vi.mocked(isNativeApp).mockReturnValue(false);

    const { result } = renderHook(() => useConnectivity());

    expect(result.current.isNative).toBe(false);
  });
});

describe('useConnectivityMonitor', () => {
  const stop = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(startConnectivityMonitoring).mockResolvedValue(stop);
  });

  it('empieza a vigilar la red al montarse', () => {
    renderHook(() => useConnectivityMonitor());

    expect(startConnectivityMonitoring).toHaveBeenCalledTimes(1);
  });

  it('deja de vigilar al desmontarse', async () => {
    const { unmount } = renderHook(() => useConnectivityMonitor());
    await act(async () => {});

    unmount();

    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('si se desmonta antes de que arranque, para igualmente en cuanto arranca', async () => {
    const { unmount } = renderHook(() => useConnectivityMonitor());

    unmount();
    await act(async () => {});

    expect(stop).toHaveBeenCalledTimes(1);
  });
});
