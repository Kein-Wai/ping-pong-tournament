import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from '../../test/utils';
import { EnrollModal } from './EnrollModal';
import type { Tournament, TournamentParticipant, ClubPlayer } from '../../types/tournament';

const mockTournament: Tournament = {
  id: 't1',
  name: 'Torneo Test',
  dateStart: '2026-01-01T00:00:00Z',
  numPlayers: 4,
};

const mockClubPlayers: ClubPlayer[] = [
  { id: 'p1', name: 'Ana', surname: 'García', avatarUrl: null },
  { id: 'p2', name: 'Luis', surname: 'Pérez', avatarUrl: null },
];

const mockParticipants: TournamentParticipant[] = [
  {
    id: 'part-1',
    registeredAt: '2026-01-01T00:00:00Z',
    status: 'Confirmado',
    player: {
      id: 'p3',
      name: 'Carlos',
      surname: 'López',
      avatarUrl: null,
      stats: null,
    },
  },
];

describe('EnrollModal', () => {
  it('muestra el titulo "Inscripción Manual (Entrenador)"', () => {
    const { getByText } = renderWithProviders(
      <EnrollModal
        opened
        onClose={vi.fn()}
        tournament={mockTournament}
        participants={null}
        clubPlayers={mockClubPlayers}
        checkedToEnroll={[]}
        setCheckedToEnroll={vi.fn()}
        onEnroll={vi.fn()}
        enrolling={false}
      />,
    );
    expect(getByText('Inscripción Manual (Entrenador)')).toBeInTheDocument();
  });

  it('muestra los jugadores del club con nombre y apellido', () => {
    const { getByText } = renderWithProviders(
      <EnrollModal
        opened
        onClose={vi.fn()}
        tournament={mockTournament}
        participants={mockParticipants}
        clubPlayers={mockClubPlayers}
        checkedToEnroll={[]}
        setCheckedToEnroll={vi.fn()}
        onEnroll={vi.fn()}
        enrolling={false}
      />,
    );
    expect(getByText('Ana García')).toBeInTheDocument();
    expect(getByText('Luis Pérez')).toBeInTheDocument();
  });

  it('deshabilita el boton cuando no hay jugadores seleccionados', () => {
    const { getByRole } = renderWithProviders(
      <EnrollModal
        opened
        onClose={vi.fn()}
        tournament={mockTournament}
        participants={null}
        clubPlayers={mockClubPlayers}
        checkedToEnroll={[]}
        setCheckedToEnroll={vi.fn()}
        onEnroll={vi.fn()}
        enrolling={false}
      />,
    );
    const button = getByRole('button', { name: 'Inscribir 0 Jugadores' });
    expect(button).toBeDisabled();
  });

  it('llama a onEnroll al hacer click en el boton de inscripcion', async () => {
    const onEnroll = vi.fn();
    const { getByRole } = renderWithProviders(
      <EnrollModal
        opened
        onClose={vi.fn()}
        tournament={mockTournament}
        participants={null}
        clubPlayers={mockClubPlayers}
        checkedToEnroll={['p1']}
        setCheckedToEnroll={vi.fn()}
        onEnroll={onEnroll}
        enrolling={false}
      />,
    );
    const button = getByRole('button', { name: 'Inscribir 1 Jugadores' });
    await button.click();
    expect(onEnroll).toHaveBeenCalledTimes(1);
  });
});
