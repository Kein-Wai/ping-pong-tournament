/**
 * Catálogo fijo de ejercicios de calentamiento (ver GLOSSARY.md).
 *
 * Vive en el cliente porque son contenido propio de la app, no datos de usuario:
 * en la base de datos solo se guarda la rutina de cada jugador, referida a estos
 * ejercicios por su `key`. La API valida las mismas claves (ver `warmupRoutine`
 * en `api/src/schemas`); si se añade o renombra una, hay que cambiar las dos.
 */

export const WARMUP_EXERCISE_KEYS = [
  'estiramientos',
  'movilidad',
  'derecha-derecha',
  'reves-reves',
  'top-derecha',
  'top-reves',
  'sensibilidad',
  'saque-entrada',
  'drill-libre',
] as const;

export type WarmupExerciseKey = (typeof WARMUP_EXERCISE_KEYS)[number];

export interface WarmupExercise {
  key: WarmupExerciseKey;
  name: string;
  /** Frase corta que acompaña a la animación durante la sesión. */
  description: string;
  /** Si hace falta mesa libre: condiciona el descanso por defecto. */
  needsTable: boolean;
  defaultDurationSec: number;
  defaultRestSec: number;
}

const DEFAULT_DURATION_SEC = 60;
// Sin mesa basta con cambiar de sitio; con mesa a veces hay que esperar a que quede libre.
const REST_WITHOUT_TABLE_SEC = 10;
const REST_WITH_TABLE_SEC = 30;

type WarmupExerciseContent = Pick<WarmupExercise, 'key' | 'name' | 'description' | 'needsTable'>;

const EXERCISE_CONTENT: readonly WarmupExerciseContent[] = [
  {
    key: 'estiramientos',
    name: 'Estiramientos',
    description: 'Estira cuello, hombros, brazos, espalda y piernas con movimientos suaves y sin rebotes.',
    needsTable: false,
  },
  {
    key: 'movilidad',
    name: 'Movilidad sin raqueta',
    description: 'Corre en el sitio o salta a la comba y mueve brazos y piernas para activar todo el cuerpo.',
    needsTable: false,
  },
  {
    key: 'derecha-derecha',
    name: 'Derecha a Derecha',
    description: 'Peloteo básico con el golpe de derecha: devuelve siempre la bola con control y constancia.',
    needsTable: true,
  },
  {
    key: 'reves-reves',
    name: 'Revés a Revés',
    description: 'Peloteo básico con el golpe de revés: busca ritmo y regularidad antes que fuerza.',
    needsTable: true,
  },
  {
    key: 'top-derecha',
    name: 'Top de Derecha',
    description: 'Golpea de abajo arriba rozando la bola para darle efecto liftado; el brazo termina arriba.',
    needsTable: true,
  },
  {
    key: 'top-reves',
    name: 'Top de Revés',
    description: 'Lo mismo con el revés: la raqueta sube rozando la bola por arriba con antebrazo y muñeca.',
    needsTable: true,
  },
  {
    key: 'sensibilidad',
    name: 'Juego de sensibilidad',
    description: 'Controla la bola sobre la raqueta sin que se escape: varía la altura para ganar tacto.',
    needsTable: true,
  },
  {
    key: 'saque-entrada',
    name: 'Saque y entrada',
    description: 'Practica tu saque y la primera bola de ataque justo después, como en el partido.',
    needsTable: true,
  },
  {
    key: 'drill-libre',
    name: 'Drill en el momento',
    description: 'Tiempo libre: trabaja lo que necesites ahora mismo, sin ejercicio fijo.',
    needsTable: true,
  },
];

export const WARMUP_EXERCISES: readonly WarmupExercise[] = EXERCISE_CONTENT.map((exercise) => ({
  ...exercise,
  defaultDurationSec: DEFAULT_DURATION_SEC,
  defaultRestSec: exercise.needsTable ? REST_WITH_TABLE_SEC : REST_WITHOUT_TABLE_SEC,
}));

export const WARMUP_EXERCISES_BY_KEY: Readonly<Record<WarmupExerciseKey, WarmupExercise>> =
  Object.fromEntries(WARMUP_EXERCISES.map((exercise) => [exercise.key, exercise])) as Record<
    WarmupExerciseKey,
    WarmupExercise
  >;
