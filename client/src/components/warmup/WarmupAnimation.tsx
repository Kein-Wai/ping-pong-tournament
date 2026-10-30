import { useState, type ComponentType } from 'react';
import { useReducedMotion } from '@mantine/hooks';
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
 * Animación de un ejercicio de calentamiento: el vídeo grabado si existe y, si no,
 * la escena esquemática en SVG.
 */

/**
 * Clips de `public/warmup/` (16:9, H.264, sin audio, fondo desenfocado, 100-240 KB). Los ejercicios sin
 * clip (estiramientos, movilidad y drill libre) usan la escena SVG.
 */
const WARMUP_VIDEOS: Partial<Record<WarmupExerciseKey, string>> = {
  'derecha-derecha': '/warmup/derecha-derecha.mp4',
  'reves-reves': '/warmup/reves-reves.mp4',
  'top-derecha': '/warmup/top-derecha.mp4',
  'top-reves': '/warmup/top-reves.mp4',
  sensibilidad: '/warmup/sensibilidad.mp4',
  'saque-entrada': '/warmup/saque-entrada.mp4',
};

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

/**
 * Escena esquemática en bucle.
 *
 * Es SVG propio con CSS (sin librerías): pesa pocos KB, usa los colores del tema
 * de Mantine (claro y oscuro) y se detiene con `prefers-reduced-motion`.
 */
export const WarmupSceneAnimation = ({ exerciseKey, maxWidth = 320 }: WarmupAnimationProps) => {
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

export const WarmupAnimation = ({ exerciseKey, maxWidth = 320 }: WarmupAnimationProps) => {
  const [videoFailed, setVideoFailed] = useState(false);
  // Un vídeo en bucle no se puede detener con CSS: quien pide menos movimiento ve la escena SVG.
  const reducedMotion = useReducedMotion();
  const videoSrc = WARMUP_VIDEOS[exerciseKey];

  if (!videoSrc || videoFailed || reducedMotion) {
    return <WarmupSceneAnimation exerciseKey={exerciseKey} maxWidth={maxWidth} />;
  }

  return (
    <video
      aria-label={WARMUP_EXERCISES_BY_KEY[exerciseKey].name}
      src={videoSrc}
      autoPlay
      loop
      muted
      playsInline
      onError={() => setVideoFailed(true)}
      style={{ width: '100%', maxWidth, display: 'block', margin: '0 auto', borderRadius: 8 }}
    />
  );
};
