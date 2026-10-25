import type { PlayerLevel } from '../types/enums';

/** Valor con el que arrancan todas las habilidades de un jugador según su nivel de entrada. */
export const LEVEL_BASE_STATS: Record<PlayerLevel, number> = {
  Iniciacion: 0,
  Principiante: 20,
  Intermedio: 40,
  Avanzado: 60,
  Profesional: 80,
};
