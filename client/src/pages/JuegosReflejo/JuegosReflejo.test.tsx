import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { REFLEX_GAMES } from '../../constants/reflexGames';
import { saveIfBetter } from '../../utils/reflex/reflexRecords';
import { loginAs, renderWithProviders } from '../../test/utils';
import { JuegosReflejo } from './JuegosReflejo';

describe('Juegos de Reflejo (/juegos-reflejo)', () => {
  beforeEach(() => {
    localStorage.clear();
    loginAs({ id: 'u1' });
  });

  it('Debería mostrar una tarjeta por cada juego con su nombre y descripción', () => {
    renderWithProviders(<JuegosReflejo />);

    REFLEX_GAMES.forEach((game) => {
      expect(screen.getByRole('heading', { name: game.name })).toBeInTheDocument();
      expect(screen.getByText(game.description)).toBeInTheDocument();
    });
  });

  it('Debería decir que no hay récord si el jugador aún no ha jugado', () => {
    renderWithProviders(<JuegosReflejo />);

    expect(screen.getByText(/sin récord/i)).toBeInTheDocument();
  });

  it('Debería mostrar el récord personal del jugador con su unidad', () => {
    saveIfBetter('u1', 'tejas', 14, 'higher');

    renderWithProviders(<JuegosReflejo />);

    expect(screen.getByText(/récord: 14 puntos/i)).toBeInTheDocument();
  });

  it('Debería ignorar el récord de otro jugador del mismo dispositivo', () => {
    saveIfBetter('otro-usuario', 'tejas', 30, 'higher');

    renderWithProviders(<JuegosReflejo />);

    expect(screen.getByText(/sin récord/i)).toBeInTheDocument();
  });

  it('Debería enlazar cada juego con su partida', () => {
    renderWithProviders(<JuegosReflejo />);

    expect(screen.getByRole('link', { name: /jugar tejas/i })).toHaveAttribute(
      'href',
      '/juegos-reflejo/tejas'
    );
  });

  it('Debería avisar de que los récords se guardan solo en este dispositivo', () => {
    renderWithProviders(<JuegosReflejo />);

    expect(screen.getByText(/solo en este dispositivo/i)).toBeInTheDocument();
  });
});
