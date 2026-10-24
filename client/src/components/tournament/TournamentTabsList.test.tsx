import { describe, it, expect } from 'vitest';
import { Tabs } from '@mantine/core';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import { TournamentTabsList } from './TournamentTabsList';
import type { Tournament, TournamentParticipant } from '../../types/tournament';

const createMockTournament = (over: Partial<Tournament> = {}): Tournament =>
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

const renderTabsList = (overrides: {
  tournament?: Tournament | null;
  participants?: TournamentParticipant[] | null;
  isProgramado?: boolean;
  isGrupos?: boolean;
  isKnockoutPhase?: boolean;
  isCompletado?: boolean;
  hasGroupsFormat?: boolean;
  hasKnockoutFormat?: boolean;
}) => {
  const props = {
    tournament: overrides.tournament ?? createMockTournament(),
    participants: overrides.participants ?? null,
    isProgramado: overrides.isProgramado ?? false,
    isGrupos: overrides.isGrupos ?? false,
    isKnockoutPhase: overrides.isKnockoutPhase ?? false,
    isCompletado: overrides.isCompletado ?? false,
    hasGroupsFormat: overrides.hasGroupsFormat ?? false,
    hasKnockoutFormat: overrides.hasKnockoutFormat ?? false,
  };
  return renderWithProviders(
    <Tabs value={null}>
      <TournamentTabsList {...props} />
    </Tabs>,
  );
};

describe('TournamentTabsList', () => {
  it('siempre muestra la pestaña Información', () => {
    renderTabsList({});
    expect(screen.getByText('Información')).toBeInTheDocument();
  });

  it('muestra Inscritos con el contador cuando isProgramado', () => {
    const participants: TournamentParticipant[] = [
      { id: 'p1', registeredAt: '', status: 'Confirmado', player: { id: 'p1', name: 'Ana', surname: null, avatarUrl: null, stats: { elo: 100 } } },
      { id: 'p2', registeredAt: '', status: 'Pendiente', player: { id: 'p2', name: 'Bea', surname: null, avatarUrl: null, stats: { elo: 100 } } },
    ];
    renderTabsList({ isProgramado: true, participants });
    expect(screen.getByText('Inscritos (2)')).toBeInTheDocument();
  });

  it('NO muestra Inscritos cuando no hay fase activa', () => {
    renderTabsList({});
    expect(screen.queryByText(/Inscritos/)).not.toBeInTheDocument();
  });

  it('muestra Resultados Finales solo cuando isCompletado', () => {
    renderTabsList({ isCompletado: true });
    expect(screen.getByText('Resultados Finales')).toBeInTheDocument();
  });

  it('NO muestra Resultados Finales cuando no es completado', () => {
    renderTabsList({});
    expect(screen.queryByText('Resultados Finales')).not.toBeInTheDocument();
  });

  it('muestra Fase de Grupos para GruposKnockout', () => {
    const tournament = createMockTournament({ rounds: 'GruposKnockout' });
    renderTabsList({ tournament, hasGroupsFormat: true, isGrupos: true });
    expect(screen.getByText('Fase de Grupos')).toBeInTheDocument();
  });

  it('muestra Clasificación y Partidos para TodosvsTodos', () => {
    const tournament = createMockTournament({ rounds: 'TodosvsTodos' });
    renderTabsList({ tournament, hasGroupsFormat: true, isGrupos: true });
    expect(screen.getByText('Clasificación y Partidos')).toBeInTheDocument();
  });

  it('muestra Cuadro Llave A cuando hasKnockoutFormat y fase knockout', () => {
    const tournament = createMockTournament({ rounds: 'GruposKnockout', status: 'Octavos' });
    renderTabsList({ tournament, hasKnockoutFormat: true, isKnockoutPhase: true });
    expect(screen.getByText('Cuadro Llave A')).toBeInTheDocument();
  });

  it('NO muestra Cuadro Llave A para TodosvsTodos', () => {
    const tournament = createMockTournament({ rounds: 'TodosvsTodos', status: 'Octavos' });
    renderTabsList({ tournament, hasKnockoutFormat: true, isKnockoutPhase: true });
    expect(screen.queryByText('Cuadro Llave A')).not.toBeInTheDocument();
  });

  it('muestra Cuadro Llave B solo cuando typeKnockout es LlaveAB', () => {
    const tournament = createMockTournament({ rounds: 'GruposKnockout', status: 'Octavos', typeKnockout: 'LlaveAB' });
    renderTabsList({ tournament, hasKnockoutFormat: true, isKnockoutPhase: true });
    expect(screen.getByText('Cuadro Llave B')).toBeInTheDocument();
  });

  it('NO muestra Cuadro Llave B cuando typeKnockout es LlaveA', () => {
    const tournament = createMockTournament({ rounds: 'GruposKnockout', status: 'Octavos', typeKnockout: 'LlaveA' });
    renderTabsList({ tournament, hasKnockoutFormat: true, isKnockoutPhase: true });
    expect(screen.queryByText('Cuadro Llave B')).not.toBeInTheDocument();
  });

  it('muestra todas las pestañas disponibles en estado Completado + GruposKnockout + LlaveAB', () => {
    const tournament = createMockTournament({ status: 'Completado', rounds: 'GruposKnockout', typeKnockout: 'LlaveAB' });
    renderTabsList({
      tournament,
      hasGroupsFormat: true,
      hasKnockoutFormat: true,
      isCompletado: true,
    });
    expect(screen.getByText('Información')).toBeInTheDocument();
    expect(screen.getByText('Resultados Finales')).toBeInTheDocument();
    expect(screen.getByText('Fase de Grupos')).toBeInTheDocument();
    expect(screen.getByText('Cuadro Llave A')).toBeInTheDocument();
    expect(screen.getByText('Cuadro Llave B')).toBeInTheDocument();
  });
});