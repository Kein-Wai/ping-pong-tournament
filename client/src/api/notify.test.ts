import { describe, it, expect, vi, afterEach } from 'vitest';
import { createErrorNotifier } from './notify';

describe('Deduplicacion de notificaciones (client/src/api/notify.ts)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('permite notificar la primera vez', () => {
    const notify = createErrorNotifier(3000);

    expect(notify('Error (500): error')).toBe(true);
  });

  it('no vuelve a notificar el mismo mensaje dentro de la ventana', () => {
    const notify = createErrorNotifier(3000);

    notify('Error (500): error');

    expect(notify('Error (500): error')).toBe(false);
  });

  it('permite mensajes distintos al mismo tiempo', () => {
    const notify = createErrorNotifier(3000);

    notify('Error (500): error A');

    expect(notify('Error (500): error B')).toBe(true);
  });

  it('vuelve a notificar cuando pasa la ventana', () => {
    vi.useFakeTimers();
    const notify = createErrorNotifier(3000);

    notify('Error (500): error');
    vi.advanceTimersByTime(3001);

    expect(notify('Error (500): error')).toBe(true);
  });
});
