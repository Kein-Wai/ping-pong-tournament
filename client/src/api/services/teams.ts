import { http } from '../client';
import { ENDPOINTS } from '../endpoints';
import type { ClubTeam, Team, TeamMatch, TeamMatchStatus } from '../../types/api';

/**
 * Servicios de equipos y de su calendario de partidos.
 *
 * Los payloads reflejan los esquemas Zod de la API (api/src/schemas/team.ts). El
 * club sale siempre del token. remove, deleteMatch y toggleAvailability responden
 * solo { success, message }: no devuelven datos.
 */

/** Datos de un equipo (createTeamSchema). */
export interface TeamPayload {
  name: string;
  category: string;
  level: string;
}

/** Datos de un partido nuevo del calendario (createTeamMatchSchema). */
export interface CreateTeamMatchPayload {
  rivalName: string;
  date: string;
  isHome: boolean;
  location?: string | null;
}

/** Cambios sobre un partido, normalmente su resultado (updateTeamMatchSchema). */
export interface UpdateTeamMatchPayload {
  status: TeamMatchStatus;
  ourScore?: number | null;
  rivalScore?: number | null;
  rivalName?: string;
  date?: string;
  isHome?: boolean;
  location?: string | null;
}

export const teamsService = {
  byClub: (clubId: string) => http.get<ClubTeam[]>(ENDPOINTS.TEAMS.BY_CLUB(clubId)),

  create: (payload: TeamPayload) => http.post<Team>(ENDPOINTS.TEAMS.BASE, payload),

  update: (teamId: string, payload: Partial<TeamPayload>) =>
    http.put<Team>(ENDPOINTS.TEAMS.UPDATE(teamId), payload),

  updatePlayers: (teamId: string, playerIds: string[]) =>
    http.put<Team>(ENDPOINTS.TEAMS.UPDATE_PLAYERS(teamId), { playerIds }),

  remove: (teamId: string) => http.delete<void>(ENDPOINTS.TEAMS.DELETE(teamId)),

  createMatch: (teamId: string, payload: CreateTeamMatchPayload) =>
    http.post<TeamMatch>(ENDPOINTS.TEAMS.MATCHES(teamId), payload),

  updateMatch: (matchId: string, payload: UpdateTeamMatchPayload) =>
    http.put<TeamMatch>(ENDPOINTS.TEAMS.UPDATE_MATCH(matchId), payload),

  deleteMatch: (matchId: string) => http.delete<void>(ENDPOINTS.TEAMS.DELETE_MATCH(matchId)),

  /** Confirma la asistencia del usuario al partido, o la cancela si ya estaba confirmada. */
  toggleAvailability: (matchId: string) =>
    http.post<void>(ENDPOINTS.TEAMS.TOGGLE_AVAILABILITY(matchId)),
};

export default teamsService;
