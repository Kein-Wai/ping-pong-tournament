import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { WarmupItem } from '../utils/warmupEngine';
import { useWarmupSession } from './useWarmupSession';

const RUTINA: WarmupItem[] = [
  { exerciseKey: 'estiramientos', durationSec: 60, courtesySec: 10 },
  { exerciseKey: 'derecha-derecha', durationSec: 90, courtesySec: 30 },
];

describe('useWarmupSession', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('Debería no tener vista hasta pulsar «Preparado»', () => {
    const { result } = renderHook(() => useWarmupSession(RUTINA));

    expect(result.current.view).toBeNull();
  });

  it('Debería empezar en la cuenta atrás de 5 s al arrancar', () => {
    const { result } = renderHook(() => useWarmupSession(RUTINA));

    act(() => result.current.start());

    expect(result.current.view).toMatchObject({ phase: 'countdown', remainingSec: 5 });
  });

  it('Debería actualizar la vista sola a medida que pasa el tiempo', () => {
    const { result } = renderHook(() => useWarmupSession(RUTINA));
    act(() => result.current.start());

    act(() => {
      vi.advanceTimersByTime(2_000);
    });

    expect(result.current.view).toMatchObject({ phase: 'countdown', remainingSec: 3 });
  });

  it('Debería cambiar de fase cuando termina la cuenta atrás', () => {
    const { result } = renderHook(() => useWarmupSession(RUTINA));
    act(() => result.current.start());

    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    expect(result.current.view).toMatchObject({ phase: 'courtesy', index: 0, remainingSec: 10 });
  });

  it('Debería congelar la vista al pausar y seguir donde se quedó al reanudar', () => {
    const { result } = renderHook(() => useWarmupSession(RUTINA));
    act(() => result.current.start());
    act(() => {
      vi.advanceTimersByTime(2_000);
    });

    act(() => result.current.pause());
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(result.current.view).toMatchObject({ remainingSec: 3, paused: true });

    act(() => result.current.resume());
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(result.current.view).toMatchObject({ remainingSec: 2, paused: false });
  });

  it('Debería esperar en la cortesía hasta que el jugador diga que está listo', () => {
    const { result } = renderHook(() => useWarmupSession(RUTINA));
    act(() => result.current.start());
    act(() => {
      vi.advanceTimersByTime(6_000);
    });

    act(() => result.current.hold());
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(result.current.view).toMatchObject({ phase: 'courtesy', remainingSec: 9, waiting: true });

    act(() => result.current.skip());
    expect(result.current.view).toMatchObject({ phase: 'exercise', index: 0, remainingSec: 60, waiting: false });
  });

  it('Debería navegar con siguiente, anterior y terminar', () => {
    const { result } = renderHook(() => useWarmupSession(RUTINA));
    act(() => result.current.start());
    act(() => {
      vi.advanceTimersByTime(20_000);
    });

    act(() => result.current.next());
    expect(result.current.view).toMatchObject({ phase: 'courtesy', index: 1, remainingSec: 30 });

    act(() => result.current.previous());
    expect(result.current.view).toMatchObject({ phase: 'courtesy', index: 0, remainingSec: 10 });

    act(() => result.current.finish());
    expect(result.current.view).toMatchObject({ phase: 'finished', remainingSec: 0 });
  });

  it('Debería recalcular la vista al instante cuando la pestaña vuelve a ser visible', () => {
    const { result } = renderHook(() => useWarmupSession(RUTINA));
    act(() => result.current.start());

    // El reloj salta 80 s sin que el intervalo llegue a dispararse (pestaña en segundo plano).
    vi.setSystemTime(Date.now() + 80_000);
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(result.current.view).toMatchObject({ phase: 'courtesy', index: 1, remainingSec: 25 });
  });

  it('Debería dejar de refrescar cuando la sesión termina y al desmontar', () => {
    const { result, unmount } = renderHook(() => useWarmupSession(RUTINA));
    expect(vi.getTimerCount()).toBe(0);

    act(() => result.current.start());
    expect(vi.getTimerCount()).toBe(1);

    act(() => result.current.finish());
    expect(vi.getTimerCount()).toBe(0);

    act(() => result.current.start());
    expect(vi.getTimerCount()).toBe(1);

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('Debería reiniciar la sesión desde la cuenta atrás al arrancar de nuevo', () => {
    const { result } = renderHook(() => useWarmupSession(RUTINA));
    act(() => result.current.start());
    act(() => {
      vi.advanceTimersByTime(20_000);
    });

    act(() => result.current.start());

    expect(result.current.view).toMatchObject({ phase: 'countdown', index: 0, remainingSec: 5 });
  });

  it('Debería volver al estado inicial sin vista y sin temporizadores al hacer reset', () => {
    const { result } = renderHook(() => useWarmupSession(RUTINA));
    act(() => result.current.start());
    act(() => result.current.finish());

    act(() => result.current.reset());

    expect(result.current.view).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('Debería ignorar las acciones si la sesión no ha empezado', () => {
    const { result } = renderHook(() => useWarmupSession(RUTINA));

    act(() => {
      result.current.pause();
      result.current.next();
      result.current.finish();
    });

    expect(result.current.view).toBeNull();
  });
});
