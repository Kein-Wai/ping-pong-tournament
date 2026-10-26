import { useState } from 'react';

import { manualMatchesService } from '../api/services/manualMatches';
import { LOST_TREE, WON_TREE, type PointNode } from '../constants/manualMatch';
import type { TrackedMatch, TrackedPoint } from '../types/manualMatch';
import { getActiveSet } from '../utils/manual-match';

/** Lo que se lleva elegido de un punto mientras se recorre el árbol de categorías. */
export type PointPath = Partial<Pick<TrackedPoint, 'category' | 'subcategory' | 'placement'>>;

/**
 * useRegistroPuntos — Registro punto a punto del análisis profundo.
 *
 * Lleva el historial de puntos, el set en curso y su marcador, y el recorrido del árbol
 * de categorías con el que se describe cada punto. Arranca con los puntos del partido
 * cargado (`loaded`) y retoma en el set donde se dejó.
 *
 * Migration: extracción quirúrgica de handleStartPoint / handleNodeClick /
 * handleRegisterPoint / handleUndoPoint de ManualMatchTracker.
 */
export interface UseRegistroPuntosProps {
  id: string | undefined;
  loaded: TrackedMatch | null;
}

export const useRegistroPuntos = ({ id, loaded }: UseRegistroPuntosProps) => {
  const [pointHistory, setPointHistory] = useState<TrackedPoint[]>([]);
  const [currentSet, setCurrentSet] = useState(1);

  const [isWonState, setIsWonState] = useState<boolean | null>(null);
  const [currentNodes, setCurrentNodes] = useState<PointNode[] | null>(null);
  const [pointPath, setPointPath] = useState<PointPath>({});

  // Se ajusta durante el render (y no en un efecto) para que el historial ya esté al
  // pintar el partido cargado, sin un fotograma vacío.
  const [syncedFrom, setSyncedFrom] = useState<TrackedMatch | null>(null);
  if (loaded && loaded !== syncedFrom) {
    setSyncedFrom(loaded);
    const pts = loaded.points || [];
    setPointHistory(pts);
    setCurrentSet(getActiveSet(pts));
  }

  const currentSetPoints = pointHistory.filter((p) => p.setNumber === currentSet);
  const myScore = currentSetPoints.filter((p) => p.isWon).length;
  const oppScore = currentSetPoints.filter((p) => !p.isWon).length;

  const resetFlow = () => {
    setIsWonState(null);
    setCurrentNodes(null);
    setPointPath({});
  };

  const handleStartPoint = (isWon: boolean) => {
    setIsWonState(isWon);
    setCurrentNodes(isWon ? WON_TREE : LOST_TREE);
    setPointPath({});
  };

  const handleRegisterPoint = async (data: PointPath & { isWon: boolean }) => {
    const payload = {
      setNumber: currentSet,
      pointOrder: currentSetPoints.length + 1,
      isWon: data.isWon,
      category: data.category || null,
      subcategory: data.subcategory || null,
      placement: data.placement || null,
    };
    try {
      const newPoint = await manualMatchesService.addPoint<TrackedPoint>(id!, payload);
      setPointHistory([...pointHistory, newPoint]);
    } catch (error) {
      console.error(error);
    }
  };

  const handleNodeClick = (node: PointNode) => {
    const newPath = { ...pointPath };
    if (node.category) newPath.category = node.category;
    if (node.subcategory) newPath.subcategory = node.subcategory;
    if (node.placement) newPath.placement = node.placement;
    if (node.next) {
      setPointPath(newPath);
      setCurrentNodes(node.next);
    } else {
      handleRegisterPoint({ ...newPath, isWon: isWonState as boolean });
      resetFlow();
    }
  };

  const handleUndoPoint = async () => {
    if (pointHistory.length === 0) return;
    try {
      await manualMatchesService.deletePoint(id!, pointHistory[pointHistory.length - 1].id);
      setPointHistory(pointHistory.slice(0, -1));
      resetFlow();
    } catch (error) {
      console.error(error);
    }
  };

  return {
    pointHistory,
    currentSet,
    setCurrentSet,
    currentSetPoints,
    myScore,
    oppScore,
    isWonState,
    currentNodes,
    pointPath,
    resetFlow,
    handleStartPoint,
    handleNodeClick,
    handleUndoPoint,
  };
};
