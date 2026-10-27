import { describe, expect, it } from 'vitest';
import {
  BALL_RADIUS,
  BAR_WIDTH,
  BAR_Y,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  INITIAL_SPEED,
  MAX_SPEED,
  clampBarX,
  createPingPongGame,
  step,
  type PingPongState,
} from './pingPongEngine';

const straight = () => 0.5;
const center = FIELD_WIDTH / 2;

// Parte de una pelota recta hacia abajo y deja cambiar lo que cada test necesita.
const ball = (overrides: Partial<PingPongState> = {}): PingPongState => ({
  ...createPingPongGame(straight),
  ...overrides,
});

describe('createPingPongGame', () => {
  it('lanza la pelota desde el centro del campo hacia abajo a la velocidad inicial', () => {
    const game = createPingPongGame(straight);

    expect(game.x).toBeCloseTo(center);
    expect(game.y).toBeCloseTo(FIELD_HEIGHT / 2);
    expect(game.vx).toBeCloseTo(0);
    expect(game.vy).toBeCloseTo(INITIAL_SPEED);
    expect(game.bounces).toBe(0);
    expect(game.over).toBe(false);
  });

  it('el ángulo de salida llega como mucho a 30° de la vertical, a cada lado', () => {
    const left = createPingPongGame(() => 0);
    const right = createPingPongGame(() => 1);

    expect(left.vx).toBeCloseTo(-INITIAL_SPEED * Math.sin(Math.PI / 6));
    expect(right.vx).toBeCloseTo(INITIAL_SPEED * Math.sin(Math.PI / 6));
    expect(left.vy).toBeGreaterThan(0);
    expect(Math.hypot(left.vx, left.vy)).toBeCloseTo(INITIAL_SPEED);
  });
});

describe('clampBarX', () => {
  it('mantiene la barra entera dentro del campo', () => {
    expect(clampBarX(-1)).toBeCloseTo(BAR_WIDTH / 2);
    expect(clampBarX(5)).toBeCloseTo(FIELD_WIDTH - BAR_WIDTH / 2);
    expect(clampBarX(center)).toBeCloseTo(center);
  });

  it('la barra mide un cuarto del ancho del campo', () => {
    expect(BAR_WIDTH).toBeCloseTo(FIELD_WIDTH * 0.25);
  });
});

describe('pingPongEngine - movimiento y paredes', () => {
  it('avanza la pelota según su velocidad y el tiempo transcurrido', () => {
    const next = step(ball(), 40, center);

    expect(next.y).toBeCloseTo(FIELD_HEIGHT / 2 + INITIAL_SPEED * 0.04);
    expect(next.x).toBeCloseTo(center);
  });

  it('rebota en la pared derecha y en la izquierda', () => {
    const right = step(ball({ x: FIELD_WIDTH - BALL_RADIUS, vx: 0.5, vy: 0.3 }), 50, center);
    const left = step(ball({ x: BALL_RADIUS, vx: -0.5, vy: 0.3 }), 50, center);

    expect(right.vx).toBeLessThan(0);
    expect(left.vx).toBeGreaterThan(0);
  });

  it('rebota en la pared de arriba, que es la barra de la máquina, sin perder velocidad', () => {
    const next = step(ball({ y: BALL_RADIUS, vx: 0, vy: -0.6, speed: 0.6 }), 50, center);

    expect(next.vy).toBeCloseTo(0.6);
    expect(next.speed).toBeCloseTo(0.6);
    expect(next.bounces).toBe(0);
  });
});

describe('pingPongEngine - tu barra', () => {
  const justAbove = { y: BAR_Y - BALL_RADIUS - 0.005, vx: 0, vy: 0.6, speed: 0.6 };

  it('devuelve la pelota hacia arriba, suma un rebote y la acelera un 4 %', () => {
    const next = step(ball(justAbove), 50, center);

    expect(next.vy).toBeLessThan(0);
    expect(next.bounces).toBe(1);
    expect(next.speed).toBeCloseTo(0.6 * 1.04);
    expect(Math.hypot(next.vx, next.vy)).toBeCloseTo(0.6 * 1.04);
  });

  it('al pegar en el centro de la barra la pelota sale recta', () => {
    const next = step(ball(justAbove), 50, center);

    expect(next.vx).toBeCloseTo(0);
  });

  it('en el extremo derecho de la barra sale abierta 60° hacia la derecha, y en el izquierdo hacia la izquierda', () => {
    const barX = clampBarX(center);
    const atRightEnd = step(ball({ ...justAbove, x: barX + BAR_WIDTH / 2 }), 50, barX);
    const atLeftEnd = step(ball({ ...justAbove, x: barX - BAR_WIDTH / 2 }), 50, barX);
    const speed = 0.6 * 1.04;

    expect(atRightEnd.vx).toBeCloseTo(speed * Math.sin(Math.PI / 3));
    expect(atLeftEnd.vx).toBeCloseTo(-speed * Math.sin(Math.PI / 3));
  });

  it('no supera la velocidad máxima por muchos rebotes que lleve', () => {
    const next = step(ball({ ...justAbove, vy: 2.45, speed: 2.45 }), 10, center);

    expect(next.speed).toBeCloseTo(MAX_SPEED);
    expect(Math.hypot(next.vx, next.vy)).toBeCloseTo(MAX_SPEED);
  });

  it('no atraviesa la barra aunque el paso de tiempo sea grande y la pelota rápida', () => {
    const next = step(ball({ y: BAR_Y - 0.1, vx: 0, vy: 2.5, speed: 2.5 }), 50, center);

    expect(next.bounces).toBe(1);
    expect(next.over).toBe(false);
  });
});

describe('pingPongEngine - fallar', () => {
  it('si la barra está lejos, la pelota la pasa y la partida termina al salir del campo', () => {
    let game = ball({ x: 0.1, y: BAR_Y - 0.1, vx: 0, vy: 0.6, speed: 0.6 });
    const farBar = clampBarX(FIELD_WIDTH);

    for (let i = 0; i < 60 && !game.over; i += 1) game = step(game, 16, farBar);

    expect(game.over).toBe(true);
    expect(game.bounces).toBe(0);
  });

  it('una vez terminada, la partida ya no cambia', () => {
    const over = ball({ over: true, bounces: 7 });

    expect(step(over, 16, center)).toBe(over);
  });
});

describe('pingPongEngine - pasos de tiempo largos', () => {
  it('trata un paso enorme (pestaña en segundo plano) como uno de 50 ms para no teletransportar la pelota', () => {
    const next = step(ball(), 5000, center);

    expect(next.y).toBeCloseTo(FIELD_HEIGHT / 2 + INITIAL_SPEED * 0.05);
  });
});
