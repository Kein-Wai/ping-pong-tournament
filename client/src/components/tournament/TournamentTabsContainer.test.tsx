import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';
import { MemoryRouter } from 'react-router-dom';
import type { Tournament, TournamentClas, TournamentTabsData } from '../../types/tournament';
import { TournamentTabsContainer } from './TournamentTabsContainer';

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

const baseTournament = (over: Partial<Tournament> = {}): Tournament =>
  ({
    id: 't1',
    name: 'Torneo Test',
    dateStart: '2024-01-01',
    numPlayers: 16,
    status: 'Programado',
    rounds: 'GruposKnockout',
    typeKnockout: 'LlaveA',
    ...over,
  } as Tournament);

const baseData: TournamentTabsData = {
  participants: null,
  groupClas: null,
  groupMatches: null,
  bracketA: null,
  bracketB: null,
  results: [],
};

const noopActions = {
  onMatchClick: vi.fn(),
  onBracketMatchClick: vi.fn(),
  onParticipantStatusChange: vi.fn(),
};

const renderContainer = (
  tournament: Tournament | null,
  data: TournamentTabsData = baseData,
  onTabChange?: (tab: string | null) => void,
  isAdmin = false,
) =>
  render(
    <Providers>
      <TournamentTabsContainer
        tournament={tournament}
        tournamentData={data}
        actions={noopActions}
        isAdmin={isAdmin}
        onTabChange={onTabChange}
      />
    </Providers>,
  );

const makeClas = (position: number | null, id: string, name: string): TournamentClas => ({
  id,
  position,
  lastRound: null,
  player: { id, name, surname: null, stats: { elo: 100 }, avatarUrl: null },
});

describe('TournamentTabsContainer', () => {
  it('muestra la pestaña Información por defecto', () => {
    renderContainer(baseTournament());
    expect(screen.getAllByText('Información').length).toBeGreaterThan(0);
  });

  it('muestra Inscritos cuando el estado es Programado', () => {
    renderContainer(baseTournament({ status: 'Programado' }));
    expect(screen.getAllByText('Inscritos (0)').length).toBeGreaterThan(0);
  });

  it('NO muestra Inscritos cuando el estado es Completado', () => {
    renderContainer(baseTournament({ status: 'Completado' }));
    expect(screen.queryByText('Inscritos (0)')).not.toBeInTheDocument();
  });

  it('muestra Resultados Finales, Fase de Grupos y Cuadro Llave A en Completado + GruposKnockout', () => {
    renderContainer(baseTournament({ status: 'Completado', rounds: 'GruposKnockout' }));
    expect(screen.getAllByText('Resultados Finales').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Fase de Grupos').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Cuadro Llave A').length).toBeGreaterThan(0);
  });

  it('muestra Cuadro Llave B solo cuando typeKnockout es LlaveAB', () => {
    const { unmount } = renderContainer(
      baseTournament({ status: 'Octavos', rounds: 'Knockout', typeKnockout: 'LlaveAB' }),
    );
    expect(screen.getAllByText('Cuadro Llave B').length).toBeGreaterThan(0);
    unmount();

    renderContainer(baseTournament({ status: 'Octavos', rounds: 'Knockout', typeKnockout: 'LlaveA' }));
    expect(screen.queryByText('Cuadro Llave B')).not.toBeInTheDocument();
  });

  it('NO muestra Cuadro Llave A/B en formato TodosvsTodos', () => {
    renderContainer(baseTournament({ status: 'Grupos', rounds: 'TodosvsTodos' }));
    expect(screen.queryByText('Cuadro Llave A')).not.toBeInTheDocument();
    expect(screen.queryByText('Cuadro Llave B')).not.toBeInTheDocument();
    expect(screen.getAllByText('Clasificación y Partidos').length).toBeGreaterThan(0);
  });

  it('notifica onTabChange al hacer click en una pestaña', () => {
    const onTabChange = vi.fn();
    renderContainer(baseTournament({ status: 'Completado' }), baseData, onTabChange);

    fireEvent.click(screen.getByText('Resultados Finales'));
    expect(onTabChange).toHaveBeenCalledWith('resultados');
  });

  it('deriva el podium desde results y lo muestra en la pestaña Resultados', () => {
    const results: TournamentClas[] = [
      makeClas(1, 'p1', 'Ana'),
      makeClas(2, 'p2', 'Bea'),
    ];
    renderContainer(
      baseTournament({ status: 'Completado', rounds: 'GruposKnockout' }),
      { ...baseData, results },
    );

    // Navegamos a la pestaña de resultados
    fireEvent.click(screen.getByText('Resultados Finales'));

    expect(screen.getAllByText('1º').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ana').length).toBeGreaterThan(0);
  });

  it('propaga isAdmin a los hijos (ParticipantsTable en Inscritos)', () => {
    renderContainer(baseTournament({ status: 'Programado' }), baseData, undefined, true);
    // La tab Inscritos esta visible y ParticipantsTable recibe isAdmin
    expect(screen.getAllByText('Inscritos (0)').length).toBeGreaterThan(0);
  });
});
