import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import type { PlayerListItem } from '../../types/players';
import { PlayersTable } from './PlayersTable';

const player = (overrides: Partial<PlayerListItem> = {}): PlayerListItem => ({
  id: 'p1',
  email: 'p1@test.com',
  name: 'Ana',
  clubStatus: 'Aprobado',
  ...overrides,
});

const renderTable = (props: Partial<React.ComponentProps<typeof PlayersTable>> = {}) => {
  const handlers = {
    onProcessRequest: vi.fn(),
    onEditElo: vi.fn(),
    onResetAccount: vi.fn(),
    onViewProfile: vi.fn(),
  };
  const view = renderWithProviders(
    <PlayersTable
      players={[player(), player({ id: 'p2', name: 'Luis' })]}
      canManage
      isSuperAdmin={false}
      {...handlers}
      {...props}
    />,
  );
  return { ...view, ...handlers };
};

describe('PlayersTable', () => {
  it('pinta una fila por jugador', () => {
    renderTable();

    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('Luis')).toBeInTheDocument();
  });

  it('quien gestiona ve la columna Estado', () => {
    renderTable();

    expect(screen.getByRole('columnheader', { name: 'Estado' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Acciones' })).toBeInTheDocument();
  });

  it('quien no gestiona no ve la columna Estado', () => {
    renderTable({ canManage: false });

    expect(screen.queryByRole('columnheader', { name: 'Estado' })).not.toBeInTheDocument();
  });

  it('sin jugadores avisa de que no se encontró ninguno', () => {
    renderTable({ players: [] });

    expect(screen.getByText('No se encontraron jugadores.')).toBeInTheDocument();
  });

  it('el aviso de vacío ocupa todas las columnas: cinco al gestionar, cuatro si no', () => {
    const { unmount } = renderTable({ players: [] });
    expect(screen.getByText('No se encontraron jugadores.').closest('td')).toHaveAttribute(
      'colspan',
      '5',
    );
    unmount();

    renderTable({ players: [], canManage: false });
    expect(screen.getByText('No se encontraron jugadores.').closest('td')).toHaveAttribute(
      'colspan',
      '4',
    );
  });

  it('pasa a la fila las acciones de ver el perfil', () => {
    const { container, onViewProfile } = renderTable();

    fireEvent.click(
      container.querySelector('.tabler-icon-eye')?.closest('button') as HTMLElement,
    );

    expect(onViewProfile).toHaveBeenCalledWith('p1');
  });
});
