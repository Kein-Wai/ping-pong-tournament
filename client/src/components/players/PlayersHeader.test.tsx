import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { chooseOption, optionsOf, renderWithProviders } from '../../test/utils';
import { PlayersHeader } from './PlayersHeader';

const renderHeader = (props: Partial<React.ComponentProps<typeof PlayersHeader>> = {}) => {
  const handlers = { onSearchChange: vi.fn(), onStatusChange: vi.fn(), onAddPlayer: vi.fn() };
  const view = renderWithProviders(
    <PlayersHeader canManage search="" statusFilter="Aprobado" {...handlers} {...props} />,
  );
  return { ...view, ...handlers };
};

describe('PlayersHeader', () => {
  it('muestra el título', () => {
    renderHeader();

    expect(screen.getByRole('heading', { name: 'Plantilla de Jugadores' })).toBeInTheDocument();
  });

  it('quien gestiona puede añadir jugadores', () => {
    const { onAddPlayer } = renderHeader();

    fireEvent.click(screen.getByRole('button', { name: 'Añadir Jugador' }));

    expect(onAddPlayer).toHaveBeenCalledTimes(1);
  });

  it('quien no gestiona no ve el botón de añadir', () => {
    renderHeader({ canManage: false });

    expect(screen.queryByRole('button', { name: 'Añadir Jugador' })).not.toBeInTheDocument();
  });

  it('el buscador muestra el texto y avisa de cada cambio', () => {
    const { onSearchChange } = renderHeader({ search: 'ana' });
    const input = screen.getByPlaceholderText('Buscar jugador...');
    expect(input).toHaveValue('ana');

    fireEvent.change(input, { target: { value: 'anab' } });

    expect(onSearchChange).toHaveBeenCalledTimes(1);
  });

  it('el filtro muestra el estado elegido y ofrece plantilla, solicitudes y bajas', () => {
    renderHeader();

    expect(screen.getByDisplayValue('Plantilla')).toBeInTheDocument();
    expect(optionsOf(/^$/)).toEqual(['Plantilla', 'Solicitudes', 'Bajas/Rechazos']);
  });

  it('elegir un estado avisa con su valor', () => {
    const { onStatusChange } = renderHeader();

    chooseOption(/^$/, 'Solicitudes');

    expect(onStatusChange).toHaveBeenCalledWith('Pendiente', expect.anything());
  });
});
