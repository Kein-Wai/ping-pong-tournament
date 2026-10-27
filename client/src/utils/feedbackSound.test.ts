import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFeedbackSound } from './feedbackSound';

// Frontera del navegador simulada: WebAudio y vibración.
const frequencies: number[] = [];

class FakeAudioContext {
  currentTime = 0;
  state = 'running';
  destination = {};
  resume = vi.fn();
  close = vi.fn();

  createOscillator() {
    return {
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
  }

  createGain() {
    return {
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
    };
  }
}

type TestCue = 'hit' | 'miss';

describe('createFeedbackSound', () => {
  let vibrate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    frequencies.length = 0;
    vibrate = vi.fn();
    vi.stubGlobal('AudioContext', FakeAudioContext);
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(navigator, 'vibrate');
  });

  const sound = () =>
    createFeedbackSound<TestCue>({
      hit: { beeps: [{ frequencyHz: 1000, atSec: 0, durationSec: 0.05 }], vibration: 20 },
      miss: { beeps: [{ frequencyHz: 200, atSec: 0, durationSec: 0.2 }], vibration: [50, 50] },
    });

  it('toca solo los avisos de la tabla que se le pasa', () => {
    const feedback = sound();
    feedback.unlock();

    feedback.play('hit');
    feedback.play('miss');

    expect(frequencies).toEqual([1000, 200]);
    expect(vibrate).toHaveBeenNthCalledWith(1, 20);
    expect(vibrate).toHaveBeenNthCalledWith(2, [50, 50]);
  });

  it('no falla si el navegador no tiene vibración', () => {
    Reflect.deleteProperty(navigator, 'vibrate');
    const feedback = sound();
    feedback.unlock();

    expect(() => feedback.play('hit')).not.toThrow();
    expect(frequencies).toEqual([1000]);
  });
});
