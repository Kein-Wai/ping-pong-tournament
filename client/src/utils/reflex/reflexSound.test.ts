import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createReflexSound, type ReflexCue } from './reflexSound';

describe('createReflexSound', () => {
  let vibrate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vibrate = vi.fn();
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
  });

  afterEach(() => {
    Reflect.deleteProperty(navigator, 'vibrate');
  });

  it.each<ReflexCue>(['tick', 'go', 'hit', 'miss', 'finish'])(
    'el aviso «%s» está definido y vibra',
    (cue) => {
      createReflexSound().play(cue);

      expect(vibrate).toHaveBeenCalledTimes(1);
    }
  );

  it('el fallo vibra distinto del acierto para reconocerlo sin mirar', () => {
    const sound = createReflexSound();

    sound.play('hit');
    sound.play('miss');

    expect(vibrate.mock.calls[0][0]).not.toEqual(vibrate.mock.calls[1][0]);
  });
});
