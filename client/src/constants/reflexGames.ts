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

// Un juego solo entra en la lista cuando está implementado: el selector y la ruta salen de aquí.
export const REFLEX_GAMES: readonly ReflexGame[] = [
  {
    slug: 'tejas',
    name: 'Tejas',
    description: 'Toca cada teja en cuanto se ilumine, antes de que se apague. Cada acierto la acelera.',
    instructions:
      'Se ilumina una teja cada vez: tócala antes de que se apague. Cada acierto hace que la siguiente dure menos. Tocar una teja apagada o dejar que se apague es un fallo y resta un acierto. Pulsar a ciegas no compensa. La partida dura 30 segundos y puntúa aciertos menos fallos.',
    direction: 'higher',
    formatScore: (value) => `${value} ${value === 1 ? 'punto' : 'puntos'}`,
  },
];

export function findReflexGame(slug: string | undefined): ReflexGame | undefined {
  return REFLEX_GAMES.find((game) => game.slug === slug);
}
