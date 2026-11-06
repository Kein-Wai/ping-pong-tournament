import type { SyncMatchPayload } from '../api/services/manualMatches';
import type { ManualMatch } from '../types/api';
import type { SetScore, TrackedPoint } from '../types/manualMatch';

export const MATCHES_COLLECTION = 'partidos';
export const MATCH_LIST_COLLECTION = 'lista-partidos';
export const MATCH_LIST_ID = 'todos';
export const MATCH_OUTBOX_KIND = 'partido';
/** Cuántos partidos recientes se descargan con su detalle para poder abrirlos sin conexión. */
export const RECENT_DETAILS = 20;

/** Partido con todo lo que el servidor guarda y la pantalla de análisis usa. */
export type MatchData = Omit<ManualMatch, 'points'> & {
  planningNotes?: string | null;
  lightNotes?: string | null;
  setScores?: SetScore[] | null;
  points: TrackedPoint[];
};

/**
 * Un partido guardado en el móvil. `revision` cuenta los cambios locales y `syncedRevision` hasta
 * cuál confirmó el servidor: si difieren, hay cambios sin enviar. `baseVersion` es la versión del
 * servidor con la que se descargó (null si el partido nació sin conexión).
 */
export interface LocalMatch {
  data: MatchData;
  baseVersion: number | null;
  revision: number;
  syncedRevision: number;
  /** Identificador del último envío preparado; se mantiene igual en los reintentos. */
  syncId: string | null;
  /** Por qué el servidor lo rechazó; mientras tenga valor, la copia local se conserva intacta. */
  conflict: string | null;
}

export type LocalState = 'pendiente' | 'conflicto';

export const hasUnsentChanges = (doc: LocalMatch): boolean =>
  doc.revision > doc.syncedRevision || doc.baseVersion === null;

export const localStateOf = (doc: LocalMatch): LocalState | undefined =>
  doc.conflict ? 'conflicto' : hasUnsentChanges(doc) ? 'pendiente' : undefined;

/** Lo que el listado y el detalle devuelven a las pantallas: el partido más su estado local. */
export type MatchView = MatchData & { localState?: LocalState };

export const toView = (doc: LocalMatch): MatchView => ({ ...doc.data, localState: localStateOf(doc) });

/** Documento recién descargado del servidor: limpio, sin cambios locales. */
export const fromServer = (data: MatchData & { version?: number }): LocalMatch => ({
  data: { ...data, points: data.points ?? [] },
  baseVersion: data.version ?? 0,
  revision: 0,
  syncedRevision: 0,
  syncId: null,
  conflict: null,
});

/** Cuerpo del envío al servidor a partir de la copia local. */
export const buildSyncPayload = (doc: LocalMatch, syncId: string): SyncMatchPayload => {
  const m = doc.data;
  const completed = m.status === 'Completado';
  return {
    syncId,
    baseVersion: doc.baseVersion,
    match: {
      ...(m.userId && m.coachId ? { playerId: m.userId } : {}),
      opponentName: m.opponentName,
      matchType: m.matchType,
      location: m.location,
      format: m.format,
      analysisType: m.analysisType,
      status: m.status,
      planningNotes: m.planningNotes ?? null,
      lightNotes: m.lightNotes ?? null,
      setsToWin: m.setsToWin,
      date: new Date(m.date).toISOString(),
      opponentHand: m.opponentHand ?? null,
      opponentStyle: m.opponentStyle ?? null,
      opponentLevel: m.opponentLevel ?? null,
      opponentRubberForehand: m.opponentRubberForehand ?? null,
      opponentRubberBackhand: m.opponentRubberBackhand ?? null,
    },
    points: m.points.map((p) => ({
      id: p.id,
      setNumber: p.setNumber,
      pointOrder: p.pointOrder,
      isWon: p.isWon,
      category: p.category ?? null,
      subcategory: p.subcategory ?? null,
      placement: p.placement ?? null,
    })),
    result: completed
      ? {
          mySets: m.mySets,
          opponentSets: m.opponentSets,
          lightNotes: m.lightNotes ?? null,
          setScores: m.setScores ?? null,
        }
      : null,
  };
};
