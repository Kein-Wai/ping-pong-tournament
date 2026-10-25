import { http } from '../client';
import { ENDPOINTS } from '../endpoints';
import type { SkillValues } from '../../types/api';

/**
 * Servicios de skills tecnicas.
 *
 * consolidate responde solo { success, message }: no devuelve datos.
 */

export const skillsService = {
  /** Fija las habilidades finales del jugador y cierra su bandeja de mejoras pendientes. */
  consolidate: (playerId: string, skills: SkillValues) =>
    http.put<void>(ENDPOINTS.SKILLS.CONSOLIDATE(playerId), skills),
};

export default skillsService;
