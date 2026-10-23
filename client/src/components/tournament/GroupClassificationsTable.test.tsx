import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from '../../test/utils';
import { GroupClassificationsTable } from './GroupClassificationsTable';
import type { TournamentGroupClas, GroupMatch } from '../../types/tournament';

const buildGroupClas = (overrides: Partial<TournamentGroupClas> = {}): TournamentGroupClas =>
  ({
    id: 'clas-1',
    position: 1,
    pointsClas: 3,
    played: 2,
    gamesWon: 2,
    gamesLost: 0,
    setsWon: 6,
    setsLost: 0,
    pointsWon: 60,
    pointsLost: 0,
    player: {
      id: 'player-1',
      name: 'Ana',
      surname: 'García',
      stats: { elo: 1200 },
    },
    tournamentGroup: { group: 1 },
    ...overrides,
  });

const buildGroupMatch = (overrides: Partial<GroupMatch> = {}): GroupMatch =>
  ({
    id: 'match-1',
    status: 'Completado',
    setOnePlayerOne: 11,
    setOnePlayerTwo: 5,
    setTwoPlayerOne: 11,
    setTwoPlayerTwo: 8,
    setThreePlayerOne: 0,
    setThreePlayerTwo: 0,
    setFourPlayerOne: 0,
    setFourPlayerTwo: 0,
    setFivePlayerOne: 0,
    setFivePlayerTwo: 0,
    playerOne: { id: 'p1', name: 'Ana', surname: 'García' },
    playerTwo: { id: 'p2', name: 'Luis', surname: 'Pérez' },
    group: { id: 'g1', group: 1 },
    ...overrides,
  });

const defaultProps = {
  selectedGroup: '1',
  groupOptions: [{ value: '1', label: 'Grupo 1' }],
  onGroupChange: () => {},
  playersKnockout: 2,
  isAdmin: false,
  tournamentStatus: 'Grupos',
  onEditMatch: vi.fn(),
};

describe('GroupClassificationsTable', () => {
  it('muestra el loader cuando groupsClas o groupMatches es null', () => {
    const { container } = renderWithProviders(
      <GroupClassificationsTable
        groupsClas={null}
        groupMatches={null}
        {...defaultProps}
      />,
    );
    expect(container.innerHTML).toContain('mantine-Loader');
  });

  it('muestra la tabla de clasificación con jugadores del grupo seleccionado', () => {
    const { getByText } = renderWithProviders(
      <GroupClassificationsTable
        groupsClas={[
          buildGroupClas({
            id: 'c1',
            position: 1,
            player: {
              id: 'p1',
              name: 'Ana',
              surname: 'García',
              stats: { elo: 1200 },
            },
            tournamentGroup: { group: 1 },
          }),
          buildGroupClas({
            id: 'c2',
            position: 2,
            player: {
              id: 'p2',
              name: 'Luis',
              surname: 'Pérez',
              stats: { elo: 1100 },
            },
            tournamentGroup: { group: 1 },
          }),
        ]}
        groupMatches={[]}
        {...defaultProps}
      />,
    );
    expect(getByText('Clasificación')).toBeInTheDocument();
    expect(getByText('Ana García')).toBeInTheDocument();
    expect(getByText('Luis Pérez')).toBeInTheDocument();
  });

  it('muestra mensaje cuando no hay datos para el grupo seleccionado', () => {
    const { getByText } = renderWithProviders(
      <GroupClassificationsTable
        groupsClas={[
          buildGroupClas({ tournamentGroup: { group: 2 } }),
        ]}
        groupMatches={[]}
        {...defaultProps}
      />,
    );
    expect(getByText('No hay datos para este grupo.')).toBeInTheDocument();
  });

  it('muestra los partidos del grupo con nombres y estados', () => {
    const { container, getByText, getAllByText } = renderWithProviders(
      <GroupClassificationsTable
        groupsClas={[]}
        groupMatches={[
          buildGroupMatch({
            id: 'm1',
            status: 'Completado',
            playerOne: { id: 'p1', name: 'Ana', surname: 'García' },
            playerTwo: { id: 'p2', name: 'Luis', surname: 'Pérez' },
          }),
          buildGroupMatch({
            id: 'm2',
            status: 'Programado',
            playerOne: { id: 'p3', name: 'Carlos', surname: 'López' },
            playerTwo: { id: 'p4', name: 'Diana', surname: 'Rojas' },
          }),
        ]}
        {...defaultProps}
      />,
    );
    expect(getByText('Partidos del Grupo')).toBeInTheDocument();
    expect(container.textContent).toContain('Ana García');
    expect(container.textContent).toContain('Luis Pérez');
    expect(getAllByText('Completado')).toHaveLength(1);
    expect(getAllByText('Programado').length).toBeGreaterThanOrEqual(1);
  });

  it('no muestra el botón Actualizar cuando isAdmin es false', () => {
    const { queryByText } = renderWithProviders(
      <GroupClassificationsTable
        groupsClas={[]}
        groupMatches={[buildGroupMatch({ status: 'Programado' })]}
        {...defaultProps}
        isAdmin={false}
      />,
    );
    expect(queryByText('Actualizar')).not.toBeInTheDocument();
  });

  it('muestra el botón Actualizar cuando isAdmin es true y status es Grupos', () => {
    const { getAllByText } = renderWithProviders(
      <GroupClassificationsTable
        groupsClas={[]}
        groupMatches={[buildGroupMatch({ status: 'Programado' })]}
        {...defaultProps}
        isAdmin={true}
        tournamentStatus="Grupos"
      />,
    );
    expect(getAllByText('Actualizar')).toHaveLength(1);
  });

  it('muestra mensaje cuando no hay partidos generados', () => {
    const { getByText } = renderWithProviders(
      <GroupClassificationsTable
        groupsClas={[buildGroupClas()]}
        groupMatches={[]}
        {...defaultProps}
      />,
    );
    expect(getByText('No hay partidos generados aún.')).toBeInTheDocument();
  });
});
