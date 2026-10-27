import type { ComponentType } from 'react';
import type { ReflexSlug } from '../../constants/reflexGames';
import type { ReflexGameProps } from '../../types/reflex';
import { GoNoGoGame } from './GoNoGoGame';
import { PingPongGame } from './PingPongGame';
import { ReactionGame } from './ReactionGame';
import { TilesGame } from './TilesGame';
import { TimingGame } from './TimingGame';

// Un juego del catálogo (constants/reflexGames) sin componente aquí no compila: el tipo exige uno por slug.
export const REFLEX_GAME_COMPONENTS: Record<ReflexSlug, ComponentType<ReflexGameProps>> = {
  tejas: TilesGame,
  'reaccion-simple': ReactionGame,
  'go-no-go': GoNoGoGame,
  'ping-pong': PingPongGame,
  timing: TimingGame,
};
