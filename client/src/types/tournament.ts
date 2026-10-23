/**
 * Tipos del dominio de torneo.
 *
 * Estaban definidos dentro del componente de pagina (2.347 lineas). Separarlos
 * permite que los componentes presentacionales los importen sin depender de
 * la pagina, y que los tests puedan construir datos sin renderizar nada.
 */
import type {
  PlayerTournamentStatus,
  TournamentStatus,
  TypeTournament,
  LevelTournament,
  Rounds,
  TypeKnockout,
  SortGroups,
  SortKnockout,
} from './enums';

/** Jugador inscrito en un torneo. */
export interface TournamentParticipant {
  id: string;
  registeredAt: string;
  status: PlayerTournamentStatus | null;
  player: {
    id: string;
    name: string;
    surname: string | null;
    avatarUrl: string | null;
    stats: { elo: number | null } | null;
  };
}

/** Torneo con su configuracion y participantes. */
export interface Tournament {
  id: string;
  name: string;
  dateStart: string;
  numPlayers: number;
  clubId?: string | null;
  seasonId?: string | null;
  playerId?: string | null;
  typeTournament?: TypeTournament | null;
  levelTournament?: LevelTournament | null;
  rounds?: Rounds | null;
  status?: TournamentStatus | null;
  typeKnockout?: TypeKnockout | null;
  playersKnockout?: number | null;
  sortGroups?: SortGroups | null;
  sortKnockout?: SortKnockout | null;
  allPos?: boolean | null;
  numGroup?: number | null;
  numGroupPlayers?: number | null;
  setsToWinGroup?: number | null;
  setsToWinKnockout?: number | null;
  participants?: Participant[];
}

/** Alias historico del participante del torneo. */
export type Participant = TournamentParticipant;

/** Jugador perteneciente al club del entrenador. */
export interface ClubPlayer {
  id: string;
  name: string;
  surname: string | null;
  avatarUrl: string | null;
}

/** Clasificacion de un jugador en el torneo. */
export interface TournamentClas {
  id: string;
  position: number | null;
  lastRound: string | null;
  player: {
    id: string;
    name: string;
    surname: string | null;
    stats: { elo: number | null };
    avatarUrl: string | null;
  };
}

/** Clasificacion de un jugador dentro de un grupo. */
export interface TournamentGroupClas {
  id: string;
  position: number | null;
  points: number | null;
  played: number | null;
  gamesWon: number | null;
  gamesLost: number | null;
  setsWon: number | null;
  setsLost: number | null;
  pointsWon: number | null;
  pointsLost: number | null;
  player: {
    id: string;
    name: string;
    surname: string | null;
    stats: { elo: number | null };
    avatarUrl: string | null;
  };
  tournamentGroup: { id: string; group: number };
}

/** Jugador dentro del cuadro de eliminatorias. */
export interface BracketPlayer {
  id: string;
  name: string;
  surname: string | null;
  stats?: {
    elo: number;
    matchWon: number;
    matchLost: number;
  };
}

/** Partido del cuadro de eliminatorias. */
export interface BracketMatch {
  id: string;
  status: string;
  playerOne: BracketPlayer | null;
  playerTwo: BracketPlayer | null;
  setOnePlayerOne: number | null;
  setOnePlayerTwo: number | null;
  setTwoPlayerOne: number | null;
  setTwoPlayerTwo: number | null;
  setThreePlayerOne: number | null;
  setThreePlayerTwo: number | null;
  setFourPlayerOne: number | null;
  setFourPlayerTwo: number | null;
  setFivePlayerOne: number | null;
  setFivePlayerTwo: number | null;
}

/** Ronda del cuadro de eliminatorias. */
export interface KnockoutRound {
  id: string;
  round: string;
  type: string;
  positions: string | null;
  matches: BracketMatch[];
}

/** Partido de la fase de grupos. */
export interface GroupMatch {
  id: string;
  status: string;
  setOnePlayerOne: number | null;
  setOnePlayerTwo: number | null;
  setTwoPlayerOne: number | null;
  setTwoPlayerTwo: number | null;
  setThreePlayerOne: number | null;
  setThreePlayerTwo: number | null;
  setFourPlayerOne: number | null;
  setFourPlayerTwo: number | null;
  setFivePlayerOne: number | null;
  setFivePlayerTwo: number | null;
  playerOne: BracketPlayer | null;
  playerTwo: BracketPlayer | null;
  group: { id: string; group: number } | null;
}

/** Partido en edicion, con los sets que introduce el usuario. */
export interface MatchToEdit {
  id: string;
  playerOneName: string;
  playerTwoName: string;
  playerOneId: string;
  playerTwoId: string;
  setsToWin: number;
  status: string;
  isKnockout: boolean;

  set1P1: number | '';
  set1P2: number | '';
  set2P1: number | '';
  set2P2: number | '';
  set3P1: number | '';
  set3P2: number | '';
  set4P1: number | '';
  set4P2: number | '';
  set5P1: number | '';
  set5P2: number | '';
  set6P1: number | '';
  set6P2: number | '';
  set7P1: number | '';
  set7P2: number | '';
}

/** Fases en las que el torneo esta en eliminatorias. */
export const KNOCKOUT_STAGES = [
  'R128avos',
  'R64avos',
  'R32avos',
  'R16avos',
  'Octavos',
  'Cuartos',
  'Semifinales',
  'Final',
];
