import { describe, expect, it } from 'vitest';
import { REFLEX_GAMES, findReflexGame } from './reflexGames';

describe('reflexGames', () => {
  it('cada juego tiene un slug único y apto para una URL', () => {
    const slugs = REFLEX_GAMES.map((game) => game.slug);

    expect(new Set(slugs).size).toBe(slugs.length);
    slugs.forEach((slug) => expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/));
  });

  it('cada juego declara qué es mejor en su récord y cómo se muestra', () => {
    REFLEX_GAMES.forEach((game) => {
      expect(['higher', 'lower']).toContain(game.direction);
      expect(game.name).not.toBe('');
      expect(game.description).not.toBe('');
      expect(game.instructions.length).toBeGreaterThan(0);
      expect(game.formatScore(3)).toContain('3');
    });
  });

  it('encuentra Tejas por su slug, donde mejor es mayor', () => {
    expect(findReflexGame('tejas')).toMatchObject({ name: 'Tejas', direction: 'higher' });
  });

  it('Tejas muestra su resultado en puntos, con el singular correcto', () => {
    const tejas = findReflexGame('tejas');

    expect(tejas?.formatScore(1)).toBe('1 punto');
    expect(tejas?.formatScore(0)).toBe('0 puntos');
    expect(tejas?.formatScore(14)).toBe('14 puntos');
  });

  it('devuelve undefined si el slug no corresponde a ningún juego', () => {
    expect(findReflexGame('no-existe')).toBeUndefined();
    expect(findReflexGame(undefined)).toBeUndefined();
  });
});
