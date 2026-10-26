import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import { TournamentHeader } from './TournamentHeader';
import type { Tournament, TournamentParticipant } from '../../types/tournament';

const mockTournament = (overrides: Partial<Tournament> = {}): Tournament => ({
  id: 't1',
  name: 'Torneo Test',
  dateStart: '2025-01-01',
  numPlayers: 8,
  typeTournament: 'Interno',
  levelTournament: 'Mixto',
  rounds: 'GruposKnockout',
  status: 'Programado',
  participants: [],
  ...overrides,
});

const mockParticipant = (overrides: Partial<TournamentParticipant> = {}): TournamentParticipant =>
  ({
    id: 'p1',
    registeredAt: '2025-01-01',
    status: 'Confirmado',
    player: {
      id: 'player-1',
      name: 'Juan',
      surname: 'Pérez',
      avatarUrl: null,
      stats: { elo: 1500 },
    },
    ...overrides,
  });

const baseProps = {
  isAdmin: false,
  isPlayer: false,
  isEnrolled: false,
  isRegistering: false,
  isGenerating: false,
  confirmedPlayersCount: 0,
  participants: null,
  myParticipation: null,
  onInscribirse: vi.fn(),
  onGenerateTournament: vi.fn(),
  onOpenEditFormat: vi.fn(),
  onDeleteTournament: vi.fn(),
  onOpenEnrollModal: vi.fn(),
  onOpenSwapModal: vi.fn(),
};

describe('TournamentHeader', () => {
  it('renderiza el nombre del torneo y los badges', () => {
    renderWithProviders(
      <TournamentHeader
        tournament={mockTournament()}
        {...baseProps}
      />,
    );

    expect(screen.getByText('Torneo Test')).toBeInTheDocument();
    expect(screen.getByText('Programado')).toBeInTheDocument();
    expect(screen.getByText('Interno')).toBeInTheDocument();
    expect(screen.getByText('Mixto')).toBeInTheDocument();
  });

  it('muestra el botón de volver atrás', () => {
    renderWithProviders(
      <TournamentHeader
        tournament={mockTournament()}
        {...baseProps}
      />,
    );

    expect(screen.getByText('Volver a Torneos')).toBeInTheDocument();
  });

  it('muestra botones admin en fase Programado', () => {
    renderWithProviders(
      <TournamentHeader
        tournament={mockTournament()}
        {...baseProps}
        isAdmin
      />,
    );

    expect(screen.getByText('Ajustar Formato')).toBeInTheDocument();
    expect(screen.getByText('Añadir Inscritos')).toBeInTheDocument();
    expect(screen.getByText('Iniciar Torneo')).toBeInTheDocument();
    expect(screen.getByText(/Quedan 8 plazas/)).toBeInTheDocument();
  });

  it('no muestra botones admin cuando isAdmin es false', () => {
    renderWithProviders(
      <TournamentHeader
        tournament={mockTournament()}
        {...baseProps}
      />,
    );

    expect(screen.queryByText('Ajustar Formato')).not.toBeInTheDocument();
    expect(screen.queryByText('Iniciar Torneo')).not.toBeInTheDocument();
  });

  it('muestra "Intercambiar Jugadores" en fase Grupos para admin', () => {
    renderWithProviders(
      <TournamentHeader
        tournament={mockTournament({ status: 'Grupos' })}
        {...baseProps}
        isAdmin
      />,
    );

    expect(screen.getByText('Intercambiar Jugadores')).toBeInTheDocument();
  });

  it('muestra botón de inscripción para jugador no inscrito', () => {
    renderWithProviders(
      <TournamentHeader
        tournament={mockTournament()}
        {...baseProps}
        isPlayer
      />,
    );

    expect(screen.getByText('Inscribirme')).toBeInTheDocument();
  });

  it('muestra "Inscripción Confirmada" cuando el jugador está inscrito', () => {
    const participant = mockParticipant({ status: 'Confirmado' });
    renderWithProviders(
      <TournamentHeader
        tournament={mockTournament()}
        {...baseProps}
        isPlayer
        isEnrolled
        confirmedPlayersCount={1}
        myParticipation={participant}
      />,
    );

    expect(screen.getByText('Inscripción Confirmada')).toBeInTheDocument();
  });

  it('muestra "Torneo Completo" cuando está lleno y jugador no inscrito', () => {
    const participants = [
      mockParticipant(),
      mockParticipant({ id: 'p2', player: { id: 'player-2', name: 'B', surname: null, avatarUrl: null, stats: { elo: 1500 } } }),
      mockParticipant({ id: 'p3', player: { id: 'player-3', name: 'C', surname: null, avatarUrl: null, stats: { elo: 1500 } } }),
      mockParticipant({ id: 'p4', player: { id: 'player-4', name: 'D', surname: null, avatarUrl: null, stats: { elo: 1500 } } }),
    ];
    renderWithProviders(
      <TournamentHeader
        tournament={mockTournament({ numPlayers: 4, participants })}
        {...baseProps}
        isPlayer
        participants={participants}
        confirmedPlayersCount={4}
      />,
    );

    expect(screen.getByText('Torneo Completo')).toBeInTheDocument();
  });

  it('llama a onInscribirse al hacer click', () => {
    const onInscribirse = vi.fn();
    renderWithProviders(
      <TournamentHeader
        tournament={mockTournament()}
        {...baseProps}
        isPlayer
        onInscribirse={onInscribirse}
      />,
    );

    fireEvent.click(screen.getByText('Inscribirme'));
    expect(onInscribirse).toHaveBeenCalledTimes(1);
  });

  it('no renderiza botones admin en fase Completado', () => {
    renderWithProviders(
      <TournamentHeader
        tournament={mockTournament({ status: 'Completado' })}
        {...baseProps}
        isAdmin
      />,
    );

    expect(screen.queryByText('Ajustar Formato')).not.toBeInTheDocument();
    expect(screen.queryByText('Iniciar Torneo')).not.toBeInTheDocument();
    expect(screen.queryByText('Intercambiar Jugadores')).not.toBeInTheDocument();
  });
});
