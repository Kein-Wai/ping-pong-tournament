/**
 * Tipos del dominio de ligas (respuestas de /api/leagues).
 *
 * Los contratos salen de api/src/routes/league.ts y api/src/utils/league.ts.
 */
import type {
  LevelTournament,
  MatchStatus,
  PlayerTournamentStatus,
  TypeTournament,
} from './enums';
import type { Match } from './api';

/** Liga de un club. `setsToWin` son los sets que hay que ganar (1, 2, 3 o 4: mejor de 1, 3, 5 o 7). */
export interface League {
  id: string;
  clubId: string | null;
  seasonId: string | null;
  name: string;
  dateStart: string;
  numPlayers: number;
  typeTournament?: TypeTournament | null;
  levelTournament?: LevelTournament | null;
  status: MatchStatus | null;
  setsToWin: number;
  doubleRound: boolean;
  /** Solo en el listado. */
  _count?: { participants: number };
}

/** Jugador inscrito en una liga. */
export interface LeagueParticipant {
  id: string;
  leagueId: string;
  playerId: string;
  registeredAt: string;
  status: PlayerTournamentStatus | null;
  player: {
    id: string;
    name: string;
    surname: string | null;
    avatarUrl: string | null;
  };
}

/** Liga con sus participantes (detalle). */
export interface LeagueDetail extends League {
  participants: LeagueParticipant[];
}

/** Partido del calendario de una liga: `round` es la jornada y `walkover` marca un W.O. */
export interface LeagueMatch extends Match {
  leagueId: string;
  round: number | null;
  walkover: boolean;
}

/** Fila de la clasificación de una liga. */
export interface LeagueStandingRow {
  playerId: string;
  played: number;
  gamesWon: number;
  gamesLost: number;
  setsWon: number;
  setsLost: number;
  pointsWon: number;
  pointsLost: number;
  pointsClas: number;
  position: number;
}

/** Clasificación de una liga; `final` indica que es la foto guardada al completarse. */
export interface LeagueStandings {
  final: boolean;
  standings: LeagueStandingRow[];
}
