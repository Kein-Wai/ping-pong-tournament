import { http } from '../client';
import { ENDPOINTS } from '../endpoints';
import type {
  Tournament,
  TournamentGroupClas,
  TournamentClas,
  TournamentParticipant,
  KnockoutRound,
  GroupMatch,
} from '../../types/tournament';
import type {
  LevelTournament,
  PlayerTournamentStatus,
  Rounds,
  SortGroups,
  SortKnockout,
  TournamentStatus,
  TypeKnockout,
  TypeTournament,
} from '../../types/enums';

/**
 * Servicios de torneos: consulta, inscripcion, grupos y cuadro.
 *
 * Los payloads reflejan los esquemas Zod de la API (api/src/schemas/tournament.ts).
 * Dos rutas responden FUERA del sobre { success, data }: crear un torneo devuelve
 * { message, tournament } e inscribir a un jugador { message, participant }.
 * Borrar, inscripcion masiva, cambio de estado, generacion y cambio de jugadores
 * responden solo { success, message }: no devuelven datos.
 */

/** Datos para crear un torneo (baseTournamentObject). El club sale del token, no del cuerpo. */
export interface CreateTournamentPayload {
  name: string;
  dateStart: string;
  numPlayers: number;
  typeTournament?: TypeTournament;
  levelTournament?: LevelTournament;
  rounds?: Rounds;
  status?: TournamentStatus;
  typeKnockout?: TypeKnockout | null;
  playersKnockout?: number | null;
  sortGroups?: SortGroups | null;
  sortKnockout?: SortKnockout | null;
  allPos?: boolean | null;
  numGroup?: number | null;
  numGroupPlayers?: number | null;
  setsToWinGroup?: number | null;
  setsToWinKnockout?: number | null;
}

/** Respuesta de crear un torneo: la API la manda sin sobre. */
export interface CreateTournamentResult {
  message: string;
  tournament: Tournament;
}

/** Datos de una inscripcion individual (registerParticipantSchema). */
export interface RegisterPayload {
  playerId: string;
  registeredAt?: string;
  status?: PlayerTournamentStatus;
}

/** Respuesta de inscribir a un jugador: la API la manda sin sobre. */
export interface RegisterResult {
  message: string;
  participant: TournamentParticipant;
}

/** Datos de una inscripcion multiple. */
export interface RegisterBulkPayload {
  playerIds: string[];
}

/** Datos para intercambiar dos jugadores (contrato de swapPlayersSchema en la API). */
export interface SwapPlayersPayload {
  playerAId: string;
  playerBId: string;
}

export const tournamentsService = {
  /** `T` deja a cada pantalla tipar el torneo con la proyección que consume. */
  list: <T = Tournament>() => http.get<T[]>(ENDPOINTS.TOURNAMENTS.BASE),

  byId: (id: string) => http.get<Tournament>(ENDPOINTS.TOURNAMENTS.BY_ID(id)),

  create: (payload: CreateTournamentPayload) =>
    http.post<CreateTournamentResult>(ENDPOINTS.TOURNAMENTS.BASE, payload),

  update: (id: string, payload: Partial<CreateTournamentPayload>) =>
    http.put<Tournament>(ENDPOINTS.TOURNAMENTS.UPDATE(id), payload),

  remove: (id: string) => http.delete<void>(ENDPOINTS.TOURNAMENTS.DELETE(id)),

  participants: (id: string) =>
    http.get<TournamentParticipant[]>(ENDPOINTS.TOURNAMENTS.PARTICIPANTES(id)),

  register: (id: string, payload: RegisterPayload) =>
    http.post<RegisterResult>(ENDPOINTS.TOURNAMENTS.REGISTER(id), payload),

  registerBulk: (id: string, payload: RegisterBulkPayload) =>
    http.post<void>(ENDPOINTS.TOURNAMENTS.REGISTER_BULK(id), payload),

  updateParticipantStatus: (id: string, playerId: string, status: PlayerTournamentStatus) =>
    http.put<void>(ENDPOINTS.TOURNAMENTS.UPDATE_PARTICIPANT_STATUS(id, playerId), { status }),

  /** Torneos sin terminar en los que esta inscrito el jugador; solo los ve el propio jugador. */
  enrolledByPlayer: (playerId: string) =>
    http.get<Tournament[]>(ENDPOINTS.TOURNAMENTS.ENROLLED(playerId)),

  groupClassifications: (id: string) =>
    http.get<TournamentGroupClas[]>(ENDPOINTS.TOURNAMENTS.GROUPS(id)),

  groupMatches: (id: string) => http.get<GroupMatch[]>(ENDPOINTS.TOURNAMENTS.GROUPMATCHES(id)),

  classifications: (id: string) =>
    http.get<TournamentClas[]>(ENDPOINTS.TOURNAMENTS.CLASSIFICATION(id)),

  bracket: (id: string, type: 'A' | 'B' = 'A') =>
    http.get<KnockoutRound[]>(`${ENDPOINTS.TOURNAMENTS.BRACKETS(id)}?type=${type}`),

  generateGroups: (id: string) => http.post<void>(ENDPOINTS.TOURNAMENTS.GENERATE_GROUPS(id)),

  swapPlayers: (id: string, payload: SwapPlayersPayload) =>
    http.put<void>(ENDPOINTS.TOURNAMENTS.SWAP_PLAYERS(id), payload),

  generateExcel: (payload: unknown) =>
    http.post<Blob>(ENDPOINTS.TOURNAMENTS.GENERATE_EXCEL, payload, { responseType: 'blob' }),
};

export default tournamentsService;
