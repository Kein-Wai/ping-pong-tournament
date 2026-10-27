import { useCallback, useEffect, useState } from 'react';
import type { ReflexGame } from '../constants/reflexGames';
import { getRecord, saveIfBetter } from '../utils/reflex/reflexRecords';
import { useWakeLock } from './useWakeLock';

export type GamePhase = 'instructions' | 'countdown' | 'playing' | 'result';

export interface GameResult {
  score: number;
  isNewRecord: boolean;
  record: number;
}

const COUNTDOWN_FROM = 3;

/**
 * Flujo común de una partida de juego de reflejo: instrucciones, cuenta atrás,
 * partida y resultado. Cada juego solo aporta sus reglas y llama a `finish(score)`.
 */
export function useGameSession(userId: string, game: ReflexGame) {
  const [phase, setPhase] = useState<GamePhase>('instructions');
  const [countdown, setCountdown] = useState(COUNTDOWN_FROM);
  const [result, setResult] = useState<GameResult | null>(null);
  const [record, setRecord] = useState(() => getRecord(userId, game.slug));

  // Un único intervalo por cuenta atrás: así avanzar varios segundos de golpe no se deja ninguno.
  useEffect(() => {
    if (phase !== 'countdown') return undefined;

    let remaining = COUNTDOWN_FROM;
    const interval = setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        setCountdown(remaining);
      } else {
        clearInterval(interval);
        setPhase('playing');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [phase]);

  useWakeLock(phase === 'countdown' || phase === 'playing');

  const start = useCallback(() => {
    setResult(null);
    setCountdown(COUNTDOWN_FROM);
    setPhase('countdown');
  }, []);

  const finish = useCallback(
    (score: number) => {
      if (phase !== 'playing') return;
      const saved = saveIfBetter(userId, game.slug, score, game.direction);
      setRecord(saved.record);
      setResult({ score, ...saved });
      setPhase('result');
    },
    [phase, userId, game.slug, game.direction]
  );

  return { phase, countdown, result, record, start, finish };
}
