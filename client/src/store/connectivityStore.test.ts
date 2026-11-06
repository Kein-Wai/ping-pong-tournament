import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WORK_OFFLINE_KEY, selectIsOnline, useConnectivityStore } from './connectivityStore';

describe('useConnectivityStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useConnectivityStore.setState({ networkOnline: true, workOffline: false });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('arranca con red y sin el interruptor de trabajar offline', () => {
    expect(useConnectivityStore.getState()).toMatchObject({ networkOnline: true, workOffline: false });
  });

  it('setNetworkOnline cambia el estado de la red', () => {
    useConnectivityStore.getState().setNetworkOnline(false);

    expect(useConnectivityStore.getState().networkOnline).toBe(false);
  });

  it('activar «Trabajar offline» lo recuerda para la próxima vez que se abra la app', () => {
    useConnectivityStore.getState().setWorkOffline(true);

    expect(useConnectivityStore.getState().workOffline).toBe(true);
    expect(localStorage.getItem(WORK_OFFLINE_KEY)).toBe('true');
  });

  it('apagarlo borra lo recordado', () => {
    useConnectivityStore.getState().setWorkOffline(true);

    useConnectivityStore.getState().setWorkOffline(false);

    expect(useConnectivityStore.getState().workOffline).toBe(false);
    expect(localStorage.getItem(WORK_OFFLINE_KEY)).toBeNull();
  });

  it('al abrir la app recupera el interruptor que se dejó activado', async () => {
    localStorage.setItem(WORK_OFFLINE_KEY, 'true');
    vi.resetModules();

    const fresh = await import('./connectivityStore');

    expect(fresh.useConnectivityStore.getState().workOffline).toBe(true);
  });

  it('si el almacenamiento falla, el interruptor sigue funcionando en esta sesión', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('almacenamiento bloqueado');
    });

    useConnectivityStore.getState().setWorkOffline(true);

    expect(useConnectivityStore.getState().workOffline).toBe(true);
  });

  describe('selectIsOnline', () => {
    it('hay conexión usable cuando hay red y no se trabaja offline', () => {
      expect(selectIsOnline({ networkOnline: true, workOffline: false })).toBe(true);
    });

    it('sin red no hay conexión usable', () => {
      expect(selectIsOnline({ networkOnline: false, workOffline: false })).toBe(false);
    });

    it('con red pero trabajando offline tampoco', () => {
      expect(selectIsOnline({ networkOnline: true, workOffline: true })).toBe(false);
    });
  });
});
