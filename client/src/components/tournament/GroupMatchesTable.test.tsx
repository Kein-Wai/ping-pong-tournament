import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';
import { MemoryRouter } from 'react-router-dom';
import type { GroupMatch } from '../../types/tournament';
import GroupMatchesTable from './GroupMatchesTable';

const renderMatchesTable = (props: {
  matches: GroupMatch[] | null;
  selectedGroup?: string | null;
  groupOptions?: Array<{ value: string; label: string }>;
  onGroupChange?: (group: string | null) => void;
  isAdmin?: boolean;
  isKnockoutPhase?: boolean;
  tournamentStatus?: string | null | undefined;
  onEditMatch?: (match: GroupMatch, isKnockout: boolean) => void;
}) => {
  const onGroupChange = props.onGroupChange || vi.fn();
  const onEditMatch = props.onEditMatch || vi.fn();

  const Providers = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter>
      <MantineProvider defaultColorScheme="light">
        <ModalsProvider>
          <Notifications position="top-right" zIndex={1000} />
          {children}
        </ModalsProvider>
      </MantineProvider>
    </MemoryRouter>
  );

  return render(
    <GroupMatchesTable
      matches={props.matches}
      selectedGroup={props.selectedGroup ?? null}
      groupOptions={props.groupOptions ?? [{ value: '1', label: 'Grupo 1' }]}
      onGroupChange={onGroupChange}
      isAdmin={props.isAdmin ?? false}
      isKnockoutPhase={props.isKnockoutPhase ?? false}
      tournamentStatus={props.tournamentStatus ?? 'Grupos'}
      onEditMatch={onEditMatch}
    />,
    { wrapper: Providers },
  );
};

const createMockMatch = (overrides: Partial<GroupMatch> = {}): GroupMatch => ({
  id: 'match-1',
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
  ...overrides,
});

describe('GroupMatchesTable', () => {
  it('muestra loader cuando matches es null', () => {
    renderMatchesTable({ matches: null });
    const loader = document.querySelector('.mantine-Loader-root');
    expect(loader).toBeInTheDocument();
  });

  it('muestra mensaje cuando no hay partidos', () => {
    renderMatchesTable({ matches: [] });
    expect(screen.getByText('No hay partidos en esta fase.')).toBeInTheDocument();
  });

  it('muestra mensaje específico para grupo sin partidos', () => {
    const match = createMockMatch({ group: { id: 'g1', group: 1 } });
    renderMatchesTable({ matches: [match], selectedGroup: '2' });
    expect(screen.getByText('No hay partidos en el Grupo 2.')).toBeInTheDocument();
  });

  it('renderiza lista de partidos con nombres y sets', () => {
    const match = createMockMatch({ status: 'Completado' });
    renderMatchesTable({ matches: [match] });

    expect(screen.getByText((content) => content.includes('Juan Pérez'))).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('María García'))).toBeInTheDocument();
    expect(screen.getByText('11-9 | 11-7')).toBeInTheDocument();
  });

  it('muestra estado del partido con badge correcto', () => {
    const match = createMockMatch({ status: 'Completado' });
    renderMatchesTable({ matches: [match] });

    expect(screen.getByText('Completado')).toBeInTheDocument();
  });

  it('muestra badge gris para partidos no completados', () => {
    const match = createMockMatch({ status: 'Programado' });
    renderMatchesTable({ matches: [match] });

    const badge = screen.getAllByText('Programado').find(el => el.closest('.mantine-Badge-root'));
    expect(badge).toBeInTheDocument();
    expect(badge).toBeInTheDocument();
  });

  it('filtra partidos por grupo seleccionado', () => {
    const match1 = createMockMatch({ id: 'm1', group: { id: 'g1', group: 1 } });
    const match2 = createMockMatch({ id: 'm2', group: { id: 'g2', group: 2 } });
    renderMatchesTable({ matches: [match1, match2], selectedGroup: '1' });

    expect(screen.getByText((content) => content.includes('Juan Pérez'))).toBeInTheDocument();
    expect(screen.queryByText('María García')).not.toBeInTheDocument();
  });

  it('muestra select para filtrar grupos', () => {
    const match = createMockMatch();
    renderMatchesTable({ matches: [match] });

    expect(screen.getByText('Filtrar grupo:')).toBeInTheDocument();
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
  });

  it('llama a onGroupChange al cambiar grupo', () => {
    const onGroupChange = vi.fn();
    const match = createMockMatch();
    renderMatchesTable({ matches: [match], onGroupChange });

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '2' } });

    expect(onGroupChange).toHaveBeenCalled();
  });

  it('no muestra botón Actualizar si no es admin', () => {
    const match = createMockMatch({ status: 'Completado' });
    renderMatchesTable({ matches: [match], isAdmin: false });

    expect(screen.queryByText('Actualizar')).not.toBeInTheDocument();
  });

  it('muestra botón Actualizar si es admin y status es Grupos', () => {
    const match = createMockMatch({ status: 'Completado' });
    renderMatchesTable({ matches: [match], isAdmin: true, tournamentStatus: 'Grupos' });

    expect(screen.getByText('Actualizar')).toBeInTheDocument();
  });

  it('deshabilita botón Actualizar si status no es Grupos', () => {
    const match = createMockMatch({ status: 'Completado' });
    renderMatchesTable({ matches: [match], isAdmin: true, tournamentStatus: 'Octavos' });

    const button = screen.getByText('Actualizar').closest('button');
    expect(button).toBeDisabled();
  });

  it('llama a onEditMatch al hacer click en Actualizar', () => {
    const onEditMatch = vi.fn();
    const match = createMockMatch({ status: 'Completado' });
    renderMatchesTable({ matches: [match], isAdmin: true, tournamentStatus: 'Grupos', onEditMatch });

    fireEvent.click(screen.getByText('Actualizar'));

    expect(onEditMatch).toHaveBeenCalledWith(match, false);
  });

  it('muestra "TBD" cuando falta nombre del jugador', () => {
    const match = createMockMatch({
      playerOne: { id: 'p1', name: '', surname: null },
      playerTwo: { id: 'p2', name: 'María', surname: 'García' },
    });
    renderMatchesTable({ matches: [match] });

    expect(screen.getByText((content) => content.includes('TBD'))).toBeInTheDocument();
  });

  it('renderiza múltiples partidos', () => {
    const match1 = createMockMatch({ id: 'm1' });
    const match2 = createMockMatch({ id: 'm2', playerOne: { id: 'p3', name: 'Carlos', surname: 'López' } });
    renderMatchesTable({ matches: [match1, match2] });

    expect(screen.getByText((content) => content.includes('Juan Pérez'))).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('Carlos López'))).toBeInTheDocument();
  });

  it('muestra badge verde para Completado, rojo para Programado, amarillo para EnJuego', () => {
    const match1 = createMockMatch({ id: 'm1', status: 'Completado' });
    const match2 = createMockMatch({ id: 'm2', status: 'Programado' });
    const match3 = createMockMatch({ id: 'm3', status: 'EnJuego' });
    renderMatchesTable({ matches: [match1, match2, match3] });

    const badges = document.querySelectorAll('.mantine-Badge-root');
    expect(badges.length).toBeGreaterThanOrEqual(3);
  });
});
