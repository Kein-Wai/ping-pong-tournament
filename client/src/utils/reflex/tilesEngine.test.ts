import { describe, expect, it } from 'vitest';
import {
  GAP_MS,
  GAME_DURATION_MS,
  TILE_COUNT,
  advance,
  createTilesGame,
  isTilesOver,
  litDurationMs,
  scoreOf,
  tapTile,
} from './tilesEngine';

const first = () => 0;

describe('litDurationMs', () => {
  it('empieza en 1200 ms y baja 40 ms por cada acierto', () => {
    expect(litDurationMs(0)).toBe(1200);
    expect(litDurationMs(1)).toBe(1160);
    expect(litDurationMs(10)).toBe(800);
  });

  it('no baja de 400 ms por muchos aciertos que haya', () => {
    expect(litDurationMs(20)).toBe(400);
    expect(litDurationMs(100)).toBe(400);
  });
});

describe('tilesEngine - encendido de tejas', () => {
  it('al empezar no hay ninguna teja encendida y la cuadrícula es de 16', () => {
    const game = createTilesGame(1000);

    expect(TILE_COUNT).toBe(16);
    expect(game.litTile).toBeNull();
    expect(game.hits).toBe(0);
    expect(game.misses).toBe(0);
  });

  it('no enciende ninguna teja antes de que pase la pausa inicial', () => {
    const game = advance(createTilesGame(1000), 1000 + GAP_MS - 1, first);

    expect(game.litTile).toBeNull();
  });

  it('enciende una teja cuando pasa la pausa', () => {
    const game = advance(createTilesGame(1000), 1000 + GAP_MS, first);

    expect(game.litTile).toBe(0);
  });

  it('la teja nueva nunca es la misma que la anterior', () => {
    let game = advance(createTilesGame(0), GAP_MS, first);
    expect(game.litTile).toBe(0);

    game = tapTile(game, 0, GAP_MS + 100);
    game = advance(game, GAP_MS + 100 + GAP_MS, first);

    expect(game.litTile).toBe(1);
  });
});

describe('tilesEngine - aciertos y fallos', () => {
  const lit = () => advance(createTilesGame(0), GAP_MS, first); // teja 0 encendida en t=250

  it('tocar la teja encendida suma un acierto y la apaga', () => {
    const game = tapTile(lit(), 0, 400);

    expect(game.hits).toBe(1);
    expect(game.misses).toBe(0);
    expect(game.litTile).toBeNull();
  });

  it('tocar otra teja mientras hay una encendida cuenta como fallo y no apaga la encendida', () => {
    const game = tapTile(lit(), 5, 400);

    expect(game.misses).toBe(1);
    expect(game.hits).toBe(0);
    expect(game.litTile).toBe(0);
  });

  it('tocar una teja apagada durante la pausa cuenta como fallo', () => {
    const game = tapTile(createTilesGame(0), 3, 100);

    expect(game.misses).toBe(1);
  });

  it('si la teja se apaga sin que la toquen, cuenta como fallo', () => {
    const game = advance(lit(), GAP_MS + litDurationMs(0), first);

    expect(game.misses).toBe(1);
    expect(game.litTile).toBeNull();
  });

  it('tocar la teja justo cuando ya ha caducado, aunque el reloj no haya avanzado, no es un acierto', () => {
    const game = tapTile(lit(), 0, GAP_MS + litDurationMs(0));

    expect(game.hits).toBe(0);
    expect(game.misses).toBeGreaterThanOrEqual(1);
    expect(game.litTile).toBeNull();
  });

  it('una teja sigue encendida hasta el último milisegundo de su tiempo', () => {
    const game = advance(lit(), GAP_MS + litDurationMs(0) - 1, first);

    expect(game.litTile).toBe(0);
    expect(game.misses).toBe(0);
  });

  it('tras apagarse sin acierto, la siguiente teja se enciende después de la pausa', () => {
    const expiredAt = GAP_MS + litDurationMs(0);
    const afterExpire = advance(lit(), expiredAt, first);

    expect(advance(afterExpire, expiredAt + GAP_MS - 1, first).litTile).toBeNull();
    expect(advance(afterExpire, expiredAt + GAP_MS, first).litTile).toBe(1);
  });

  it('cada acierto acorta el tiempo que dura encendida la siguiente teja', () => {
    const afterHit = tapTile(lit(), 0, 400);
    const nextLitAt = 400 + GAP_MS;
    const next = advance(afterHit, nextLitAt, first);

    expect(next.litUntil).toBe(nextLitAt + litDurationMs(1));
  });
});

describe('scoreOf', () => {
  const game = (hits: number, misses: number) => ({ ...createTilesGame(0), hits, misses });

  it('son los aciertos menos los fallos', () => {
    expect(scoreOf(game(5, 2))).toBe(3);
    expect(scoreOf(game(7, 0))).toBe(7);
  });

  it('nunca baja de 0 por muchos fallos que haya', () => {
    expect(scoreOf(game(1, 4))).toBe(0);
    expect(scoreOf(game(0, 0))).toBe(0);
  });
});

describe('tilesEngine - fin de la partida', () => {
  it('después de terminar no se encienden más tejas ni se cuentan toques', () => {
    const over = GAME_DURATION_MS + 1;
    const game = createTilesGame(0);

    expect(advance(game, over, first).litTile).toBeNull();
    expect(tapTile(game, 0, over).misses).toBe(0);
  });

  it('termina a los 30 s y no antes', () => {
    const game = createTilesGame(5000);

    expect(isTilesOver(game, 5000 + GAME_DURATION_MS - 1)).toBe(false);
    expect(isTilesOver(game, 5000 + GAME_DURATION_MS)).toBe(true);
  });
});
