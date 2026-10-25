import type { PlayerStats, TeamMatch } from './api';

/** Equipo del jugador con sus partidos, tal como lo incluye `GET /users/:id`. */
export interface DashboardTeam {
  name: string;
  matches: TeamMatch[];
}

/** Proyección del jugador que consume el panel: sus estadísticas (objeto o array) y sus equipos. */
export interface DashboardPlayer {
  stats?: PlayerStats | PlayerStats[] | null;
  teams?: DashboardTeam[];
}

/** Partido de equipo con el nombre del equipo propio, para pintar el «Próximo partido». */
export interface UpcomingTeamMatch extends TeamMatch {
  teamName: string;
}
