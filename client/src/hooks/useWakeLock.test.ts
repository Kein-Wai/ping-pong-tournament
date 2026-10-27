import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWakeLock } from './useWakeLock';

// Frontera del navegador simulada: la API Wake Lock.
const createSentinel = () => {
  const sentinel = {
    released: false,
    release: vi.fn(async () => {
      sentinel.released = true;
    }),
  };
  return sentinel;
};

type Sentinel = ReturnType<typeof createSentinel>;

const flush = () => act(async () => undefined);

describe('useWakeLock', () => {
  let sentinels: Sentinel[];
  let request: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sentinels = [];
    request = vi.fn(async () => {
      const sentinel = createSentinel();
      sentinels.push(sentinel);
      return sentinel;
    });
    Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true });
  });

  afterEach(() => {
    Reflect.deleteProperty(navigator, 'wakeLock');
  });

  it('Debería pedir mantener la pantalla encendida mientras la sesión está activa', async () => {
    renderHook(() => useWakeLock(true));
    await flush();

    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith('screen');
  });

  it('Debería no pedir nada si la sesión no está activa', async () => {
    renderHook(() => useWakeLock(false));
    await flush();

    expect(request).not.toHaveBeenCalled();
  });

  it('Debería soltar el bloqueo cuando la sesión deja de estar activa', async () => {
    const { rerender } = renderHook(({ active }) => useWakeLock(active), { initialProps: { active: true } });
    await flush();

    rerender({ active: false });
    await flush();

    expect(sentinels[0].release).toHaveBeenCalledTimes(1);
  });

  it('Debería soltar el bloqueo al desmontar', async () => {
    const { unmount } = renderHook(() => useWakeLock(true));
    await flush();

    unmount();
    await flush();

    expect(sentinels[0].release).toHaveBeenCalledTimes(1);
  });

  it('Debería soltar el bloqueo aunque la sesión termine antes de que el navegador lo conceda', async () => {
    const { unmount } = renderHook(() => useWakeLock(true));
    unmount();
    await flush();

    expect(sentinels[0].release).toHaveBeenCalledTimes(1);
  });

  it('Debería volver a pedir el bloqueo al volver a la pestaña si el navegador lo liberó', async () => {
    renderHook(() => useWakeLock(true));
    await flush();
    sentinels[0].released = true; // el navegador libera el bloqueo al ocultar la pestaña

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(request).toHaveBeenCalledTimes(2);
  });

  it('Debería no volver a pedirlo si el bloqueo sigue vigente', async () => {
    renderHook(() => useWakeLock(true));
    await flush();

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(request).toHaveBeenCalledTimes(1);
  });

  it('Debería no fallar si el navegador no soporta Wake Lock', async () => {
    Reflect.deleteProperty(navigator, 'wakeLock');

    expect(() => renderHook(() => useWakeLock(true))).not.toThrow();
    await flush();
  });

  it('Debería no fallar si el navegador rechaza la petición (p. ej. ahorro de batería)', async () => {
    request.mockRejectedValueOnce(new Error('NotAllowedError'));

    expect(() => renderHook(() => useWakeLock(true))).not.toThrow();
    await flush();
  });
});
