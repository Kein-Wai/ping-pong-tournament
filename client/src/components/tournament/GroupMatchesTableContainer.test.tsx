import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import { GroupMatchesTableContainer } from './GroupMatchesTableContainer';
import type { GroupMatch } from '../../types/tournament';

const createMockMatch = (over: Partial<GroupMatch> = {}): GroupMatch =>
  ({
    id: 'm1',
    status: 'Programado',
    setOnePlayerOne: 11,
    setOnePlayerTwo: 9,
    setTwoPlayerOne: 11,
    setTwoPlayerTwo: 7,
    setThreePlayerOne: null,
    setThreePlayerTwo: null,
    setFourPlayerOne: null,
    setFourPlayerTwo: null,
    setFivePlayerOne: null,
    setFivePlayerTwo: null,
    playerOne: { id: 'p1', name: 'Juan', surname: 'Pérez' },
    playerTwo: { id: 'p2', name: 'María', surname: 'García' },
    group: { id: 'g1', group: 1 },
    ...over,
  } as GroupMatch);

const baseProps = {
  isAdmin: false,
  tournamentStatus: 'Grupos',
  onEditMatch: vi.fn(),
};

describe('GroupMatchesTableContainer', () => {
  it('muestra el loader cuando matches es null', () => {
    const { container } = renderWithProviders(
      <GroupMatchesTableContainer matches={null} {...baseProps} />,
    );
    expect(container.querySelector('.mantine-Loader-root')).toBeInTheDocument();
  });

  it('muestra mensaje cuando no hay partidos', () => {
    const { container } = renderWithProviders(
      <GroupMatchesTableContainer matches={[]} {...baseProps} />,
    );
    expect(container.textContent).toContain('No hay partidos en esta fase.');
  });

  it('deriva las opciones de grupo a partir de los partidos (sin groupOptions prop)', () => {
    const matches = [
      createMockMatch({ id: 'm1', group: { id: 'g1', group: 1 } }),
      createMockMatch({ id: 'm2', group: { id: 'g2', group: 2 } }),
      createMockMatch({ id: 'm3', group: { id: 'g3', group: 3 } }),
    ];
    const { container } = renderWithProviders(
      <GroupMatchesTableContainer matches={matches} {...baseProps} />,
    );
    // 3 grupos distintos + la opcion "Todos los grupos"
    const optionCount = container.querySelectorAll('select option').length;
    expect(optionCount).toBe(4);
  });

  it('filtra partidos por grupo seleccionado en el select', () => {
    const matches = [
      createMockMatch({
        id: 'm1',
        group: { id: 'g1', group: 1 },
        playerOne: { id: 'p1', name: 'AnaGrupo1', surname: null },
      }),
      createMockMatch({
        id: 'm2',
        group: { id: 'g3', group: 3 },
        playerOne: { id: 'p2', name: 'LuisGrupo3', surname: null },
      }),
    ];
    const { container } = renderWithProviders(
      <GroupMatchesTableContainer matches={matches} {...baseProps} />,
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '3' } });

    expect(container.textContent).toContain('LuisGrupo3');
    expect(container.textContent).not.toContain('AnaGrupo1');
  });

  it('llama a onEditMatch al clickar Actualizar cuando es admin y status Grupos', () => {
    const onEditMatch = vi.fn();
    const matches = [createMockMatch({ id: 'm1', status: 'Programado' })];
    renderWithProviders(
      <GroupMatchesTableContainer
        matches={matches}
        isAdmin
        tournamentStatus="Grupos"
        onEditMatch={onEditMatch}
      />,
    );

    fireEvent.click(screen.getAllByText('Actualizar')[0]);
    expect(onEditMatch).toHaveBeenCalledWith(matches[0], false);
  });

  it('NO muestra el boton Actualizar cuando isAdmin es false', () => {
    const matches = [createMockMatch()];
    const { container } = renderWithProviders(
      <GroupMatchesTableContainer matches={matches} {...baseProps} />,
    );
    expect(container.textContent).not.toContain('Actualizar');
  });

  it('deshabilita Actualizar cuando tournamentStatus no es Grupos', () => {
    const onEditMatch = vi.fn();
    const matches = [createMockMatch({ status: 'Programado' })];
    renderWithProviders(
      <GroupMatchesTableContainer
        matches={matches}
        isAdmin
        tournamentStatus="Completado"
        onEditMatch={onEditMatch}
      />,
    );
    const button = screen.getAllByRole('button')[0];
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onEditMatch).not.toHaveBeenCalled();
  });
});
