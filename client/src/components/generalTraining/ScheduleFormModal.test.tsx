import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, within } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import { ScheduleFormModal } from './ScheduleFormModal';

const renderModal = (props: Partial<React.ComponentProps<typeof ScheduleFormModal>> = {}) => {
  const handlers = {
    onClose: vi.fn(),
    onNameChange: vi.fn(),
    onStartChange: vi.fn(),
    onEndChange: vi.fn(),
    onToggleDay: vi.fn(),
    onSave: vi.fn(),
  };
  const view = renderWithProviders(
    <ScheduleFormModal
      opened
      name="Clase Adultos"
      start="17:00"
      end="19:00"
      days={[1, 3]}
      {...handlers}
      {...props}
    />,
  );
  return { ...view, ...handlers };
};

describe('ScheduleFormModal', () => {
  it('cerrado no pinta nada', () => {
    renderModal({ opened: false });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('abierto muestra los datos del horario', async () => {
    renderModal();

    expect(await screen.findByText('Crear Horario Base')).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre de la Clase/)).toHaveValue('Clase Adultos');
    expect(screen.getByLabelText(/Hora Inicio/)).toHaveValue('17:00');
    expect(screen.getByLabelText(/Hora Fin/)).toHaveValue('19:00');
  });

  it('cada campo avisa con el texto nuevo', async () => {
    const { onNameChange, onStartChange, onEndChange } = renderModal();
    await screen.findByRole('dialog');

    fireEvent.change(screen.getByLabelText(/Nombre de la Clase/), { target: { value: 'Pro' } });
    fireEvent.change(screen.getByLabelText(/Hora Inicio/), { target: { value: '18:00' } });
    fireEvent.change(screen.getByLabelText(/Hora Fin/), { target: { value: '20:00' } });

    expect(onNameChange).toHaveBeenCalledWith('Pro');
    expect(onStartChange).toHaveBeenCalledWith('18:00');
    expect(onEndChange).toHaveBeenCalledWith('20:00');
  });

  it('los días elegidos van rellenos y pinchar uno avisa con su valor', async () => {
    const { onToggleDay } = renderModal();
    await screen.findByRole('dialog');
    const modal = within(screen.getByRole('dialog'));

    expect(modal.getByRole('button', { name: 'L' })).toHaveAttribute('data-variant', 'filled');
    expect(modal.getByRole('button', { name: 'M' })).toHaveAttribute('data-variant', 'outline');
    fireEvent.click(modal.getByRole('button', { name: 'D' }));

    expect(onToggleDay).toHaveBeenCalledWith(0);
  });

  it('«Guardar Horario» exige al menos un día', async () => {
    const { onSave, unmount } = renderModal();
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar Horario' }));
    expect(onSave).toHaveBeenCalledTimes(1);
    unmount();

    renderModal({ days: [] });
    await screen.findByRole('dialog');
    expect(screen.getByRole('button', { name: 'Guardar Horario' })).toBeDisabled();
  });
});
