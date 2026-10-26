import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import type { ClubTeam } from '../../types/api';
import { TeamHeader } from './TeamHeader';

const TEAM = {
  id: 't1',
  name: 'Equipo A',
  category: '1ª Autonómica',
  level: 'Intermedio',
  players: [{ id: 'p1' }, { id: 'p2' }],
  matches: [],
} as unknown as ClubTeam;

const renderHeader = (props: Partial<React.ComponentProps<typeof TeamHeader>> = {}) => {
  const handlers = {
    onDelete: vi.fn(),
    onEdit: vi.fn(),
    onOpenRoster: vi.fn(),
    onAddMatch: vi.fn(),
  };
  const view = renderWithProviders(<TeamHeader team={TEAM} isAdmin {...handlers} {...props} />);
  return { ...view, ...handlers };
};

describe('TeamHeader', () => {
  it('muestra nombre, categoría, nivel y tamaño de la plantilla', () => {
    renderHeader();

    expect(screen.getByRole('heading', { name: 'Equipo A' })).toBeInTheDocument();
    expect(screen.getByText('1ª Autonómica')).toBeInTheDocument();
    expect(screen.getByText('Nivel: Intermedio')).toBeInTheDocument();
    expect(screen.getByText('Plantilla actual: 2 Jugadores')).toBeInTheDocument();
  });

  it('un administrador ve las acciones y cada una avisa', () => {
    const { onEdit, onOpenRoster, onAddMatch, onDelete, container } = renderHeader();

    fireEvent.click(screen.getByRole('button', { name: 'Editar Info' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ajustar Plantilla' }));
    fireEvent.click(screen.getByRole('button', { name: 'Añadir Partido' }));
    fireEvent.click(container.querySelector('.mantine-ActionIcon-root') as HTMLElement);

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onOpenRoster).toHaveBeenCalledTimes(1);
    expect(onAddMatch).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('quien no es administrador no ve ninguna acción', () => {
    const { container } = renderHeader({ isAdmin: false });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(container.querySelector('.mantine-ActionIcon-root')).toBeNull();
    expect(screen.getByText('Plantilla actual: 2 Jugadores')).toBeInTheDocument();
  });
});
