import { describe, expect, it } from 'vitest';
import {
  BALLS,
  PAUSE_MS,
  advance,
  averageDeviationMs,
  createTimingGame,
  evaluateShot,
  flightMsOf,
  scoreOf,
  tap,
  type TimingState,
} from './timingEngine';

describe('flightMsOf', () => {
  it('la primera pelota tarda 1800 ms y cada una 120 ms menos', () => {
    expect(flightMsOf(0)).toBe(1800);
    expect(flightMsOf(1)).toBe(1680);
    expect(flightMsOf(9)).toBe(720);
  });

  it('nunca baja de 700 ms', () => {
    expect(flightMsOf(10)).toBe(700);
    expect(flightMsOf(50)).toBe(700);
  });
});

describe('evaluateShot', () => {
  it.each([
    [0, 'perfect', 10],
    [40, 'perfect', 10],
    [-40, 'perfect', 10],
    [41, 'good', 6],
    [-100, 'good', 6],
    [100, 'good', 6],
    [101, 'late', 3],
    [-101, 'early', 3],
    [200, 'late', 3],
    [-200, 'early', 3],
    [201, 'late', 1],
    [-350, 'early', 1],
    [350, 'late', 1],
    [351, 'too-late', 0],
    [-351, 'too-early', 0],
    [-1500, 'too-early', 0],
  ])('una desviación de %i ms es «%s» y vale %i puntos', (deviation, quality, points) => {
    expect(evaluateShot(deviation)).toEqual({ quality, points });
  });
});

describe('averageDeviationMs', () => {
  it('es la media de las desviaciones sin signo, redondeada', () => {
    expect(averageDeviationMs([{ deviationMs: -30 }, { deviationMs: 50 }, { deviationMs: 10 }])).toBe(30);
  });

  it('ignora las pelotas sin golpe y es null si no hubo ningún golpe', () => {
    expect(averageDeviationMs([{ deviationMs: 40 }, { deviationMs: null }])).toBe(40);
    expect(averageDeviationMs([{ deviationMs: null }])).toBeNull();
    expect(averageDeviationMs([])).toBeNull();
  });
});

describe('timingEngine - una pelota', () => {
  it('empieza con la primera pelota en vuelo y el impacto tras 1800 ms', () => {
    const game = createTimingGame(1000);

    expect(game.phase).toBe('flying');
    expect(game.ball).toBe(1);
    expect(game.launchAt).toBe(1000);
    expect(game.impactAt).toBe(2800);
    expect(game.results).toEqual([]);
  });

  it('tocar justo en el impacto es perfecto, con 0 ms de desviación', () => {
    const shown = tap(createTimingGame(0), 1800);

    expect(shown.phase).toBe('shown');
    expect(shown.results).toEqual([{ deviationMs: 0, quality: 'perfect', points: 10 }]);
  });

  it('tocar antes da desviación negativa y tocar después, positiva', () => {
    const early = tap(createTimingGame(0), 1800 - 130);
    const late = tap(createTimingGame(0), 1800 + 75);

    expect(early.results[0]).toEqual({ deviationMs: -130, quality: 'early', points: 3 });
    expect(late.results[0]).toEqual({ deviationMs: 75, quality: 'good', points: 6 });
  });

  it('un toque muy anticipado resuelve la pelota como «demasiado pronto»', () => {
    const shown = tap(createTimingGame(0), 100);

    expect(shown.results[0]).toEqual({ deviationMs: -1700, quality: 'too-early', points: 0 });
  });

  it('si nadie toca, la pelota se resuelve 350 ms después del impacto como «demasiado tarde» sin desviación', () => {
    const game = createTimingGame(0);

    expect(advance(game, 1800 + 350).phase).toBe('flying');
    const missed = advance(game, 1800 + 351);

    expect(missed.phase).toBe('shown');
    expect(missed.results).toEqual([{ deviationMs: null, quality: 'too-late', points: 0 }]);
  });

  it('un segundo toque mientras se muestra el resultado se ignora', () => {
    const shown = tap(createTimingGame(0), 1800);

    expect(tap(shown, 1900)).toBe(shown);
  });
});

describe('timingEngine - la partida completa', () => {
  // Juega una pelota golpeándola con la desviación indicada y espera a que pase la pausa.
  const play = (state: TimingState, deviation: number) => {
    const shown = tap(state, state.impactAt + deviation);
    const resumeAt = state.impactAt + deviation + PAUSE_MS;
    return { state: advance(shown, resumeAt) };
  };

  it('tras la pausa lanza la siguiente pelota, más rápida', () => {
    const { state } = play(createTimingGame(0), 0);

    expect(state.phase).toBe('flying');
    expect(state.ball).toBe(2);
    expect(state.impactAt - state.launchAt).toBe(1680);
  });

  it('termina tras 10 pelotas y suma los puntos de todas', () => {
    expect(BALLS).toBe(10);
    let state = createTimingGame(0);
    for (let ball = 0; ball < BALLS; ball += 1) state = play(state, 0).state;

    expect(state.phase).toBe('done');
    expect(state.results).toHaveLength(10);
    expect(scoreOf(state)).toBe(100);
  });

  it('puntúa cada pelota según su golpe', () => {
    const deviations = [0, 30, -80, 150, -300, 500, 0, 0, 0, 0];
    let state = createTimingGame(0);
    for (const deviation of deviations) state = play(state, deviation).state;

    // 10 + 10 + 6 + 3 + 1 + 0 + 10 + 10 + 10 + 10
    expect(scoreOf(state)).toBe(70);
  });

  it('no hace nada una vez terminada', () => {
    let state = createTimingGame(0);
    for (let ball = 0; ball < BALLS; ball += 1) state = play(state, 0).state;

    expect(advance(state, 999_999)).toBe(state);
    expect(tap(state, 999_999)).toBe(state);
  });
});
