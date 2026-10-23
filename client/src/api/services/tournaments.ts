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

/** Servicios de torneos: consulta, inscripcion, grupos y cuadro. */

/** Datos para crear un torneo. */
export interface CreateTournamentPayload {
  name: string;
  dateStart: string;
  numPlayers: number;
  clubId?: string;
  typeTournament?: string;
  levelTournament?: string;
  rounds?: string;
  typeKnockout?: string;
  playersKnockout?: number;
  sortGroups?: string;
  sortKnockout?: string;
  numGroup?: number;
  numGroupPlayers?: number;
  setsToWinGroup?: number;
  setsToWinKnockout?: number;
}

/** Datos de una inscripcion individual. */
export interface RegisterPayload {
  playerId: string;
}

/** Datos de una inscripcion multiple. */
export interface RegisterBulkPayload {
  playerIds: string[];
}

/** Datos para intercambiar dos jugadores de un grupo. */
export interface SwapPlayersPayload {
  groupId: string;
  playerOneId: string;
  playerTwoId: string;
}

export const tournamentsService = {
  list: () => http.get<Tournament[]>(ENDPOINTS.TOURNAMENTS.BASE),

  byId: (id: string) => http.get<Tournament>(ENDPOINTS.TOURNAMENTS.BY_ID(id)),

  create: (payload: CreateTournamentPayload) =>
    http.post<Tournament>(ENDPOINTS.TOURNAMENTS.BASE, payload),

  update: (id: string, payload: Partial<CreateTournamentPayload>) =>
    http.put<Tournament>(ENDPOINTS.TOURNAMENTS.UPDATE(id), payload),

  remove: (id: string) => http.delete<void>(ENDPOINTS.TOURNAMENTS.DELETE(id)),

  participants: (id: string) =>
    http.get<TournamentParticipant[]>(ENDPOINTS.TOURNAMENTS.PARTICIPANTES(id)),

  register: (id: string, payload: RegisterPayload) =>
    http.post<TournamentParticipant>(ENDPOINTS.TOURNAMENTS.REGISTER(id), payload),

  registerBulk: (id: string, payload: RegisterBulkPayload) =>
    http.post<TournamentParticipant[]>(ENDPOINTS.TOURNAMENTS.REGISTER_BULK(id), payload),

  updateParticipantStatus: (
    id: string,
    playerId: string,
    status: string,
  ) =>
    http.put<TournamentParticipant>(
      ENDPOINTS.TOURNAMENTS.UPDATE_PARTICIPANT_STATUS(id, playerId),
      { status },
    ),

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
