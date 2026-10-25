import type { Match, User } from './api';

/** Marcadores de set de un partido: la API siempre los envía, con `null` si no se jugó. */
type MatchSetKey =
  | 'setOnePlayerOne'
  | 'setOnePlayerTwo'
  | 'setTwoPlayerOne'
  | 'setTwoPlayerTwo'
  | 'setThreePlayerOne'
  | 'setThreePlayerTwo'
  | 'setFourPlayerOne'
  | 'setFourPlayerTwo'
  | 'setFivePlayerOne'
  | 'setFivePlayerTwo';

/**
 * Partido del historial de un jugador (GET /matches): con sus dos jugadores y los
 * marcadores de set siempre presentes.
 */
export type ProfileMatch = Omit<Match, MatchSetKey | 'playerOne' | 'playerTwo'> &
  Record<MatchSetKey, number | null> & { playerOne: User; playerTwo: User };

/** Valor de cada una de las doce habilidades técnicas de un jugador. */
export interface PlayerSkillValues {
  derechaPlano: number;
  revesPlano: number;
  topspinDerecha: number;
  topspinReves: number;
  corte: number;
  bloqueoDerecha: number;
  bloqueoReves: number;
  servicio: number;
  recepcion: number;
  movilidad: number;
  fortalezaMental: number;
  experiencia: number;
}

/** Mejoras pendientes de consolidar: una por habilidad, `null` si no hay. */
export type PlayerPendingSkills = { [K in keyof PlayerSkillValues]: number | null };

export interface PlayerProfileMatch {
  id: string;
  rivalName: string;
  date: string;
  isHome: boolean;
  location: string | null;
  status: string;
  ourScore?: number | null;
  rivalScore?: number | null;
}

export interface PlayerProfileTeam {
  id: string;
  name: string;
  category: string;
  matches: PlayerProfileMatch[];
}

/**
 * Perfil de jugador tal como lo devuelve GET /users/:id y lo consume la pantalla
 * JugadorPerfil: el usuario con sus estadísticas, habilidades, mejoras pendientes,
 * equipos (con su calendario) y asistencias a entrenamientos generales.
 *
 * Es una proyección propia de la pantalla (el `User` compartido no declara
 * `pendingSkills`, `teams` ni `generalAttendances`).
 */
export interface PlayerProfile {
  id: string;
  email: string;
  name: string;
  surname?: string;
  nickname?: string;
  avatarUrl?: string | null;
  dominantHand?: 'Diestro' | 'Zurdo' | null;
  playstyle?: 'Ofensivo' | 'Defensivo' | null;
  rubberForehand?: string | null;
  rubberBackhand?: string | null;
  level?: string | null;
  clubId?: string | null;
  birthDate?: string | null;
  stats?: {
    elo: number;
    matchWon: number;
    matchLost: number;
    setWon: number;
    setLost: number;
    pointWon: number;
    pointLost: number;
    tournamentWon: number;
    tournamentPart: number;
  };
  skills?: PlayerSkillValues;
  pendingSkills?: PlayerPendingSkills;
  teams?: PlayerProfileTeam[];
  generalAttendances?: {
    generalTraining: { date: string };
  }[];
}

/** Formulario del modal «Editar Mis Datos» de JugadorPerfil. */
export interface ProfileEditData {
  name: string;
  surname: string;
  nickname: string;
  avatarUrl: string;
  dominantHand: string;
  playstyle: string;
  rubberForehand: string;
  rubberBackhand: string;
  birthDate: Date | null;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  skills: Record<string, number>;
}
