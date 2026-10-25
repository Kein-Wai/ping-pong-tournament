import type {
  PlanningNotes,
  QuickSetScore,
  SetScore,
  SetSummary,
  TrackedMatch,
  TrackedPoint,
} from '../types/manualMatch';
import { isValidTableTennisSet } from './matchValidation';

/** Rótulo con el que se agrupa un punto: `Categoría > Subcategoría (Colocación)`. */
export const getPointLabel = (p: TrackedPoint): string => {
  if (!p.category) return 'Rápido / Sin detalle';
  let label: string = p.category;
  if (p.subcategory) label += ` > ${p.subcategory}`;
  if (p.placement) label += ` (${p.placement})`;
  return label;
};

const countByLabel = (points: TrackedPoint[]): Record<string, number> =>
  points.reduce<Record<string, number>>((acc, p) => {
    const label = getPointLabel(p);
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});

/** Puntos de un set agrupados por rótulo (ganados y perdidos) y su marcador. */
export const getSetSummary = (points: TrackedPoint[], setNum: number): SetSummary => {
  const pts = points.filter((p) => p.setNumber === setNum);
  return {
    wonCategories: countByLabel(pts.filter((p) => p.isWon)),
    lostCategories: countByLabel(pts.filter((p) => !p.isWon)),
    myScore: pts.filter((p) => p.isWon).length,
    oppScore: pts.filter((p) => !p.isWon).length,
  };
};

/** Rótulos con su cuenta, de más a menos frecuente. */
export const getSortedCategories = (categories: Record<string, number>): [string, number][] =>
  Object.entries(categories).sort((a, b) => b[1] - a[1]);

/**
 * Set en el que se retoma el partido: el último con puntos si está a medias, o el
 * siguiente si ya terminó.
 */
export const getActiveSet = (points: TrackedPoint[]): number => {
  if (points.length === 0) return 1;

  const lastPt = points[points.length - 1];
  const lastSetPts = points.filter((p) => p.setNumber === lastPt.setNumber);
  const myS = lastSetPts.filter((p) => p.isWon).length;
  const oppS = lastSetPts.filter((p) => !p.isWon).length;

  return isValidTableTennisSet(myS, oppS) ? lastPt.setNumber + 1 : lastPt.setNumber;
};

/** Tanteos por set del reporte: los guardados en modo rápido o los deducidos de los puntos en modo profundo. */
export const getReportSetScores = (match: TrackedMatch, points: TrackedPoint[]): SetScore[] => {
  if (match.analysisType === 'Rapido' && Array.isArray(match.setScores)) {
    return match.setScores;
  }

  const scores: SetScore[] = [];
  if (match.analysisType === 'Extenso' && points.length > 0) {
    const maxSet = Math.max(...points.map((p) => p.setNumber), 0);
    for (let i = 1; i <= maxSet; i++) {
      const pts = points.filter((p) => p.setNumber === i);
      if (pts.length > 0) {
        scores.push({
          myScore: pts.filter((p) => p.isWon).length,
          oppScore: pts.filter((p) => !p.isWon).length,
        });
      }
    }
  }
  return scores;
};

/** Lee la planificación guardada como JSON; devuelve null si son notas en texto libre. */
export const parsePlanningNotes = (notes: string): PlanningNotes | null => {
  try {
    const parsed = JSON.parse(notes);
    return {
      myServe: parsed.myServe,
      theirServe: parsed.theirServe,
      strategy: parsed.strategy,
    };
  } catch {
    return null;
  }
};

/** Texto con el que se enseña la planificación durante el partido. */
export const formatPlanningText = (p: PlanningNotes): string =>
  `🎯 MI SAQUE:\n${p.myServe || '-'}\n\n🛡️ SU SAQUE:\n${p.theirServe || '-'}\n\n🧠 ESTRATEGIA:\n${p.strategy || '-'}`;

interface QuickNotesInput {
  strengths: string[];
  strDetails: string;
  weaknesses: string[];
  weakDetails: string;
}

/** Conclusiones del análisis rápido a partir de las habilidades marcadas y sus detalles. */
export const buildQuickNotes = ({
  strengths,
  strDetails,
  weaknesses,
  weakDetails,
}: QuickNotesInput): string =>
  `Fortalezas durante el partido:\n${strengths.length > 0 ? strengths.map((s) => `- ${s}`).join('\n') : 'Ninguna'}\nDetalles:\n${strDetails || 'Sin detalles'}\n\nCosas a mejorar:\n${weaknesses.length > 0 ? weaknesses.map((s) => `- ${s}`).join('\n') : 'Ninguna'}\nDetalles:\n${weakDetails || 'Sin detalles'}`;

/** Un tanteo en blanco (0-0) se ignora; si no, debe ser un resultado posible de un set. */
const isValidQuickSet = (s1: number, s2: number): boolean => {
  if (s1 === 0 && s2 === 0) return true;
  const max = Math.max(s1, s2);
  const min = Math.min(s1, s2);
  if (max < 11) return false;
  if (max === 11 && min > 9) return false;
  return max <= 11 || max - min === 2;
};

/** Primer tanteo escrito que es imposible en tenis de mesa, con su posición; null si todos valen. */
export const findInvalidQuickSet = (
  setScores: QuickSetScore[],
): { index: number; myScore: number; oppScore: number } | null => {
  for (let i = 0; i < setScores.length; i++) {
    const s1 = Number(setScores[i].myScore);
    const s2 = Number(setScores[i].oppScore);
    if ((s1 > 0 || s2 > 0) && !isValidQuickSet(s1, s2)) {
      return { index: i, myScore: s1, oppScore: s2 };
    }
  }
  return null;
};

/** Tanteos listos para enviar: números, con cero donde se dejó en blanco. */
export const toSetScorePayload = (setScores: QuickSetScore[]): SetScore[] =>
  setScores.map((s) => ({
    myScore: Number(s.myScore) || 0,
    oppScore: Number(s.oppScore) || 0,
  }));

/** Ajusta la lista de tanteos a los sets jugados: añade vacíos o recorta por el final. */
export const resizeSetScores = (prev: QuickSetScore[], total: number): QuickSetScore[] => {
  if (prev.length === total) return prev;
  const next = [...prev];
  while (next.length < total) {
    next.push({ myScore: '', oppScore: '' });
  }
  if (next.length > total) {
    next.length = total;
  }
  return next;
};

/** El partido se puede cerrar cuando uno llega exactamente a los sets necesarios y el otro no. */
export const isReadyToComplete = (mySets: number, oppSets: number, target: number): boolean =>
  (mySets === target && oppSets < target) || (oppSets === target && mySets < target);
