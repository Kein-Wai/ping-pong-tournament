import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import { LeagueStandingsTab } from './LeagueStandingsTab';
import type { LeagueParticipant, LeagueStandings } from '../../types/league';

const participant = (id: string, name: string): LeagueParticipant => ({
  id: `pp-${id}`,
  leagueId: 'l1',
  playerId: id,
  registeredAt: '2026-11-01T10:00:00.000Z',
  status: 'Confirmado',
  player: { id, name, surname: 'Test', avatarUrl: null },
});

const row = (playerId: string, position: number, overrides = {}) => ({
  playerId,
  position,
  played: 3,
  gamesWon: 2,
  gamesLost: 1,
  setsWon: 5,
  setsLost: 3,
  pointsWon: 100,
  pointsLost: 80,
  pointsClas: 5,
  ...overrides,
});

const PARTICIPANTS = [participant('a', 'Ana'), participant('b', 'Luis')];

const render = (standings: LeagueStandings | null) =>
  renderWithProviders(<LeagueStandingsTab standings={standings} participants={PARTICIPANTS} />);

describe('LeagueStandingsTab', () => {
  it('muestra a cada jugador por orden de posición con sus datos', () => {
    render({
      final: false,
      standings: [row('b', 1, { pointsClas: 6 }), row('a', 2, { played: 2, pointsClas: 3 })],
    });

    const rows = screen.getAllByRole('row').slice(1);
    expect(within(rows[0]).getByText('Luis Test')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Ana Test')).toBeInTheDocument();
    expect(within(rows[0]).getByText('6')).toBeInTheDocument();
    expect(within(rows[0]).getByText('+2')).toBeInTheDocument();
  });

  it('indica cuando es la clasificación final', () => {
    render({ final: true, standings: [row('a', 1)] });

    expect(screen.getByText('Clasificación final')).toBeInTheDocument();
  });

  it('en una liga en curso no se presenta como final', () => {
    render({ final: false, standings: [row('a', 1)] });

    expect(screen.queryByText('Clasificación final')).not.toBeInTheDocument();
  });

  it('un jugador que ya no está en la lista se muestra como Jugador', () => {
    render({ final: true, standings: [row('desconocido', 1)] });

    const firstRow = screen.getAllByRole('row')[1];
    expect(within(firstRow).getByText('Jugador')).toBeInTheDocument();
  });

  it('sin clasificación avisa de que aún no hay datos', () => {
    render({ final: false, standings: [] });

    expect(screen.getByText('Todavía no hay clasificación.')).toBeInTheDocument();
  });

  it('mientras carga (sin datos) no rompe', () => {
    render(null);

    expect(screen.getByText('Todavía no hay clasificación.')).toBeInTheDocument();
  });
});
