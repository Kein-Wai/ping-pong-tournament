import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import type { TeamMatchAvailability } from '../../types/api';
import { AttendanceBlock } from './AttendanceBlock';

const ANA: TeamMatchAvailability = {
  id: 'a1',
  playerId: 'p1',
  player: { id: 'p1', name: 'Ana', avatarUrl: null },
};
const LUIS: TeamMatchAvailability = {
  id: 'a2',
  playerId: 'p2',
  player: { id: 'p2', name: 'Luis', avatarUrl: null },
};

const renderBlock = (props: Partial<React.ComponentProps<typeof AttendanceBlock>> = {}) => {
  const onToggle = vi.fn();
  const view = renderWithProviders(
    <AttendanceBlock
      availabilities={[ANA, LUIS]}
      confirmed={false}
      disabled={false}
      onToggle={onToggle}
      {...props}
    />,
  );
  return { ...view, onToggle };
};

describe('AttendanceBlock', () => {
  it('muestra la casilla «Voy a ir» y un avatar por cada confirmado', () => {
    const { container } = renderBlock();

    expect(screen.getByRole('checkbox', { name: 'Voy a ir' })).toBeInTheDocument();
    expect(container.querySelectorAll('.mantine-Avatar-root')).toHaveLength(2);
    expect(screen.queryByText('Sin confirmar')).not.toBeInTheDocument();
  });

  it('refleja si el jugador ya confirmó', () => {
    renderBlock({ confirmed: true });

    expect(screen.getByRole('checkbox', { name: 'Voy a ir' })).toBeChecked();
  });

  it('pulsar la casilla avisa a la pantalla', () => {
    const { onToggle } = renderBlock();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Voy a ir' }));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('con disabled la casilla queda deshabilitada', () => {
    renderBlock({ disabled: true });

    expect(screen.getByRole('checkbox', { name: 'Voy a ir' })).toBeDisabled();
  });

  it('sin confirmados dice «Sin confirmar»', () => {
    renderBlock({ availabilities: [] });

    expect(screen.getByText('Sin confirmar')).toBeInTheDocument();
  });

  it('si el partido no trae lista de asistentes no muestra nada', () => {
    const { container } = renderBlock({ availabilities: undefined });

    expect(screen.queryByText('Sin confirmar')).not.toBeInTheDocument();
    expect(container.querySelectorAll('.mantine-Avatar-root')).toHaveLength(0);
  });
});
