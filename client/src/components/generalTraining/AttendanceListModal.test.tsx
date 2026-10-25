import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { chooseOption, optionsOf, renderWithProviders } from '../../test/utils';
import type { User } from '../../types/api';
import { AttendanceListModal } from './AttendanceListModal';

const PLAYERS = [
  { id: 'p1', name: 'Ana', surname: 'Gil', avatarUrl: null },
  { id: 'p2', name: 'Luis', surname: 'Pérez', avatarUrl: null },
] as User[];

const renderModal = (props: Partial<React.ComponentProps<typeof AttendanceListModal>> = {}) => {
  const handlers = { onClose: vi.fn(), onLevelChange: vi.fn(), onTogglePlayer: vi.fn(), onSave: vi.fn() };
  const view = renderWithProviders(
    <AttendanceListModal
      opened
      players={PLAYERS}
      checkedPlayers={['p1']}
      levelFilter={null}
      saving={false}
      {...handlers}
      {...props}
    />,
  );
  return { ...view, ...handlers };
};

describe('AttendanceListModal', () => {
  it('cerrado no pinta nada', () => {
    renderModal({ opened: false });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('lista a cada jugador y marca solo a los de la lista', async () => {
    renderModal();

    expect(await screen.findByText('Lista de Asistencia')).toBeInTheDocument();
    expect(screen.getByText('Ana Gil')).toBeInTheDocument();
    expect(screen.getByText('Luis Pérez')).toBeInTheDocument();
    const [ana, luis] = screen.getAllByRole('checkbox') as HTMLInputElement[];
    expect(ana.checked).toBe(true);
    expect(luis.checked).toBe(false);
  });

  it('pinchar a un jugador avisa con su id', async () => {
    const { onTogglePlayer } = renderModal();
    await screen.findByRole('dialog');

    fireEvent.click(screen.getByText('Luis Pérez'));

    expect(onTogglePlayer).toHaveBeenCalledWith('p2');
  });

  it('el filtro ofrece los cinco niveles', async () => {
    renderModal();
    await screen.findByRole('dialog');

    expect(optionsOf(/Filtrar por Nivel/)).toEqual([
      'Iniciacion',
      'Principiante',
      'Intermedio',
      'Avanzado',
      'Profesional',
    ]);
  });

  it('elegir un nivel avisa con el elegido', async () => {
    const { onLevelChange } = renderModal();
    await screen.findByRole('dialog');

    chooseOption(/Filtrar por Nivel/, 'Avanzado');

    expect(onLevelChange).toHaveBeenCalledWith('Avanzado', expect.anything());
  });

  it('el botón cuenta los jugadores marcados y avisa para sincronizar', async () => {
    const { onSave } = renderModal({ checkedPlayers: ['p1', 'p2'] });
    await screen.findByRole('dialog');

    fireEvent.click(screen.getByRole('button', { name: 'Sincronizar Asistencia (2 Jugadores)' }));

    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
