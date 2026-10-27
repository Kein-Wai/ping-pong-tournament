import type { RecordDirection } from '../utils/reflex/reflexRecords';

export interface ReflexGame {
  /** Identifica el juego en la URL y en la clave del récord. */
  slug: string;
  name: string;
  description: string;
  /** Reglas que se leen antes de empezar la partida. */
  instructions: string;
  /** Si en el récord mejor es un resultado mayor o menor. */
  direction: RecordDirection;
  /** Cómo se muestra un resultado o un récord de este juego, con su unidad y su plural. */
  formatScore: (value: number) => string;
}

const formatPoints = (value: number) => `${value} ${value === 1 ? 'punto' : 'puntos'}`;

// Un juego solo entra en la lista cuando está implementado: el selector y la ruta salen de aquí.
export const REFLEX_GAMES = [
  {
    slug: 'tejas',
    name: 'Tejas',
    description: 'Toca cada teja en cuanto se ilumine, antes de que se apague. Cada acierto la acelera.',
    instructions:
      'Se ilumina una teja cada vez: tócala antes de que se apague. Cada acierto hace que la siguiente dure menos. Tocar una teja apagada o dejar que se apague es un fallo y resta un acierto. Pulsar a ciegas no compensa. La partida dura 30 segundos y puntúa aciertos menos fallos.',
    direction: 'higher',
    formatScore: formatPoints,
  },
  {
    slug: 'reaccion-simple',
    name: 'Reacción simple',
    description: 'Toca en cuanto la pantalla se ponga verde. Mide cuántos milisegundos tardas.',
    instructions:
      'La pantalla está en rojo y, tras una espera de entre 1 y 4 segundos, se pone verde: tócala lo antes posible. Son 5 intentos y tu resultado es la media en milisegundos. Si tocas antes de la señal es una salida en falso y el intento se repite. Si pasan 1,5 segundos sin tocar, el intento cuenta 1.500 ms.',
    direction: 'lower',
    formatScore: (value) => `${value} ms`,
  },
  {
    slug: 'go-no-go',
    name: 'Go / No-Go',
    description: 'Toca los círculos verdes y deja pasar los rojos. Decide rápido, cada vez con menos tiempo.',
    instructions:
      'Aparece un círculo cada vez en un tablero de 9 casillas: si es verde, tócalo; si es rojo, déjalo pasar. Tocar un rojo o dejar escapar un verde resta un punto, y tocar una casilla vacía no cuenta. Cada círculo dura menos que el anterior. La partida dura 30 segundos y puntúa aciertos menos errores.',
    direction: 'higher',
    formatScore: formatPoints,
  },
  {
    slug: 'ping-pong',
    name: 'Ping Pong',
    description: 'Devuelve la pelota con tu barra. Cada rebote la hace más rápida.',
    instructions:
      'Mueve el dedo o el ratón por el campo (o usa las flechas del teclado) para llevar tu barra, la de abajo, bajo la pelota. Cada rebote en tu barra la acelera, y según dónde la golpees saldrá más recta o más abierta. La barra de arriba es una pared: nunca falla. La partida termina cuando la pelota pasa de largo y puntúan los rebotes que hayas conseguido.',
    direction: 'higher',
    formatScore: (value) => `${value} ${value === 1 ? 'rebote' : 'rebotes'}`,
  },
  {
    slug: 'timing',
    name: 'Timing',
    description: 'Golpea la pelota justo cuando vuelva a la raqueta. Cada vez cae más rápido.',
    instructions:
      'Una pelota sube y vuelve a bajar sobre tu raqueta: toca la pantalla (o pulsa espacio) justo cuando la alcance. Tras cada golpe verás cuántos milisegundos te adelantaste o retrasaste. Un golpe perfecto, a menos de 40 ms, da 10 puntos; cuanto más lejos del impacto, menos puntos. Son 10 pelotas, cada una más rápida que la anterior, y puntúa la suma de todas.',
    direction: 'higher',
    formatScore: formatPoints,
  },
] as const satisfies readonly ReflexGame[];

export type KnownReflexGame = (typeof REFLEX_GAMES)[number];
/** Slugs de los juegos del catálogo, para que otros registros se vean obligados a cubrirlos todos. */
export type ReflexSlug = KnownReflexGame['slug'];

export function findReflexGame(slug: string | undefined): KnownReflexGame | undefined {
  return REFLEX_GAMES.find((game) => game.slug === slug);
}
