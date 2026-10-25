import { http } from '../client';
import { ENDPOINTS } from '../endpoints';
import type { ManualMatch, ManualMatchPoint } from '../../types/api';
import type {
  AnalysisType,
  DominantHand,
  ManualMatchType,
  MatchFormat,
  MatchLocation,
  MatchStatus,
  OpponentLevel,
  PointCategory,
  PointPlacement,
  PointSubcategory,
  Playstyle,
  RubberType,
} from '../../types/enums';

/**
 * Servicios de analisis manual de partidos.
 *
 * Los payloads reflejan los esquemas Zod de la API (api/src/schemas/manualMatch.ts).
 * deletePoint responde solo { success, message }: no devuelve datos.
 */

/** Datos del rival, comunes al crear y al actualizar el partido. */
interface OpponentPayload {
  opponentHand?: DominantHand | null;
  opponentStyle?: Playstyle | null;
  opponentLevel?: OpponentLevel | null;
  opponentRubberForehand?: RubberType | null;
  opponentRubberBackhand?: RubberType | null;
}

/** Datos para crear un partido manual (createManualMatchSchema). */
export interface CreateManualMatchPayload extends OpponentPayload {
  opponentName: string;
  matchType: ManualMatchType;
  location: MatchLocation;
  format: MatchFormat;
  analysisType?: AnalysisType;
  status?: 'Programado' | 'Iniciado';
  planningNotes?: string | null;
  setsToWin?: number;
  date?: string;
}

/** Cambios sobre un partido manual (updateManualMatchSchema). */
export interface UpdateManualMatchPayload extends OpponentPayload {
  opponentName?: string;
  lightNotes?: string | null;
  planningNotes?: string | null;
  status?: MatchStatus;
  analysisType?: AnalysisType;
}

/** Punto analizado que se registra en un set (addPointSchema). */
export interface AddPointPayload {
  setNumber: number;
  pointOrder: number;
  isWon: boolean;
  category?: PointCategory | null;
  subcategory?: PointSubcategory | null;
  placement?: PointPlacement | null;
}

/** Marcador de un set desde el punto de vista del usuario. */
export interface SetScore {
  myScore: number;
  oppScore: number;
}

/** Datos para finalizar un partido manual (completeMatchSchema). */
export interface CompleteMatchPayload {
  mySets: number;
  opponentSets: number;
  lightNotes?: string | null;
  setScores?: SetScore[] | null;
}

export const manualMatchesService = {
  list: () => http.get<ManualMatch[]>(ENDPOINTS.MANUAL_MATCHES.BASE),

  /** `T` deja a cada pantalla tipar el partido con la proyección que consume (puntos, tanteos, notas). */
  byId: <T = ManualMatch>(id: string) => http.get<T>(ENDPOINTS.MANUAL_MATCHES.BY_ID(id)),

  create: (payload: CreateManualMatchPayload) =>
    http.post<ManualMatch>(ENDPOINTS.MANUAL_MATCHES.BASE, payload),

  update: (id: string, payload: UpdateManualMatchPayload) =>
    http.put<ManualMatch>(ENDPOINTS.MANUAL_MATCHES.UPDATE(id), payload),

  /** `T` deja a cada pantalla tipar el punto con la proyección que consume. */
  addPoint: <T = ManualMatchPoint>(id: string, payload: AddPointPayload) =>
    http.post<T>(ENDPOINTS.MANUAL_MATCHES.ADD_POINT(id), payload),

  deletePoint: (id: string, pointId: string) =>
    http.delete<void>(ENDPOINTS.MANUAL_MATCHES.DELETE_POINT(id, pointId)),

  complete: (id: string, payload: CompleteMatchPayload) =>
    http.put<ManualMatch>(ENDPOINTS.MANUAL_MATCHES.COMPLETE(id), payload),
};

export default manualMatchesService;
