// api/src/constants.ts

export const STATUS = {
  SCHEDULE: 'Programado',
  OPEN: 'Abierto',
  STARTED: 'Inicidado',
  COMPLETED: 'Completado',
} as const;

export const ROUNDS = {
  GROUPS: 'Grupos',
  KNOCKOUTS: 'Eliminatorias',
} as const;

export const POINTS_ROUNDS = {
  champion: 30,
  'runner-up': 25,
  third: 21,
  'quarter-finals': 17,
  'round-of-16': 13,
  'round-of-32': 10,
  'round-of-64': 8,
  'round-of-128': 6,
  'round-of-256': 4,
} as const;

// En JS/TS las claves de los objetos siempre son strings por debajo,
// aunque las escribas como números.
export const POINTS_MATCHES = {
  '750': [1, 28],
  '249': [2, 26],
  '99': [4, 22],
  '49': [7, 16],
  '24': [9, 12],
} as const;

export const POINTS_LOST_GROUP_MATCH = -2;

export const KNOCKOUT_TYPE = {
  A: 'Llave A',
  AB: 'Llave A y B',
} as const;

export const KNOCKOUT_QUALIFY_PLAYERS = [2, 3] as const;

export const YES = 'Si';
export const NO = 'No';

export const KNOCKOUT_DRAW = ['Orden', 'Aleatorio'] as const;
