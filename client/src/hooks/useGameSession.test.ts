import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useGameSession } from './useGameSession';
import { getRecord, saveIfBetter } from '../utils/reflex/reflexRecords';
import type { ReflexGame } from '../constants/reflexGames';

const tejas: ReflexGame = {
  slug: 'tejas',
  name: 'Tejas',
  description: 'Toca las tejas.',
  instructions: 'Toca la teja encendida.',
  direction: 'higher',
  formatScore: (value) => `${value} puntos`,
};

const flush = () => act(async () => undefined);

describe('useGameSession', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(navigator, 'wakeLock');
  });

  const setup = () => renderHook(() => useGameSession('user-1', tejas));

  it('empieza en las instrucciones y muestra el récord guardado', () => {
    saveIfBetter('user-1', 'tejas', 14, 'higher');

    const { result } = setup();

    expect(result.current.phase).toBe('instructions');
    expect(result.current.record).toBe(14);
    expect(result.current.result).toBeNull();
  });

  it('start() abre una cuenta atrás de 3, 2, 1 y después empieza la partida', () => {
    const { result } = setup();

    act(() => result.current.start());
    expect(result.current.phase).toBe('countdown');
    expect(result.current.countdown).toBe(3);

    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.countdown).toBe(2);

    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.countdown).toBe(1);

    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.phase).toBe('playing');
  });

  it('finish() cierra la partida con el resultado y guarda el récord', () => {
    const { result } = setup();
    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(3000));

    act(() => result.current.finish(12));

    expect(result.current.phase).toBe('result');
    expect(result.current.result).toEqual({ score: 12, isNewRecord: true, record: 12 });
    expect(getRecord('user-1', 'tejas')).toBe(12);
  });

  it('finish() conserva el detalle opcional que entrega el juego para mostrarlo en el resultado', () => {
    const { result } = setup();
    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(3000));

    act(() => result.current.finish(40, 'Desviación media: 54 ms'));

    expect(result.current.result).toEqual({
      score: 40,
      isNewRecord: true,
      record: 40,
      detail: 'Desviación media: 54 ms',
    });
  });

  it('un resultado peor no es nuevo récord y conserva el anterior', () => {
    saveIfBetter('user-1', 'tejas', 20, 'higher');
    const { result } = setup();
    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(3000));

    act(() => result.current.finish(8));

    expect(result.current.result).toEqual({ score: 8, isNewRecord: false, record: 20 });
  });

  it('finish() se ignora si no hay una partida en marcha', () => {
    const { result } = setup();

    act(() => result.current.finish(5));

    expect(result.current.phase).toBe('instructions');
    expect(getRecord('user-1', 'tejas')).toBeNull();
  });

  it('start() tras un resultado vuelve a la cuenta atrás con el resultado anterior borrado', () => {
    const { result } = setup();
    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(3000));
    act(() => result.current.finish(12));

    act(() => result.current.start());

    expect(result.current.phase).toBe('countdown');
    expect(result.current.countdown).toBe(3);
    expect(result.current.result).toBeNull();
    expect(result.current.record).toBe(12);
  });

  it('mantiene la pantalla encendida durante la cuenta atrás y la partida, y la libera al terminar', async () => {
    const release = vi.fn(async () => undefined);
    const request = vi.fn(async () => ({ released: false, release }));
    Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true });
    const { result } = setup();
    await flush();
    expect(request).not.toHaveBeenCalled();

    act(() => result.current.start());
    await flush();
    expect(request).toHaveBeenCalledTimes(1);

    act(() => vi.advanceTimersByTime(3000));
    act(() => result.current.finish(3));
    await flush();

    expect(release).toHaveBeenCalled();
  });
});
