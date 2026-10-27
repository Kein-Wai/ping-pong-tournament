// Coordenadas del campo: la altura mide 1 y el ancho 0,75 (proporción 3:4). Las velocidades se
// expresan en alturas por segundo, así que el motor no depende del tamaño en píxeles.
export const FIELD_WIDTH = 0.75;
export const FIELD_HEIGHT = 1;
export const BALL_RADIUS = 0.025;
/** La barra del jugador mide un cuarto del ancho del campo. */
export const BAR_WIDTH = FIELD_WIDTH * 0.25;
export const BAR_THICKNESS = 0.02;
/** Borde superior de la barra del jugador: la pelota rebota cuando su borde inferior lo cruza. */
export const BAR_Y = 0.94;
export const INITIAL_SPEED = 0.6;
export const MAX_SPEED = 2.5;

const SPEED_GAIN = 1.04;
const MAX_LAUNCH_ANGLE = Math.PI / 6;
const MAX_BOUNCE_ANGLE = Math.PI / 3;
// Tras una pausa larga (pestaña en segundo plano) el tiempo se recorta para no teletransportar la pelota.
const MAX_STEP_MS = 50;

export interface PingPongState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Módulo de la velocidad: sube un 4 % con cada rebote en la barra del jugador. */
  speed: number;
  bounces: number;
  over: boolean;
}

/** Centro de la barra, ajustado para que la barra entera quede dentro del campo. */
export function clampBarX(x: number): number {
  return Math.min(FIELD_WIDTH - BAR_WIDTH / 2, Math.max(BAR_WIDTH / 2, x));
}

/** Lanza la pelota desde el centro hacia abajo; `random` devuelve un número en [0, 1). */
export function createPingPongGame(random: () => number): PingPongState {
  const angle = (random() * 2 - 1) * MAX_LAUNCH_ANGLE;
  return {
    x: FIELD_WIDTH / 2,
    y: FIELD_HEIGHT / 2,
    vx: INITIAL_SPEED * Math.sin(angle),
    vy: INITIAL_SPEED * Math.cos(angle),
    speed: INITIAL_SPEED,
    bounces: 0,
    over: false,
  };
}

/** Avanza la pelota `dtMs` milisegundos con la barra del jugador centrada en `barX`. */
export function step(state: PingPongState, dtMs: number, barX: number): PingPongState {
  if (state.over) return state;

  const dt = Math.min(dtMs, MAX_STEP_MS) / 1000;
  const bar = clampBarX(barX);
  let { vx, vy, speed, bounces } = state;
  let x = state.x + vx * dt;
  let y = state.y + vy * dt;

  if (x - BALL_RADIUS < 0) {
    x = BALL_RADIUS;
    vx = Math.abs(vx);
  }
  if (x + BALL_RADIUS > FIELD_WIDTH) {
    x = FIELD_WIDTH - BALL_RADIUS;
    vx = -Math.abs(vx);
  }
  if (y - BALL_RADIUS < 0) {
    y = BALL_RADIUS;
    vy = Math.abs(vy);
  }

  // Se detecta que el borde inferior cruza la barra durante el paso, no que esté sobre ella: a la
  // velocidad máxima la pelota recorre más que el grosor de la barra en un solo paso.
  const crossesBar = vy > 0 && state.y + BALL_RADIUS <= BAR_Y && y + BALL_RADIUS >= BAR_Y;
  if (crossesBar && Math.abs(x - bar) <= BAR_WIDTH / 2 + BALL_RADIUS) {
    // Pegar en el centro la devuelve recta y pegar en los extremos la abre hasta 60°.
    const offset = Math.max(-1, Math.min(1, (x - bar) / (BAR_WIDTH / 2)));
    const angle = offset * MAX_BOUNCE_ANGLE;
    speed = Math.min(MAX_SPEED, speed * SPEED_GAIN);
    vx = speed * Math.sin(angle);
    vy = -speed * Math.cos(angle);
    y = BAR_Y - BALL_RADIUS;
    bounces += 1;
  }

  return { x, y, vx, vy, speed, bounces, over: y - BALL_RADIUS > FIELD_HEIGHT };
}
