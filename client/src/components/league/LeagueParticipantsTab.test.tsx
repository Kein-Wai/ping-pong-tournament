import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, within } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import { LeagueParticipantsTab } from './LeagueParticipantsTab';
import type { LeagueParticipant } from '../../types/league';

const participant = (id: string, name: string, status: LeagueParticipant['status']): LeagueParticipant => ({
  id: `pp-${id}`,
  leagueId: 'l1',
  playerId: id,
  registeredAt: '2026-11-01T10:00:00.000Z',
  status,
  player: { id, name, surname: 'Test', avatarUrl: null },
});

const PARTICIPANTS = [
  participant('p1', 'Ana', 'Confirmado'),
  participant('p2', 'Luis', 'Pendiente'),
  participant('p3', 'Eva', 'NoPresentado'),
];

const renderTab = (props: Partial<React.ComponentProps<typeof LeagueParticipantsTab>> = {}) => {
  const handlers = {
    onAdd: vi.fn(),
    onConfirm: vi.fn(),
    onRemove: vi.fn(),
    onWithdraw: vi.fn(),
  };
  renderWithProviders(
    <LeagueParticipantsTab
      participants={PARTICIPANTS}
      leagueStatus="Programado"
      isAdmin
      {...handlers}
      {...props}
    />,
  );
  return handlers;
};

const rowOf = (name: string) => screen.getByText(new RegExp(name)).closest('tr') as HTMLElement;

describe('LeagueParticipantsTab', () => {
  it('lista a cada jugador con su estado', () => {
    renderTab();

    expect(within(rowOf('Ana')).getByText('Confirmado')).toBeInTheDocument();
    expect(within(rowOf('Luis')).getByText('Pendiente')).toBeInTheDocument();
    expect(within(rowOf('Eva')).getByText('Retirado')).toBeInTheDocument();
  });

  it('avisa cuando no hay jugadores', () => {
    renderTab({ participants: [] });

    expect(screen.getByText('Todavía no hay jugadores en esta liga.')).toBeInTheDocument();
  });

  describe('liga Programada', () => {
    it('el administrador puede confirmar a un pendiente', () => {
      const { onConfirm } = renderTab();

      fireEvent.click(within(rowOf('Luis')).getByRole('button', { name: 'Confirmar' }));

      expect(onConfirm).toHaveBeenCalledWith('p2');
    });

    it('solo los pendientes tienen el botón de confirmar', () => {
      renderTab();

      expect(within(rowOf('Ana')).queryByRole('button', { name: 'Confirmar' })).not.toBeInTheDocument();
    });

    it('el administrador puede quitar a un jugador', () => {
      const { onRemove } = renderTab();

      fireEvent.click(within(rowOf('Ana')).getByRole('button', { name: 'Quitar' }));

      expect(onRemove).toHaveBeenCalledWith('p1');
    });

    it('el administrador puede añadir jugadores', () => {
      const { onAdd } = renderTab();

      fireEvent.click(screen.getByRole('button', { name: /Añadir jugadores/ }));

      expect(onAdd).toHaveBeenCalled();
    });
  });

  describe('liga Iniciada', () => {
    it('el administrador puede retirar a un jugador activo, pero no añadir ni quitar', () => {
      const { onWithdraw } = renderTab({ leagueStatus: 'Iniciado' });

      fireEvent.click(within(rowOf('Ana')).getByRole('button', { name: 'Retirar' }));

      expect(onWithdraw).toHaveBeenCalledWith('p1');
      expect(screen.queryByRole('button', { name: /Añadir jugadores/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Quitar' })).not.toBeInTheDocument();
    });

    it('un jugador ya retirado no se puede volver a retirar', () => {
      renderTab({ leagueStatus: 'Iniciado' });

      expect(within(rowOf('Eva')).queryByRole('button', { name: 'Retirar' })).not.toBeInTheDocument();
    });
  });

  it.each(['Completado', 'Cancelado'] as const)('con la liga %s no hay ninguna acción', (leagueStatus) => {
    renderTab({ leagueStatus });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('un jugador que no administra no ve ninguna acción', () => {
    renderTab({ isAdmin: false });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
