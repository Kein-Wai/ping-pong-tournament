// api/src/constants.ts
export const BYE_USER_ID = '00000000-0000-0000-0000-000000000000';
export const TBD_USER_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

export const CLUB_STATUS = ['Registrado', 'Pendiente', 'Aprobado', 'Rechazado'];

export const STATUS = {
  SCHEDULE: 'Programado',
  OPEN: 'Abierto',
  STARTED: 'Iniciado',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmado',
  NO_SHOW: 'No presentado',
} as const;

export const TOURNAMENT_STATUS = {
  SCHEDULE: 'Programado',
  STARTED: 'Iniciado',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
  GROUPS: 'Grupos',
  R128AVOS: 'R128avos',
  R64AVOS: 'R64avos',
  R32AVOS: 'R32avos',
  R16AVOS: 'R16avos',
  OCTAVOS: 'Octavos',
  CUARTOS: 'Cuartos',
  SEMIFINALES: 'Semifinales',
  FINAL: 'Final',
} as const;

export const STATUS_MATCH_VAL = ['Programado', 'Abierto', 'Iniciado', 'Completado', 'Cancelado'];

export const ROUNDS = {
  GROUPS: 'Grupos',
  KNOCKOUTS: 'Eliminatorias',
} as const;

export const KNOWCKOUTS = {
  FINAL: 'Final',
  SEMIFINALS: 'Semifinales',
  QUARTERFINALS: 'Cuartos',
  LAST16: 'Octavos',
  LAST32: 'Deciseisavos',
  LAST64: 'Treintadosavos',
  LAST128: 'Seseintacuatroavos',
} as const;

export const KNOWCKOUTS_NUM = {
  FINAL: 1,
  SEMIFINALS: 2,
  QUARTERFINALS: 4,
  LAST16: 8,
  LAST32: 16,
  LAST64: 32,
  LAST128: 64,
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

export const SCORE_DEFAULT = 500;

export const GROUP_LOSS_POINTS = -2;
export const GROUP_WIN_POINTS = 2;

export const KNOCKOUT_TYPE = {
  A: 'Llave A',
  AB: 'Llave A y B',
} as const;

export const KNOCKOUT_QUALIFY_PLAYERS = [2, 3] as const;

export const YES = 'Si';
export const NO = 'No';

export const KNOCKOUT_DRAW = ['Orden', 'Aleatorio'] as const;

export const MATCH_MATRIX = {
  2: [[1, 2]], // Por si algún grupo se queda corto
  3: [
    [1, 3],
    [1, 2],
    [2, 3],
  ],
  4: [
    [1, 3],
    [2, 4],
    [1, 2],
    [3, 4],
    [1, 4],
    [2, 3],
  ],
  5: [
    [5, 2],
    [4, 3],
    [1, 3],
    [5, 4],
    [2, 4],
    [1, 5],
    [3, 5],
    [2, 1],
    [4, 1],
    [3, 2],
  ],
  6: [
    [1, 6],
    [2, 5],
    [3, 4],
    [1, 5],
    [6, 4],
    [2, 3],
    [1, 4],
    [5, 3],
    [6, 2],
    [1, 3],
    [4, 2],
    [5, 6],
    [1, 2],
    [3, 6],
    [4, 5],
  ],
};
