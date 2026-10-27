import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createWarmupSound } from './warmupSound';

// Frontera del navegador simulada: WebAudio y vibración.
const frequencies: number[] = [];
let contexts: FakeAudioContext[];

class FakeAudioContext {
  currentTime = 0;
  state = 'running';
  destination = {};
  resume = vi.fn();
  close = vi.fn();

  constructor() {
    contexts.push(this);
  }

  createOscillator() {
    const oscillator = {
      type: 'sine',
      frequency: {
        set value(hz: number) {
          frequencies.push(hz);
        },
      },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
    return oscillator;
  }

  createGain() {
    return {
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
    };
  }
}

describe('createWarmupSound', () => {
  let vibrate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    frequencies.length = 0;
    contexts = [];
    vibrate = vi.fn();
    vi.stubGlobal('AudioContext', FakeAudioContext);
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(navigator, 'vibrate');
  });

  it('el aviso de final suena en tres notas ascendentes y vibra con su patrón', () => {
    const sound = createWarmupSound();
    sound.unlock();

    sound.play('finish');

    expect(frequencies).toEqual([660, 880, 1320]);
    expect(vibrate).toHaveBeenCalledWith([200, 100, 200, 100, 400]);
  });

  it('el aviso de descanso suena en dos pitidos graves iguales', () => {
    const sound = createWarmupSound();
    sound.unlock();

    sound.play('rest-start');

    expect(frequencies).toEqual([440, 440]);
    expect(vibrate).toHaveBeenCalledWith([80, 60, 80]);
  });

  it('antes de desbloquear el audio no suena nada pero sí vibra', () => {
    const sound = createWarmupSound();

    sound.play('tick');

    expect(frequencies).toEqual([]);
    expect(vibrate).toHaveBeenCalledWith(30);
  });

  it('reutiliza un único contexto de audio aunque se desbloquee varias veces', () => {
    const sound = createWarmupSound();

    sound.unlock();
    sound.unlock();

    expect(contexts).toHaveLength(1);
  });

  it('dispose() cierra el audio y deja de sonar', () => {
    const sound = createWarmupSound();
    sound.unlock();

    sound.dispose();
    sound.play('tick');

    expect(contexts[0].close).toHaveBeenCalled();
    expect(frequencies).toEqual([]);
  });
});
