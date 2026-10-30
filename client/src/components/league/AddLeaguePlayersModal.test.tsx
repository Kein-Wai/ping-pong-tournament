import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import { AddLeaguePlayersModal } from './AddLeaguePlayersModal';

const PLAYERS = [
  { id: 'p1', name: 'Ana', surname: 'Ruiz', avatarUrl: null },
  { id: 'p2', name: 'Luis', surname: null, avatarUrl: null },
];

const renderModal = (props: Partial<React.ComponentProps<typeof AddLeaguePlayersModal>> = {}) => {
  const onChange = vi.fn();
  const onSubmit = vi.fn();
  renderWithProviders(
    <AddLeaguePlayersModal
      opened
      onClose={vi.fn()}
      players={PLAYERS}
      checked={[]}
      onChange={onChange}
      onSubmit={onSubmit}
      submitting={false}
      {...props}
    />,
  );
  return { onChange, onSubmit };
};

describe('AddLeaguePlayersModal', () => {
  it('lista los jugadores disponibles', () => {
    renderModal();

    expect(screen.getByText('Ana Ruiz')).toBeInTheDocument();
    expect(screen.getByText('Luis')).toBeInTheDocument();
  });

  it('avisa cuando no queda nadie por añadir', () => {
    renderModal({ players: [] });

    expect(screen.getByText('Todos los jugadores del club ya están en la liga.')).toBeInTheDocument();
  });

  it('marca un jugador al pulsarlo', () => {
    const { onChange } = renderModal();

    fireEvent.click(screen.getByText('Ana Ruiz'));

    expect(onChange).toHaveBeenCalledWith(['p1']);
  });

  it('desmarca un jugador ya marcado', () => {
    const { onChange } = renderModal({ checked: ['p1', 'p2'] });

    fireEvent.click(screen.getByText('Ana Ruiz'));

    expect(onChange).toHaveBeenCalledWith(['p2']);
  });

  it('el botón de añadir cuenta los marcados y está desactivado sin ninguno', () => {
    renderModal({ checked: [] });

    expect(screen.getByRole('button', { name: 'Añadir 0 jugadores' })).toBeDisabled();
  });

  it('añade los marcados', () => {
    const { onSubmit } = renderModal({ checked: ['p1', 'p2'] });

    fireEvent.click(screen.getByRole('button', { name: 'Añadir 2 jugadores' }));

    expect(onSubmit).toHaveBeenCalled();
  });
});
