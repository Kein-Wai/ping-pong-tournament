import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import { GroupClassificationsTableContainer } from './GroupClassificationsTableContainer';
import type { TournamentGroupClas, GroupMatch } from '../../types/tournament';

const clasPlayer = (id: string, name: string) =>
  ({
    id,
    name,
    surname: 'García',
    avatarUrl: null,
    stats: { elo: 1200 },
  } as TournamentGroupClas['player']);

const bracketPlayer = (id: string, name: string) =>
  ({
    id,
    name,
    surname: 'García',
  } as GroupMatch extends { playerOne: infer P } | { playerTwo: infer P } ? P : never);

const buildGroupClas = (over: Partial<TournamentGroupClas> = {}): TournamentGroupClas =>
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
    player: clasPlayer('player-1', 'Ana'),
    tournamentGroup: { group: 1 },
    ...over,
  } as TournamentGroupClas);

const buildGroupMatch = (over: Partial<GroupMatch> = {}): GroupMatch =>
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
    playerOne: bracketPlayer('p1', 'Ana'),
    playerTwo: bracketPlayer('p2', 'Luis'),
    group: { id: 'g1', group: 1 },
    ...over,
  } as GroupMatch);

const baseProps = {
  isAdmin: false,
  tournamentStatus: 'Grupos',
  onEditMatch: vi.fn(),
};

describe('GroupClassificationsTableContainer', () => {
  it('muestra el loader cuando groupsClas o groupMatches es null', () => {
    const { container } = renderWithProviders(
      <GroupClassificationsTableContainer
        data={{ groupsClas: null, groupMatches: null, playersKnockout: 2 }}
        {...baseProps}
      />,
    );
    expect(container.querySelector('.mantine-Loader-root')).toBeInTheDocument();
  });

  it('muestra "No hay datos" cuando groupsClas esta vacio y selectedGroup es null (uncontrolled)', () => {
    const { container } = renderWithProviders(
      <GroupClassificationsTableContainer
        data={{ groupsClas: [], groupMatches: [], playersKnockout: 2 }}
        {...baseProps}
      />,
    );
    expect(container.textContent).toContain('No hay datos para este grupo.');
  });

  it('deriva las opciones de grupo a partir de groupsClas (sin groupOptions prop)', () => {
    const groupsClas = [
      buildGroupClas({ id: 'a', tournamentGroup: { group: 1 } }),
      buildGroupClas({ id: 'b', tournamentGroup: { group: 3 } }),
      buildGroupClas({ id: 'c', tournamentGroup: { group: 2 } }),
    ];
    renderWithProviders(
      <GroupClassificationsTableContainer
        data={{ groupsClas, groupMatches: [], playersKnockout: 2 }}
        selectedGroup="3"
        {...baseProps}
      />,
    );
    // El Select muestra el label del grupo controlado -> prueba que groupOptions
    // fue derivado incluyendo value '3' / label 'Grupo 3' (sin pasarla como prop).
    expect(screen.getByDisplayValue('Grupo 3')).toBeInTheDocument();
  });

  it('renderiza la clasificacion con el jugador del grupo controlado', () => {
    const groupsClas = [
      buildGroupClas({ id: 'a', position: 1, tournamentGroup: { group: 1 } }),
    ];
    const { container } = renderWithProviders(
      <GroupClassificationsTableContainer
        data={{ groupsClas, groupMatches: [], playersKnockout: 2 }}
        selectedGroup="1"
        {...baseProps}
      />,
    );
    expect(container.textContent).toContain('Ana García');
  });

  it('muestra los partidos del grupo controlado con nombres y estados', () => {
    const groupMatches = [
      buildGroupMatch({
        id: 'm1',
        status: 'Completado',
        playerOne: bracketPlayer('p1', 'Ana'),
        playerTwo: bracketPlayer('p2', 'Luis'),
      }),
    ];
    const { container } = renderWithProviders(
      <GroupClassificationsTableContainer
        data={{ groupsClas: [], groupMatches, playersKnockout: 2 }}
        selectedGroup="1"
        {...baseProps}
      />,
    );
    expect(container.textContent).toContain('Partidos del Grupo');
    expect(container.textContent).toContain('Ana García');
    expect(container.textContent).toContain('Completado');
  });

  it('llama a onEditMatch al clickar Actualizar cuando es admin y status Grupos', () => {
    const onEditMatch = vi.fn();
    const groupMatches = [buildGroupMatch({ id: 'm1', status: 'Programado' })];
    renderWithProviders(
      <GroupClassificationsTableContainer
        data={{ groupsClas: [], groupMatches, playersKnockout: 2 }}
        selectedGroup="1"
        isAdmin
        tournamentStatus="Grupos"
        onEditMatch={onEditMatch}
      />,
    );
    fireEvent.click(screen.getAllByText('Actualizar')[0]);
    expect(onEditMatch).toHaveBeenCalledWith(groupMatches[0], false);
  });

  it('deshabilita Actualizar cuando tournamentStatus no es Grupos', () => {
    const onEditMatch = vi.fn();
    const groupMatches = [buildGroupMatch({ id: 'm1', status: 'Programado' })];
    renderWithProviders(
      <GroupClassificationsTableContainer
        data={{ groupsClas: [], groupMatches, playersKnockout: 2 }}
        selectedGroup="1"
        isAdmin
        tournamentStatus="Completado"
        onEditMatch={onEditMatch}
      />,
    );
    const button = screen.getAllByRole('button')[0];
    expect(button).toBeDisabled();
  });

});
