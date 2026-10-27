import { describe, expect, it } from 'vitest';
import { REFLEX_GAMES } from '../../constants/reflexGames';
import { REFLEX_GAME_COMPONENTS } from './gameComponents';

describe('REFLEX_GAME_COMPONENTS', () => {
  it('cada juego del catálogo tiene su componente de partida', () => {
    REFLEX_GAMES.forEach((game) => {
      expect(REFLEX_GAME_COMPONENTS[game.slug], `falta el componente de «${game.slug}»`).toBeDefined();
    });
  });

  it('no hay componentes de juegos que no estén en el catálogo', () => {
    const slugs = REFLEX_GAMES.map((game) => game.slug);

    Object.keys(REFLEX_GAME_COMPONENTS).forEach((slug) => {
      expect(slugs).toContain(slug);
    });
  });
});
