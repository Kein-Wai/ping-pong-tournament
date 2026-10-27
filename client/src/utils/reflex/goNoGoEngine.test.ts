import { describe, expect, it } from 'vitest';
import {
  CELL_COUNT,
  GAME_DURATION_MS,
  GAP_MS,
  advance,
  createGoNoGoGame,
  isGoNoGoOver,
  scoreOf,
  tapCell,
  visibleMsOf,
} from './goNoGoEngine';

// El primer valor decide el color (verde si < 0,7) y el segundo la casilla.
const sequence = (...values: number[]) => {
  let index = 0;
  return () => values[index++ % values.length];
};
const green = sequence(0.1, 0);
const red = sequence(0.9, 0);

describe('visibleMsOf', () => {
  it('empieza en 1000 ms y baja 20 ms por cada círculo ya mostrado', () => {
    expect(visibleMsOf(0)).toBe(1000);
    expect(visibleMsOf(1)).toBe(980);
    expect(visibleMsOf(10)).toBe(800);
  });

  it('no baja de 500 ms', () => {
    expect(visibleMsOf(25)).toBe(500);
    expect(visibleMsOf(100)).toBe(500);
  });
});

describe('goNoGoEngine - aparición de círculos', () => {
  it('empieza sin ningún círculo y con 9 casillas', () => {
    const game = createGoNoGoGame(0);

    expect(CELL_COUNT).toBe(9);
    expect(game.cell).toBeNull();
    expect(scoreOf(game)).toBe(0);
  });

  it('no muestra nada antes de la pausa y sí justo al terminar', () => {
    const game = createGoNoGoGame(0);

    expect(advance(game, GAP_MS - 1, green).cell).toBeNull();
    expect(advance(game, GAP_MS, green).cell).toBe(0);
  });

  it('es verde con un valor aleatorio menor que 0,7 y rojo con 0,7 o más', () => {
    expect(advance(createGoNoGoGame(0), GAP_MS, sequence(0.69, 0)).color).toBe('go');
    expect(advance(createGoNoGoGame(0), GAP_MS, sequence(0.7, 0)).color).toBe('nogo');
  });

  it('el círculo siguiente nunca aparece en la misma casilla que el anterior', () => {
    let game = advance(createGoNoGoGame(0), GAP_MS, green);
    expect(game.cell).toBe(0);

    game = tapCell(game, 0, GAP_MS + 100);
    game = advance(game, GAP_MS + 100 + GAP_MS, green);

    expect(game.cell).toBe(1);
  });

  it('cada círculo dura menos que el anterior, se acierte o no', () => {
    const first = advance(createGoNoGoGame(0), GAP_MS, green);
    expect(first.visibleUntil).toBe(GAP_MS + visibleMsOf(0));

    const afterTap = tapCell(first, 0, GAP_MS + 100);
    const second = advance(afterTap, GAP_MS + 100 + GAP_MS, green);

    expect(second.visibleUntil).toBe(GAP_MS + 100 + GAP_MS + visibleMsOf(1));
  });
});

describe('goNoGoEngine - toques', () => {
  const withGreen = () => advance(createGoNoGoGame(0), GAP_MS, green);
  const withRed = () => advance(createGoNoGoGame(0), GAP_MS, red);

  it('tocar un círculo verde suma un acierto y lo quita', () => {
    const game = tapCell(withGreen(), 0, 400);

    expect(game.hits).toBe(1);
    expect(game.cell).toBeNull();
    expect(scoreOf(game)).toBe(1);
  });

  it('tocar un círculo rojo cuenta como error y lo quita', () => {
    const game = tapCell(withRed(), 0, 400);

    expect(game.wrongTaps).toBe(1);
    expect(game.hits).toBe(0);
    expect(game.cell).toBeNull();
  });

  it('tocar una casilla vacía no hace nada', () => {
    const before = withGreen();

    expect(tapCell(before, 5, 400)).toBe(before);
  });

  it('un círculo ya tocado no se puede volver a tocar', () => {
    const tapped = tapCell(withGreen(), 0, 400);

    expect(tapCell(tapped, 0, 410)).toBe(tapped);
  });
});

describe('goNoGoEngine - círculos que se agotan', () => {
  it('un verde que se deja pasar cuenta como fallo', () => {
    const game = advance(advance(createGoNoGoGame(0), GAP_MS, green), GAP_MS + visibleMsOf(0), green);

    expect(game.missed).toBe(1);
    expect(game.cell).toBeNull();
  });

  it('un rojo que se deja pasar es lo correcto y no resta nada', () => {
    const game = advance(advance(createGoNoGoGame(0), GAP_MS, red), GAP_MS + visibleMsOf(0), red);

    expect(game.missed).toBe(0);
    expect(game.wrongTaps).toBe(0);
    expect(game.cell).toBeNull();
  });

  it('el círculo sigue visible hasta el último milisegundo de su tiempo', () => {
    const shown = advance(createGoNoGoGame(0), GAP_MS, green);

    expect(advance(shown, GAP_MS + visibleMsOf(0) - 1, green).cell).toBe(0);
  });

  it('tocar un verde justo cuando ya caducó, antes del siguiente tick, no es acierto', () => {
    const shown = advance(createGoNoGoGame(0), GAP_MS, green);

    const game = tapCell(shown, 0, GAP_MS + visibleMsOf(0));

    expect(game.hits).toBe(0);
    expect(game.missed).toBe(1);
  });
});

describe('scoreOf', () => {
  const game = (hits: number, wrongTaps: number, missed: number) => ({
    ...createGoNoGoGame(0),
    hits,
    wrongTaps,
    missed,
  });

  it('son los aciertos menos los errores y los verdes perdidos', () => {
    expect(scoreOf(game(8, 2, 1))).toBe(5);
    expect(scoreOf(game(4, 0, 0))).toBe(4);
  });

  it('nunca baja de 0', () => {
    expect(scoreOf(game(1, 3, 2))).toBe(0);
  });
});

describe('goNoGoEngine - fin de la partida', () => {
  it('termina a los 30 s y no antes', () => {
    const game = createGoNoGoGame(5000);

    expect(isGoNoGoOver(game, 5000 + GAME_DURATION_MS - 1)).toBe(false);
    expect(isGoNoGoOver(game, 5000 + GAME_DURATION_MS)).toBe(true);
  });

  it('después de terminar no aparecen círculos ni se cuentan toques', () => {
    const shown = advance(createGoNoGoGame(0), GAP_MS, green);
    const over = GAME_DURATION_MS + 1;

    expect(advance(createGoNoGoGame(0), over, green).cell).toBeNull();
    expect(tapCell(shown, 0, over)).toBe(shown);
  });
});
