import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Network } from '@capacitor/network';
import { useConnectivityStore } from '../store/connectivityStore';
import { isNativeApp } from '../utils/platform';
import { startConnectivityMonitoring, whenConnectivityKnown } from './connectivityMonitor';

vi.mock('@capacitor/network', () => ({
  Network: { getStatus: vi.fn(), addListener: vi.fn() },
}));
vi.mock('../utils/platform', () => ({ isNativeApp: vi.fn() }));

// Cada test deja de escuchar al terminar: los eventos de `window` son globales y se acumularían.
const stops: Array<() => void> = [];
const start = async () => {
  const stop = await startConnectivityMonitoring();
  stops.push(stop);
  return stop;
};

type StatusListener = (status: { connected: boolean }) => void;

describe('startConnectivityMonitoring', () => {
  const remove = vi.fn().mockResolvedValue(undefined);
  let emit: StatusListener;

  afterEach(() => {
    stops.splice(0).forEach((stop) => stop());
  });

  beforeEach(() => {
    vi.clearAllMocks();
    useConnectivityStore.setState({ networkOnline: true, workOffline: false });
    vi.mocked(isNativeApp).mockReturnValue(true);
    vi.mocked(Network.getStatus).mockResolvedValue({ connected: true, connectionType: 'wifi' });
    vi.mocked(Network.addListener).mockImplementation(((_event: string, listener: StatusListener) => {
      emit = listener;
      return Promise.resolve({ remove });
    }) as never);
  });

  it('en el navegador no hace nada', async () => {
    vi.mocked(isNativeApp).mockReturnValue(false);

    const stop = await start();
    stop();

    expect(Network.getStatus).not.toHaveBeenCalled();
    expect(Network.addListener).not.toHaveBeenCalled();
  });

  it('en nativo toma el estado inicial de la red', async () => {
    vi.mocked(Network.getStatus).mockResolvedValue({ connected: false, connectionType: 'none' });

    await start();

    expect(useConnectivityStore.getState().networkOnline).toBe(false);
  });

  it('actualiza el estado cuando la red cambia', async () => {
    await start();

    emit({ connected: false });
    expect(useConnectivityStore.getState().networkOnline).toBe(false);

    emit({ connected: true });
    expect(useConnectivityStore.getState().networkOnline).toBe(true);
  });

  it('al parar deja de escuchar', async () => {
    const stop = await start();

    stop();

    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('si no se puede leer el estado inicial, supone que hay red y sigue escuchando', async () => {
    vi.mocked(Network.getStatus).mockRejectedValue(new Error('plugin no disponible'));

    await start();

    expect(useConnectivityStore.getState().networkOnline).toBe(true);
    expect(Network.addListener).toHaveBeenCalledTimes(1);
  });

  it('whenConnectivityKnown espera a que se lea el estado inicial de la red', async () => {
    let resolveStatus: (status: { connected: boolean; connectionType: 'none' }) => void = () => undefined;
    vi.mocked(Network.getStatus).mockReturnValue(
      new Promise((resolve) => {
        resolveStatus = resolve;
      }),
    );
    const started = start();
    let known = false;
    void whenConnectivityKnown().then(() => {
      known = true;
    });

    await Promise.resolve();
    expect(known).toBe(false);

    resolveStatus({ connected: false, connectionType: 'none' });
    await started;
    await whenConnectivityKnown();

    expect(known).toBe(true);
    expect(useConnectivityStore.getState().networkOnline).toBe(false);
  });

  it('whenConnectivityKnown no espera nada si no se ha empezado a vigilar', async () => {
    await expect(whenConnectivityKnown()).resolves.toBeUndefined();
  });

  it('el interruptor «Trabajar offline» no lo toca la red', async () => {
    useConnectivityStore.getState().setWorkOffline(true);
    await start();

    emit({ connected: true });

    expect(useConnectivityStore.getState().workOffline).toBe(true);
  });

  describe('señales de respaldo del WebView', () => {
    it('si el sistema avisa de que se perdió la red (modo avión), pasa a sin conexión', async () => {
      await start();

      window.dispatchEvent(new Event('offline'));

      expect(useConnectivityStore.getState().networkOnline).toBe(false);
    });

    it('al volver la red del sistema, relee el estado real del móvil', async () => {
      vi.mocked(Network.getStatus).mockResolvedValue({ connected: false, connectionType: 'none' });
      await start();
      vi.mocked(Network.getStatus).mockResolvedValue({ connected: true, connectionType: 'wifi' });

      window.dispatchEvent(new Event('online'));
      await vi.waitFor(() => expect(useConnectivityStore.getState().networkOnline).toBe(true));
    });

    it('al volver a la app desde segundo plano relee el estado de la red', async () => {
      await start();
      vi.mocked(Network.getStatus).mockResolvedValue({ connected: false, connectionType: 'none' });

      document.dispatchEvent(new Event('visibilitychange'));

      await vi.waitFor(() => expect(useConnectivityStore.getState().networkOnline).toBe(false));
    });

    it('al parar deja de escuchar esas señales', async () => {
      const stop = await start();
      stop();

      window.dispatchEvent(new Event('offline'));

      expect(useConnectivityStore.getState().networkOnline).toBe(true);
    });

    it('si el plugin de red falla al escuchar, las señales de respaldo siguen funcionando', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      vi.mocked(Network.addListener).mockRejectedValue(new Error('plugin no disponible'));

      await start();
      window.dispatchEvent(new Event('offline'));

      expect(useConnectivityStore.getState().networkOnline).toBe(false);
    });
  });
});
