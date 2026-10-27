import { describe, expect, it } from 'vitest';
import {
  ATTEMPTS,
  MAX_WAIT_MS,
  MIN_WAIT_MS,
  PAUSE_MS,
  TIMEOUT_MS,
  advance,
  averageMs,
  createReactionGame,
  tap,
  waitMsOf,
} from './reactionEngine';

const shortest = () => 0;

describe('waitMsOf', () => {
  it('reparte la espera entre 1 y 4 segundos', () => {
    expect(MIN_WAIT_MS).toBe(1000);
    expect(MAX_WAIT_MS).toBe(4000);
    expect(waitMsOf(() => 0)).toBe(1000);
    expect(waitMsOf(() => 0.5)).toBe(2500);
    expect(waitMsOf(() => 0.999999)).toBeLessThan(4000);
  });
});

describe('averageMs', () => {
  it('es la media de los tiempos, redondeada al milisegundo', () => {
    expect(averageMs([200, 300, 250])).toBe(250);
    expect(averageMs([200, 201])).toBe(201);
  });

  it('es 0 si aún no hay ningún tiempo', () => {
    expect(averageMs([])).toBe(0);
  });
});

describe('reactionEngine - un intento', () => {
  it('empieza esperando, con la señal programada tras la espera aleatoria', () => {
    const game = createReactionGame(5000, shortest);

    expect(game.phase).toBe('waiting');
    expect(game.attempt).toBe(1);
    expect(game.goAt).toBe(5000 + MIN_WAIT_MS);
    expect(game.times).toEqual([]);
  });

  it('no da la señal antes de tiempo y la da justo cuando toca', () => {
    const game = createReactionGame(0, shortest);

    expect(advance(game, MIN_WAIT_MS - 1, shortest).phase).toBe('waiting');
    expect(advance(game, MIN_WAIT_MS, shortest).phase).toBe('go');
  });

  it('mide los milisegundos desde la señal hasta el toque', () => {
    const go = advance(createReactionGame(0, shortest), MIN_WAIT_MS, shortest);

    const shown = tap(go, MIN_WAIT_MS + 230, shortest);

    expect(shown.phase).toBe('shown');
    expect(shown.outcome).toBe('reaction');
    expect(shown.lastMs).toBe(230);
    expect(shown.times).toEqual([230]);
  });

  it('un toque justo tras la señal cuenta aunque el reloj no hubiera avanzado todavía', () => {
    const waiting = createReactionGame(0, shortest);

    const shown = tap(waiting, MIN_WAIT_MS + 100, shortest);

    expect(shown.outcome).toBe('reaction');
    expect(shown.lastMs).toBe(100);
  });
});

describe('reactionEngine - salida en falso y demasiado lento', () => {
  it('tocar antes de la señal es salida en falso: no cuenta tiempo y el intento se repite', () => {
    const waiting = createReactionGame(0, shortest);

    const shown = tap(waiting, 400, shortest);

    expect(shown.phase).toBe('shown');
    expect(shown.outcome).toBe('false-start');
    expect(shown.times).toEqual([]);
    expect(shown.attempt).toBe(1);

    const retry = advance(shown, 400 + PAUSE_MS, shortest);
    expect(retry.phase).toBe('waiting');
    expect(retry.attempt).toBe(1);
    expect(retry.goAt).toBe(400 + PAUSE_MS + MIN_WAIT_MS);
  });

  it('si nadie toca en 1,5 s, el intento cuenta 1500 ms como «demasiado lento»', () => {
    const go = advance(createReactionGame(0, shortest), MIN_WAIT_MS, shortest);

    expect(advance(go, MIN_WAIT_MS + TIMEOUT_MS - 1, shortest).phase).toBe('go');
    const slow = advance(go, MIN_WAIT_MS + TIMEOUT_MS, shortest);

    expect(slow.outcome).toBe('too-slow');
    expect(slow.lastMs).toBe(TIMEOUT_MS);
    expect(slow.times).toEqual([TIMEOUT_MS]);
  });
});

describe('reactionEngine - la partida completa', () => {
  const playAttempt = (state: ReturnType<typeof createReactionGame>, ms: number) => {
    const go = advance(state, state.goAt, shortest);
    const shown = tap(go, go.goAt + ms, shortest);
    return { shown, now: go.goAt + ms };
  };

  it('tras la pausa empieza el siguiente intento', () => {
    const first = playAttempt(createReactionGame(0, shortest), 200);

    const next = advance(first.shown, first.now + PAUSE_MS, shortest);

    expect(next.phase).toBe('waiting');
    expect(next.attempt).toBe(2);
  });

  it('termina tras 5 intentos con la media en ms', () => {
    expect(ATTEMPTS).toBe(5);
    let state = createReactionGame(0, shortest);
    let now: number;
    for (const ms of [200, 220, 240, 260, 280]) {
      const played = playAttempt(state, ms);
      now = played.now + PAUSE_MS;
      state = advance(played.shown, now, shortest);
    }

    expect(state.phase).toBe('done');
    expect(averageMs(state.times)).toBe(240);
  });

  it('ignora los toques durante la pausa y cuando ya ha terminado', () => {
    const first = playAttempt(createReactionGame(0, shortest), 200);

    const stillShown = tap(first.shown, first.now + 100, shortest);

    expect(stillShown).toBe(first.shown);
  });
});
