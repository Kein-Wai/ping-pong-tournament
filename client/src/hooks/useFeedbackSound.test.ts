import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFeedbackSound } from './useFeedbackSound';
import type { FeedbackSound } from '../utils/feedbackSound';

const createFakeSound = (): FeedbackSound<'beep'> => ({
  unlock: vi.fn(),
  resume: vi.fn(),
  play: vi.fn(),
  dispose: vi.fn(),
});

const setVisibility = (state: DocumentVisibilityState) => {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
};

describe('useFeedbackSound', () => {
  it('crea el sonido una sola vez aunque el componente se renderice varias veces', () => {
    const create = vi.fn(createFakeSound);

    const { rerender } = renderHook(() => useFeedbackSound(create));
    rerender();

    expect(create).toHaveBeenCalledTimes(1);
  });

  it('reanuda el audio al volver a la pestaña, pero no al ocultarla', () => {
    const sound = createFakeSound();
    renderHook(() => useFeedbackSound(() => sound));

    setVisibility('hidden');
    expect(sound.resume).not.toHaveBeenCalled();

    setVisibility('visible');
    expect(sound.resume).toHaveBeenCalledTimes(1);
  });

  it('libera el audio y deja de escuchar la visibilidad al desmontar', () => {
    const sound = createFakeSound();
    const { unmount } = renderHook(() => useFeedbackSound(() => sound));

    unmount();
    setVisibility('visible');

    expect(sound.dispose).toHaveBeenCalledTimes(1);
    expect(sound.resume).not.toHaveBeenCalled();
  });
});
