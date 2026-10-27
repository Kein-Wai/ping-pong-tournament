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

    expect(screen.getAllByText(/sin récord/i)).toHaveLength(REFLEX_GAMES.length);
  });

  it('Debería mostrar el récord personal del jugador con su unidad', () => {
    saveIfBetter('u1', 'tejas', 14, 'higher');

    renderWithProviders(<JuegosReflejo />);

    expect(screen.getByText(/récord: 14 puntos/i)).toBeInTheDocument();
    expect(screen.getAllByText(/sin récord/i)).toHaveLength(REFLEX_GAMES.length - 1);
  });

  it('Debería ignorar el récord de otro jugador del mismo dispositivo', () => {
    saveIfBetter('otro-usuario', 'tejas', 30, 'higher');

    renderWithProviders(<JuegosReflejo />);

    expect(screen.getAllByText(/sin récord/i)).toHaveLength(REFLEX_GAMES.length);
  });

  it('Debería enlazar cada juego con su partida', () => {
    renderWithProviders(<JuegosReflejo />);

    expect(screen.getByRole('link', { name: /jugar tejas/i })).toHaveAttribute(
      'href',
      '/juegos-reflejo/tejas'
    );
    expect(screen.getByRole('link', { name: /jugar reacción simple/i })).toHaveAttribute(
      'href',
      '/juegos-reflejo/reaccion-simple'
    );
    expect(screen.getByRole('link', { name: /jugar go \/ no-go/i })).toHaveAttribute(
      'href',
      '/juegos-reflejo/go-no-go'
    );
    expect(screen.getByRole('link', { name: /jugar ping pong/i })).toHaveAttribute(
      'href',
      '/juegos-reflejo/ping-pong'
    );
    expect(screen.getByRole('link', { name: /jugar timing/i })).toHaveAttribute(
      'href',
      '/juegos-reflejo/timing'
    );
  });

  it('Debería mostrar el récord de Reacción simple en milisegundos', () => {
    saveIfBetter('u1', 'reaccion-simple', 245, 'lower');

    renderWithProviders(<JuegosReflejo />);

    expect(screen.getByText(/récord: 245 ms/i)).toBeInTheDocument();
  });

  it('Debería avisar de que los récords se guardan solo en este dispositivo', () => {
    renderWithProviders(<JuegosReflejo />);

    expect(screen.getByText(/solo en este dispositivo/i)).toBeInTheDocument();
  });
});
