import { http } from '../client';
import { ENDPOINTS } from '../endpoints';
import type { Team, User } from '../../types/api';

/** Servicios de equipos. */

export const teamsService = {
  byClub: (clubId: string) => http.get<Team[]>(ENDPOINTS.TEAMS.BY_CLUB(clubId)),

  update: (teamId: string, payload: Partial<Team>) =>
    http.put<Team>(ENDPOINTS.TEAMS.UPDATE(teamId), payload),

  updatePlayers: (teamId: string, playerIds: string[]) =>
    http.put<Team>(ENDPOINTS.TEAMS.UPDATE_PLAYERS(teamId), { playerIds }),

  remove: (teamId: string) => http.delete<void>(ENDPOINTS.TEAMS.DELETE(teamId)),

  matches: (teamId: string) => http.get<unknown[]>(ENDPOINTS.TEAMS.MATCHES(teamId)),

  updateMatch: (matchId: string, payload: unknown) =>
    http.put<unknown>(ENDPOINTS.TEAMS.UPDATE_MATCH(matchId), payload),

  deleteMatch: (matchId: string) => http.delete<void>(ENDPOINTS.TEAMS.DELETE_MATCH(matchId)),

  toggleAvailability: (matchId: string) =>
    http.put<unknown>(ENDPOINTS.TEAMS.TOGGLE_AVAILABILITY(matchId)),

  players: (teamId: string) => http.get<User[]>(ENDPOINTS.TEAMS.BY_CLUB(teamId)),
};

export default teamsService;
