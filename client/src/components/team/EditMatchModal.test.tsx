import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { chooseOption, renderWithProviders } from '../../test/utils';
import { EditMatchModal } from './EditMatchModal';

const renderModal = (props: Partial<React.ComponentProps<typeof EditMatchModal>> = {}) => {
  const handlers = {
    onClose: vi.fn(),
    onRivalNameChange: vi.fn(),
    onDateChange: vi.fn(),
    onIsHomeChange: vi.fn(),
    onLocationChange: vi.fn(),
    onStatusChange: vi.fn(),
    onOurScoreChange: vi.fn(),
    onRivalScoreChange: vi.fn(),
    onDelete: vi.fn(),
    onSave: vi.fn(),
  };
  const view = renderWithProviders(
    <EditMatchModal
      opened
      teamName="Equipo A"
      matchRivalName="Club Este"
      rivalName="Club Este"
      date={new Date('2026-10-01T18:00:00.000Z')}
      isHome
      location="Pabellón"
      status="Completado"
      ourScore={6}
      rivalScore={4}
      canDelete
      saving={false}
      {...handlers}
      {...props}
    />,
  );
  return { ...view, ...handlers };
};

describe('EditMatchModal', () => {
  it('cerrado no pinta nada', () => {
    renderModal({ opened: false });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('abierto muestra el título y los datos del partido', async () => {
    renderModal();

    expect(await screen.findByText('Actualizar Partido')).toBeInTheDocument();
    expect(screen.getByLabelText('Rival')).toHaveValue('Club Este');
    expect(screen.getByLabelText('Localización')).toHaveValue('Pabellón');
    expect(screen.getByRole('combobox', { name: /Estado del Encuentro/ })).toHaveValue('Completado');
  });

  it('si está completado pide los puntos de ambos equipos', async () => {
    renderModal();
    await screen.findByRole('dialog');

    expect(screen.getByLabelText(/Puntos: Equipo A/)).toHaveValue('6');
    expect(screen.getByLabelText(/Puntos: Club Este/)).toHaveValue('4');
  });

  it('si no está completado no pide puntos', async () => {
    renderModal({ status: 'Programado' });
    await screen.findByRole('dialog');

    expect(screen.queryByLabelText(/Puntos:/)).not.toBeInTheDocument();
  });

  it('el rótulo de puntos del rival usa el rival original, no el que se está editando', async () => {
    renderModal({ rivalName: 'Otro nombre' });
    await screen.findByRole('dialog');

    expect(screen.getByLabelText(/Puntos: Club Este/)).toBeInTheDocument();
  });

  it('editar los campos avisa con el valor nuevo', async () => {
    const { onRivalNameChange, onLocationChange, onOurScoreChange, onRivalScoreChange } = renderModal();
    await screen.findByRole('dialog');

    fireEvent.change(screen.getByLabelText('Rival'), { target: { value: 'Club Oeste' } });
    fireEvent.change(screen.getByLabelText('Localización'), { target: { value: 'Calle 2' } });
    fireEvent.change(screen.getByLabelText(/Puntos: Equipo A/), { target: { value: '7' } });
    fireEvent.change(screen.getByLabelText(/Puntos: Club Este/), { target: { value: '2' } });

    expect(onRivalNameChange).toHaveBeenCalledWith('Club Oeste');
    expect(onLocationChange).toHaveBeenCalledWith('Calle 2');
    expect(onOurScoreChange).toHaveBeenCalledWith(7);
    expect(onRivalScoreChange).toHaveBeenCalledWith(2);
  });

  it('elegir estado avisa con la opción elegida', async () => {
    const { onStatusChange } = renderModal();
    await screen.findByRole('dialog');

    chooseOption(/Estado del Encuentro/, 'Cancelado');

    expect(onStatusChange).toHaveBeenCalledWith('Cancelado');
  });

  it('los botones de localía avisan con true o false', async () => {
    const { onIsHomeChange } = renderModal();
    await screen.findByRole('dialog');

    fireEvent.click(screen.getByRole('button', { name: 'Jugamos Fuera' }));
    fireEvent.click(screen.getByRole('button', { name: 'Jugamos en Casa' }));

    expect(onIsHomeChange).toHaveBeenNthCalledWith(1, false);
    expect(onIsHomeChange).toHaveBeenNthCalledWith(2, true);
  });

  it('«Guardar» avisa para guardar', async () => {
    const { onSave } = renderModal();
    await screen.findByRole('dialog');

    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('completado sin marcador no se puede guardar', async () => {
    renderModal({ ourScore: '' });
    await screen.findByRole('dialog');

    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
  });

  it('«Eliminar» solo aparece con permiso y avisa al pulsarlo', async () => {
    const { onDelete, unmount } = renderModal();
    await screen.findByRole('dialog');

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(onDelete).toHaveBeenCalledTimes(1);
    unmount();

    renderModal({ canDelete: false });
    await screen.findByRole('dialog');
    expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument();
  });
});
