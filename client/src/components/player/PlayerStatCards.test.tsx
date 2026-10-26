import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import { PlayerStatCards } from './PlayerStatCards';

const STATS = {
  elo: 1200,
  matchWon: 3,
  matchLost: 1,
  setWon: 9,
  setLost: 4,
  pointWon: 150,
  pointLost: 100,
  tournamentWon: 1,
  tournamentPart: 2,
};

const card = (title: string) =>
  screen.getByText(title).closest('[class*="mantine-Paper-root"]') as HTMLElement;

describe('PlayerStatCards', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-15T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const renderCards = (props: Partial<React.ComponentProps<typeof PlayerStatCards>> = {}) =>
    renderWithProviders(
      <PlayerStatCards
        stats={STATS}
        matchWinRate={75}
        totalTournaments={2}
        totalAsistencias={7}
        asistenciasMes={3}
        {...props}
      />,
    );

  it('resume partidos con su porcentaje de victorias', () => {
    renderCards();

    expect(card('Partidos')).toHaveTextContent('3V - 1D');
    expect(card('Partidos')).toHaveTextContent('75% de Victorias');
  });

  it('resume torneos jugados y ganados', () => {
    renderCards();

    expect(card('Torneos Jugados')).toHaveTextContent('2');
    expect(card('Torneos Jugados')).toHaveTextContent('1 Ganados');
  });

  it('resume el balance de sets y su diferencia', () => {
    renderCards();

    expect(card('Balance de Sets')).toHaveTextContent('9 - 4');
    expect(card('Balance de Sets')).toHaveTextContent('Diferencia: 5');
  });

  it('resume los puntos y su ratio con dos decimales', () => {
    renderCards();

    expect(card('Puntos Totales')).toHaveTextContent('150 / 100');
    expect(card('Puntos Totales')).toHaveTextContent('Ratio: 1.50');
  });

  it('cuenta las asistencias totales y las del mes en curso', () => {
    renderCards();

    expect(card('Asistencias Totales')).toHaveTextContent('7');
    expect(card('Asistencias Totales')).toHaveTextContent('Clases grupales atendidas');
    expect(card('Asistencias este Mes')).toHaveTextContent('3');
    expect(card('Asistencias este Mes')).toHaveTextContent('En octubre');
  });

  it('sin estadísticas todo sale a cero y el ratio es 0', () => {
    renderCards({
      stats: undefined,
      matchWinRate: 0,
      totalTournaments: 0,
      totalAsistencias: 0,
      asistenciasMes: 0,
    });

    expect(card('Partidos')).toHaveTextContent('0V - 0D');
    expect(card('Balance de Sets')).toHaveTextContent('0 - 0');
    expect(card('Puntos Totales')).toHaveTextContent('0 / 0');
    expect(card('Puntos Totales')).toHaveTextContent('Ratio: 0');
  });
});
