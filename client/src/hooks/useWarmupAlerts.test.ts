import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { WarmupView } from '../utils/warmupEngine';
import { useWarmupAlerts } from './useWarmupAlerts';

// Frontera del navegador simulada: Web Audio y vibración.
class FakeOscillator {
  type = 'sine';
  frequency = { value: 0 };
  connect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

class FakeGain {
  gain = {
    value: 1,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  };
  connect = vi.fn();
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  state: 'running' | 'suspended' = 'running';
  currentTime = 0;
  destination = {};
  oscillators: FakeOscillator[] = [];
  resume = vi.fn(async () => {
    this.state = 'running';
  });
  close = vi.fn(async () => undefined);

  constructor() {
    FakeAudioContext.instances.push(this);
  }

  createOscillator() {
    const oscillator = new FakeOscillator();
    this.oscillators.push(oscillator);
    return oscillator;
  }

  createGain() {
    return new FakeGain();
  }
}

const view = (overrides: Partial<WarmupView> = {}): WarmupView => ({
  phase: 'exercise',
  index: 0,
  remainingSec: 30,
  totalRemainingSec: 100,
  paused: false,
  waiting: false,
  ...overrides,
});

describe('useWarmupAlerts', () => {
  beforeEach(() => {
    FakeAudioContext.instances = [];
    vi.stubGlobal('AudioContext', FakeAudioContext);
    Object.defineProperty(navigator, 'vibrate', { value: vi.fn(() => true), configurable: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(navigator, 'vibrate');
  });

  describe('unlock', () => {
    it('Debería crear el contexto de audio al desbloquear', () => {
      const { result } = renderHook(() => useWarmupAlerts(null));

      act(() => result.current.unlock());

      expect(FakeAudioContext.instances).toHaveLength(1);
    });

    it('Debería reanudar el contexto si el navegador lo dejó suspendido', () => {
      const { result } = renderHook(() => useWarmupAlerts(null));
      act(() => result.current.unlock());
      const context = FakeAudioContext.instances[0];
      context.state = 'suspended';

      act(() => result.current.unlock());

      expect(context.resume).toHaveBeenCalled();
      expect(FakeAudioContext.instances).toHaveLength(1);
    });

    it('Debería no fallar si el navegador no soporta Web Audio', () => {
      vi.stubGlobal('AudioContext', undefined);
      const { result } = renderHook(() => useWarmupAlerts(null));

      expect(() => act(() => result.current.unlock())).not.toThrow();
    });
  });

  describe('avisos', () => {
    const arrancar = (inicial: WarmupView) => {
      const hook = renderHook(({ current }) => useWarmupAlerts(current), { initialProps: { current: inicial } });
      act(() => hook.result.current.unlock());
      const context = FakeAudioContext.instances[0];
      const cambiarA = (siguiente: WarmupView) => hook.rerender({ current: siguiente });
      return { ...hook, context, cambiarA };
    };

    it('Debería no sonar con la primera vista', () => {
      const { context } = arrancar(view({ remainingSec: 3 }));

      expect(context.oscillators).toHaveLength(0);
      expect(navigator.vibrate).not.toHaveBeenCalled();
    });

    it('Debería dar un pitido corto y una vibración breve en cada tic', () => {
      const { context, cambiarA } = arrancar(view({ remainingSec: 4 }));

      cambiarA(view({ remainingSec: 3 }));

      expect(context.oscillators).toHaveLength(1);
      expect(context.oscillators[0].start).toHaveBeenCalledTimes(1);
      expect(navigator.vibrate).toHaveBeenCalledWith(30);
    });

    it('Debería dar un pitido largo y agudo, y una vibración, al empezar el ejercicio', () => {
      const { context, cambiarA } = arrancar(view({ phase: 'rest', remainingSec: 4 }));
      cambiarA(view({ phase: 'rest', remainingSec: 3 }));
      const tic = context.oscillators[0]; // referencia de tono

      cambiarA(view({ phase: 'exercise', remainingSec: 60 }));

      const inicio = context.oscillators[1];
      expect(context.oscillators).toHaveLength(2);
      expect(inicio.frequency.value).toBeGreaterThan(tic.frequency.value);
      expect(navigator.vibrate).toHaveBeenLastCalledWith(200);
    });

    it('Debería dar dos pitidos graves al empezar el descanso', () => {
      const { context, cambiarA } = arrancar(view({ phase: 'exercise', remainingSec: 60 }));
      cambiarA(view({ phase: 'exercise', remainingSec: 3 }));
      const tic = context.oscillators[0];

      cambiarA(view({ phase: 'rest', index: 1, remainingSec: 30 }));

      const pitidos = context.oscillators.slice(1);
      expect(pitidos).toHaveLength(2);
      pitidos.forEach((pitido) => expect(pitido.frequency.value).toBeLessThan(tic.frequency.value));
      expect(navigator.vibrate).toHaveBeenLastCalledWith([80, 60, 80]);
    });

    it('Debería dar tres pitidos al terminar la sesión', () => {
      const { context, cambiarA } = arrancar(view({ phase: 'exercise', remainingSec: 1 }));

      cambiarA(view({ phase: 'finished', remainingSec: 0 }));

      expect(context.oscillators).toHaveLength(3);
      expect(navigator.vibrate).toHaveBeenLastCalledWith([200, 100, 200, 100, 400]);
    });

    it('Debería vibrar pero no sonar si el audio no se desbloqueó con un gesto', () => {
      const { rerender } = renderHook(({ current }) => useWarmupAlerts(current), {
        initialProps: { current: view({ remainingSec: 4 }) },
      });

      rerender({ current: view({ remainingSec: 3 }) });

      expect(FakeAudioContext.instances).toHaveLength(0);
      expect(navigator.vibrate).toHaveBeenCalledWith(30);
    });

    it('Debería seguir sonando si el dispositivo no soporta vibración', () => {
      Reflect.deleteProperty(navigator, 'vibrate');
      const { context, cambiarA } = arrancar(view({ remainingSec: 4 }));

      expect(() => cambiarA(view({ remainingSec: 3 }))).not.toThrow();
      expect(context.oscillators).toHaveLength(1);
    });

    it('Debería reanudar el audio al volver a la app si el sistema lo suspendió', () => {
      const { context } = arrancar(view({ remainingSec: 30 }));
      context.state = 'suspended';
      context.resume.mockClear();

      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      expect(context.resume).toHaveBeenCalledTimes(1);
    });

    it('Debería cerrar el audio al desmontar', () => {
      const { context, unmount } = arrancar(view({ remainingSec: 30 }));

      unmount();

      expect(context.close).toHaveBeenCalledTimes(1);
    });

    it('Debería no repetir el pitido si la vista se refresca sin cambiar de segundo', () => {
      const { context, cambiarA } = arrancar(view({ remainingSec: 4 }));

      cambiarA(view({ remainingSec: 3 }));
      cambiarA(view({ remainingSec: 3 }));

      expect(context.oscillators).toHaveLength(1);
    });
  });
});
