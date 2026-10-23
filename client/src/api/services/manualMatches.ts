import { http } from '../client';
import { ENDPOINTS } from '../endpoints';
import type { ManualMatch, ManualMatchPoint } from '../../types/api';

/** Servicios de analisis manual de partidos. */

/** Datos de un punto analizado. */
export interface ManualMatchPointPayload {
  category?: string;
  subcategory?: string;
  placement?: string;
  isError?: boolean;
  comment?: string;
}

export const manualMatchesService = {
  list: () => http.get<ManualMatch[]>(ENDPOINTS.MANUAL_MATCHES.BASE),

  byId: (id: string) => http.get<ManualMatch>(ENDPOINTS.MANUAL_MATCHES.BY_ID(id)),

  create: (payload: Partial<ManualMatch>) =>
    http.post<ManualMatch>(ENDPOINTS.MANUAL_MATCHES.BASE, payload),

  update: (id: string, payload: Partial<ManualMatch>) =>
    http.put<ManualMatch>(ENDPOINTS.MANUAL_MATCHES.UPDATE(id), payload),

  addPoint: (id: string, payload: ManualMatchPointPayload) =>
    http.post<ManualMatchPoint>(ENDPOINTS.MANUAL_MATCHES.ADD_POINT(id), payload),

  deletePoint: (id: string, pointId: string) =>
    http.delete<void>(ENDPOINTS.MANUAL_MATCHES.DELETE_POINT(id, pointId)),

  complete: (id: string) => http.put<ManualMatch>(ENDPOINTS.MANUAL_MATCHES.COMPLETE(id)),
};

export default manualMatchesService;
