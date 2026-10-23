/**
 * Tipos del dominio que consume el cliente.
 *
 * Reflejan los modelos de Prisma (api/prisma/schema.prisma) con las
 * relaciones que el cliente realmente usa. Los enums vienen de ./enums, que
 * esta verificado contra Prisma por el test de contrato de la API.
 */
import type {
  ClubStatus,
  DominantHand,
  FeedbackStatus,
  FeedbackType,
  ManualMatchType,
  MatchFormat,
  MatchLocation,
  MatchStatus,
  OpponentLevel,
  PlayerLevel,
  Playstyle,
  PointCategory,
  PointPlacement,
  PointSubcategory,
  RoundKnockouts,
  RubberType,
  TrainingStatus,
  TypeUser,
  UserClubStatus,
} from './enums';
import type { Tournament, TournamentParticipant } from './tournament';

// El dominio de torneo vive en ./tournament (tipos/tournament.ts) para no
// duplicarlo. Se re-exporta aqui para que los importadores actuales sigan
// funcionando.
export type { Tournament, TournamentParticipant };

/** Envoltura que devuelve la API en todas sus respuestas. */
export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
  message?: string;
}

/** Tipo de usuario (rol). */
export interface UserType {
  id: string;
  name: TypeUser;
}

/** Estadisticas agregadas de un jugador. */
export interface PlayerStats {
  id: string;
  elo: number | null;
  matchesPlayed: number | null;
  matchesWon: number | null;
  setsPlayed?: number | null;
  setsWon?: number | null;
  pointsPlayed?: number | null;
  pointsWon?: number | null;
}

