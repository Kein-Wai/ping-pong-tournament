import { http } from '../client';
import { ENDPOINTS } from '../endpoints';
import type {
  League,
  LeagueDetail,
  LeagueMatch,
  LeagueParticipant,
  LeagueStandings,
} from '../../types/league';
import type { LevelTournament, TypeTournament } from '../../types/enums';

/**
 * Servicios de ligas: consulta, gestión del ciclo de vida y participantes.
 *
 * Los payloads reflejan los esquemas Zod de la API (api/src/schemas/league.ts).
 * Crear y editar devuelven la liga en `data`, e inscribirse el participante.
 * Borrar, iniciar, cancelar, finalizar y todo lo demás sobre participantes
 * responden solo { success, message }: no devuelven datos.
 */

/** Datos para crear una liga. El club sale del token, no del cuerpo. */
export interface CreateLeaguePayload {
  name: string;
  dateStart: string;
  /** Sets que hay que ganar: 1, 2, 3 o 4. */
  setsToWin?: number;
  doubleRound?: boolean;
  typeTournament?: TypeTournament;
  levelTournament?: LevelTournament;
}

/** Edición parcial: solo se admite con la liga Programada. */
export type UpdateLeaguePayload = Partial<CreateLeaguePayload>;

/** Estado que el admin puede dar a un inscrito antes de iniciar la liga. */
export type LeagueParticipantStatusUpdate = 'Pendiente' | 'Confirmado';

export const leaguesService = {
  list: () => http.get<League[]>(ENDPOINTS.LEAGUES.BASE),

  byId: (id: string) => http.get<LeagueDetail>(ENDPOINTS.LEAGUES.BY_ID(id)),

  matches: (id: string) => http.get<LeagueMatch[]>(ENDPOINTS.LEAGUES.MATCHES(id)),

  standings: (id: string) => http.get<LeagueStandings>(ENDPOINTS.LEAGUES.STANDINGS(id)),

  create: (payload: CreateLeaguePayload) => http.post<League>(ENDPOINTS.LEAGUES.BASE, payload),

  update: (id: string, payload: UpdateLeaguePayload) =>
    http.put<League>(ENDPOINTS.LEAGUES.BY_ID(id), payload),

  remove: (id: string) => http.delete<void>(ENDPOINTS.LEAGUES.BY_ID(id)),

  start: (id: string) => http.post<void>(ENDPOINTS.LEAGUES.START(id)),

  cancel: (id: string) => http.post<void>(ENDPOINTS.LEAGUES.CANCEL(id)),

  finish: (id: string) => http.post<void>(ENDPOINTS.LEAGUES.FINISH(id)),

  addParticipants: (id: string, playerIds: string[]) =>
    http.post<void>(ENDPOINTS.LEAGUES.PARTICIPANTS(id), { playerIds }),

  updateParticipantStatus: (id: string, playerId: string, status: LeagueParticipantStatusUpdate) =>
    http.put<void>(ENDPOINTS.LEAGUES.PARTICIPANT_STATUS(id, playerId), { status }),

  removeParticipant: (id: string, playerId: string) =>
    http.delete<void>(ENDPOINTS.LEAGUES.PARTICIPANT(id, playerId)),

  withdrawParticipant: (id: string, playerId: string) =>
    http.post<void>(ENDPOINTS.LEAGUES.WITHDRAW(id, playerId)),

  register: (id: string) => http.post<LeagueParticipant>(ENDPOINTS.LEAGUES.REGISTER(id)),

  unregister: (id: string) => http.delete<void>(ENDPOINTS.LEAGUES.REGISTER(id)),
};
