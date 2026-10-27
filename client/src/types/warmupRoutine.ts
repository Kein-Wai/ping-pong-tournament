import type { WarmupItem } from '../utils/warmupEngine';

/** Rutina de calentamiento guardada por el jugador (respuesta de /api/warmup-routines). */
export interface SavedWarmupRoutine {
  id: string;
  name: string;
  items: WarmupItem[];
  createdAt: string;
  updatedAt: string;
}

/** Datos para crear o actualizar una rutina (warmupRoutineSchema de la API). */
export interface WarmupRoutinePayload {
  name: string;
  items: WarmupItem[];
}
