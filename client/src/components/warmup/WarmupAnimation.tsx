import type { ComponentType } from 'react';
import { WARMUP_EXERCISES_BY_KEY, type WarmupExerciseKey } from '../../constants/warmupExercises';
import { WARMUP_ANIMATION_CSS } from './animations/animationStyles';
import {
  FreeDrillScene,
  MobilityScene,
  RallyScene,
  ServeScene,
  StretchScene,
  TopspinScene,
  TouchScene,
} from './animations/scenes';

/**
 * Animación esquemática en bucle de un ejercicio de calentamiento.
 *
 * Es SVG propio con CSS (sin librerías): pesa pocos KB, usa los colores del tema
 * de Mantine (claro y oscuro) y se detiene con `prefers-reduced-motion`.
 */

// Con `Record` completo, olvidar la escena de un ejercicio nuevo es un error de compilación.
const SCENES: Record<WarmupExerciseKey, ComponentType> = {
  estiramientos: StretchScene,
  movilidad: MobilityScene,
  'derecha-derecha': () => <RallyScene hand="forehand" />,
  'reves-reves': () => <RallyScene hand="backhand" />,
  'top-derecha': () => <TopspinScene hand="forehand" />,
  'top-reves': () => <TopspinScene hand="backhand" />,
  sensibilidad: TouchScene,
  'saque-entrada': ServeScene,
  'drill-libre': FreeDrillScene,
};

export interface WarmupAnimationProps {
  exerciseKey: WarmupExerciseKey;
  /** Ancho máximo en px; el dibujo se escala manteniendo la proporción. */
  maxWidth?: number;
}

export const WarmupAnimation = ({ exerciseKey, maxWidth = 320 }: WarmupAnimationProps) => {
  const Scene = SCENES[exerciseKey];

  return (
    <svg
      role="img"
      aria-label={WARMUP_EXERCISES_BY_KEY[exerciseKey].name}
      viewBox="0 0 200 140"
      width="100%"
      style={{ maxWidth, display: 'block', margin: '0 auto' }}
    >
      <style>{WARMUP_ANIMATION_CSS}</style>
      <Scene />
    </svg>
  );
};
