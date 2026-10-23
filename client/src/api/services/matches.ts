import { http } from '../client';
import { ENDPOINTS } from '../endpoints';
import type { Match } from '../../types/api';

/** Servicios de partidos. */

/** Resultado de un partido (sets ganados). */
export interface MatchResultPayload {
  setsToWin?: number;
  playerOneId?: string;
  playerTwoId?: string;
  setOnePlayerOne?: number;
  setOnePlayerTwo?: number;
  setTwoPlayerOne?: number;
  setTwoPlayerTwo?: number;
  setThreePlayerOne?: number;
  setThreePlayerTwo?: number;
  setFourPlayerOne?: number;
  setFourPlayerTwo?: number;
  setFivePlayerOne?: number;
  setFivePlayerTwo?: number;
  setSixPlayerOne?: number;
  setSixPlayerTwo?: number;
  setSevenPlayerOne?: number;
  setSevenPlayerTwo?: number;
  status?: string;
  winnerId?: string;
}

export const matchesService = {
  list: () => http.get<Match[]>(ENDPOINTS.MATCHES.BASE),

  byId: (id: string) => http.get<Match>(ENDPOINTS.MATCHES.BY_ID(id)),

  update: (id: string, payload: MatchResultPayload) =>
    http.put<Match>(ENDPOINTS.MATCHES.BY_ID(id), payload),
};

export default matchesService;
