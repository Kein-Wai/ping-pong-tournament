import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from '../../test/utils';
import { ParticipantsTable } from './ParticipantsTable';
import type { TournamentParticipant } from '../../types/tournament';
import { PlayerTournamentStatus } from '../../types/enums';

const buildParticipant = (
  overrides: Partial<TournamentParticipant> = {},
): TournamentParticipant =>
  ({
    id: 'part-1',
    registeredAt: '2025-01-01T00:00:00Z',
    status: PlayerTournamentStatus.Pendiente,
    player: {
      id: 'player-1',
      name: 'Ana',
      surname: 'García',
      avatarUrl: null,
      stats: { elo: 1200 },
    },
    ...overrides,
  });

describe('ParticipantsTable', () => {
  it('muestra el loader cuando participants es null', () => {
    const { container, queryByText } = renderWithProviders(
      <ParticipantsTable
        participants={null}
        isAdmin={false}
        isProgramado={false}
      />,
    );
    expect(queryByText('Aún no hay jugadores inscritos.')).not.toBeInTheDocument();
    expect(container.innerHTML).toContain('mantine-Loader');
  });

  it('muestra el mensaje vacio cuando participants esta vacio', () => {
    const { getByText } = renderWithProviders(
      <ParticipantsTable
        participants={[]}
        isAdmin={false}
        isProgramado={false}
      />,
    );
    expect(getByText('Aún no hay jugadores inscritos.')).toBeInTheDocument();
  });

  it('muestra el nombre de jugador, ELO y estado', () => {
    const { getByText } = renderWithProviders(
      <ParticipantsTable
        participants={[buildParticipant()]}
        isAdmin={false}
        isProgramado={false}
      />,
    );
    expect(getByText('Ana García')).toBeInTheDocument();
    expect(getByText('1200')).toBeInTheDocument();
    expect(getByText(PlayerTournamentStatus.Pendiente)).toBeInTheDocument();
  });

  it('muestra la columna "Acciones (Pase de lista)" solo cuando isAdmin y isProgramado', () => {
    const { getByText, rerenderWithProviders } = renderWithProviders(
      <ParticipantsTable
        participants={[buildParticipant()]}
        isAdmin
        isProgramado
      />,
    );
    expect(getByText('Acciones (Pase de lista)')).toBeInTheDocument();

    rerenderWithProviders(
      <ParticipantsTable
        participants={[buildParticipant()]}
        isAdmin={false}
        isProgramado={false}
      />,
    );
    expect(() => getByText('Acciones (Pase de lista)')).toThrow();
  });

  it('no muestra el icono de confirmar cuando el estado es Confirmado', () => {
    const { getAllByRole } = renderWithProviders(
      <ParticipantsTable
        participants={[
          buildParticipant({ status: PlayerTournamentStatus.Confirmado }),
        ]}
        isAdmin
        isProgramado
      />,
    );
    const buttons = getAllByRole('button');
    // When Confirmed: p.status !== 'Confirmado' is false → no confirm icon
    //                   p.status !== 'NoPresentado' is true → only sanction icon
    expect(buttons.length).toBe(1);
  });

  it('llama a onStatusChange al hacer click en confirmar', async () => {
    const onStatusChange = vi.fn();
    const { getAllByRole } = renderWithProviders(
      <ParticipantsTable
        participants={[buildParticipant()]}
        isAdmin
        isProgramado
        onStatusChange={onStatusChange}
      />,
    );
    const buttons = getAllByRole('button');
    // buttons[0] = confirm (green), buttons[1] = sanction (red)
    await buttons[0].click();
    expect(onStatusChange).toHaveBeenCalledWith(
      'player-1',
      'Ana',
      'García',
      'Confirmado',
    );
  });
});
