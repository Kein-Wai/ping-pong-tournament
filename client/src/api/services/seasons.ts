import { http } from '../client';
import { ENDPOINTS } from '../endpoints';
import type { Season } from '../../types/api';

/** Servicios de temporadas. */
export const seasonsService = {
  list: () => http.get<Season[]>(ENDPOINTS.SEASONS.BASE),

  current: async (): Promise<Season | undefined> => {
    const seasons = await http.get<Season[]>(ENDPOINTS.SEASONS.BASE);
    return seasons.find((season) => season.isCurrent);
  },
};

export default seasonsService;
