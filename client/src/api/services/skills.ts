import { http } from '../client';
import { ENDPOINTS } from '../endpoints';

/** Servicios de skills tecnicas. */

export const skillsService = {
  consolidate: (playerId: string) => http.post<void>(ENDPOINTS.SKILLS.CONSOLIDATE(playerId)),
};

export default skillsService;