/** Skills tecnicas de un jugador. */
export interface PlayerSkill {
  id: string;
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

/** Usuario de la aplicacion. */
export interface User {
  id: string;
  email: string;
  name: string;
  surname?: string | null;
  secondSurname?: string | null;
  nickname?: string | null;
  avatarUrl?: string | null;
  userTypeId?: string;
  userType?: UserType | null;
  clubId?: string | null;
  clubStatus?: UserClubStatus | null;
  birthDate?: string | null;
  dominantHand?: DominantHand | null;
  playstyle?: Playstyle | null;
  rubberForehand?: RubberType | null;
  rubberBackhand?: RubberType | null;
  level?: PlayerLevel | null;
  stats?: PlayerStats | null;
  skills?: PlayerSkill | null;
  club?: Club | null;
  createdAt?: string;
  updatedAt?: string;
}

/** Club de la aplicacion. */
export interface Club {
  id: string;
  name: string;
  status: ClubStatus;
  city?: string | null;
  address?: string | null;
  logoUrl?: string | null;
  foundedAt?: string | null;
  users?: User[];
}

/** Temporada de la aplicacion. */
export interface Season {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

/** Clasificacion final de un jugador en un torneo. */
export interface TournamentClassification {
  id: string;
  position: number | null;
  lastRound: RoundKnockouts | null;
  player: User & { stats?: PlayerStats | null };
}

/** Partido de la aplicacion (con sets). */
export interface Match {
  id: string;
  dateStart: string;
  seasonId?: string | null;
  tournamentId?: string | null;
  groupId?: string | null;
  knockoutId?: string | null;
  matchOrder?: number | null;
  playerOneId: string;
  playerTwoId: string;
  playerOne?: User | null;
  playerTwo?: User | null;
  /** Torneo en el que se disputa el partido (si lo hay). */
  tournament?: { id: string; name: string } | null;
  status: MatchStatus;
  setsToWin?: number | null;
  isKnockout?: boolean;
  matchNumber?: number | null;
  winnerId?: string | null;
  setOnePlayerOne?: number | null;
  setOnePlayerTwo?: number | null;
  setTwoPlayerOne?: number | null;
  setTwoPlayerTwo?: number | null;
  setThreePlayerOne?: number | null;
  setThreePlayerTwo?: number | null;
  setFourPlayerOne?: number | null;
  setFourPlayerTwo?: number | null;
  setFivePlayerOne?: number | null;
  setFivePlayerTwo?: number | null;
  setSixPlayerOne?: number | null;
  setSixPlayerTwo?: number | null;
  setSevenPlayerOne?: number | null;
  setSevenPlayerTwo?: number | null;
}

/** Punto analizado de un partido manual. */
export interface ManualMatchPoint {
  id: string;
  manualMatchId?: string;
  pointNumber?: number | null;
  category?: PointCategory | null;
  subcategory?: PointSubcategory | null;
  placement?: PointPlacement | null;
  isError?: boolean | null;
  comment?: string | null;
}

/** Partido manual (analisis de puntos). */
export interface ManualMatch {
  id: string;
  userId?: string;
  seasonId?: string | null;
  date: string;
  location: MatchLocation;
  matchType: ManualMatchType;
  format: MatchFormat;
  setsToWin: number;
  opponentName: string;
  opponentHand?: DominantHand | null;
  opponentStyle?: Playstyle | null;
  opponentLevel?: OpponentLevel | null;
  opponentRubberForehand?: RubberType | null;
  opponentRubberBackhand?: RubberType | null;
  status: MatchStatus;
  mySets: number;
  opponentSets: number;
  points?: ManualMatchPoint[];
}

/** Ejercicio del catalogo. */
export interface Exercise {
  id: string;
  name: string;
  description: string;
  objective?: string | null;
  category?: string | null;
  code?: number | null;
  clubId?: string | null;
}

/** Ejercicio asignado a una sesion de entrenamiento. */
export interface SessionExercise {
  id: string;
  trainingSessionId?: string;
  exerciseId?: string;
  sets?: number | null;
  reps?: number | null;
  durationMinutes?: number | null;
  completed: boolean;
  notes?: string | null;
  exercise?: Exercise;
}

/** Sesion de entrenamiento de un jugador. */
export interface TrainingSession {
  id: string;
  playerId?: string;
  playerTrainingId?: string | null;
  date: string;
  title?: string | null;
  training?: PlayerTraining | null;
  exercises?: SessionExercise[];
}

/** Plan de entrenamiento de un jugador. */
export interface PlayerTraining {
  id: string;
  playerId?: string;
  seasonId?: string | null;
  strengths?: string | null;
  weaknesses?: string | null;
  objectives?: string | null;
  sessionsPerWeek: number;
  weeks: number;
  status: TrainingStatus;
  startDate: string;
  endDate?: string | null;
  sessions?: TrainingSession[];
  _count?: { sessions: number };
}

/** Entrenamiento general de un club. */
export interface GeneralTraining {
  id: string;
  clubId?: string;
  seasonId?: string | null;
  description?: string | null;
  date: string;
  templateId?: string;
  scheduleId?: string | null;
}

/** Entrenamiento general programado. */
export interface GeneralTrainingSchedule {
  id: string;
  clubId?: string;
  dayOfWeek?: number | null;
  startTime?: string | null;
  endTime?: string | null;
}

/** Equipo de un club. */
export interface Team {
  id: string;
  name: string;
  category: string;
  level: string;
  clubId?: string;
  seasonId?: string | null;
  players?: User[];
}

/** Evento de club. */
export interface ClubEvent {
  id: string;
  clubId?: string;
  seasonId?: string | null;
  name: string;
  region?: string | null;
  date: string;
  endDate?: string | null;
  location?: string | null;
  color?: string | null;
  reminders?: EventReminder[];
}

/** Recordatorio de un evento. */
export interface EventReminder {
  id: string;
  notifyAt: string;
  isSent: boolean;
}

/** Feedback enviado por un usuario. */
export interface AppFeedback {
  id: string;
  userId?: string;
  type: FeedbackType;
  content: string;
  status: FeedbackStatus;
  createdAt?: string;
}

/** Nodo del cuadro de eliminatorias. */
export interface KnockoutBracketNode {
  id: string;
  matchId?: string | null;
  round?: RoundKnockouts | null;
  position?: number | null;
  playerOne?: User | null;
  playerTwo?: User | null;
  playerOneName?: string | null;
  playerTwoName?: string | null;
  winnerId?: string | null;
  status?: MatchStatus | null;
  nextMatchId?: string | null;
  nextMatchPosition?: number | null;
}
