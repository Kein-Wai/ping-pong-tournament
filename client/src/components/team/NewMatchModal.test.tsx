import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import { NewMatchModal } from './NewMatchModal';

const renderModal = (props: Partial<React.ComponentProps<typeof NewMatchModal>> = {}) => {
  const handlers = {
    onClose: vi.fn(),
    onRivalNameChange: vi.fn(),
    onDateChange: vi.fn(),
    onIsHomeChange: vi.fn(),
    onLocationChange: vi.fn(),
    onSave: vi.fn(),
  };
  const view = renderWithProviders(
    <NewMatchModal
      opened
      rivalName="CTM Rival"
      date={new Date('2026-10-20T17:00:00.000Z')}
      isHome
      location="Pabellón"
      saving={false}
      {...handlers}
      {...props}
    />,
  );
  return { ...view, ...handlers };
};

describe('NewMatchModal', () => {
  it('cerrado no pinta nada', () => {
    renderModal({ opened: false });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('abierto muestra el título y los valores actuales', async () => {
    renderModal();

    expect(await screen.findByText('Programar Partido de Liga')).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre del Club Rival/)).toHaveValue('CTM Rival');
    expect(screen.getByLabelText(/Dirección del local/)).toHaveValue('Pabellón');
  });

  it('escribir el rival y el lugar avisa con el texto nuevo', async () => {
    const { onRivalNameChange, onLocationChange } = renderModal();
    await screen.findByRole('dialog');

    fireEvent.change(screen.getByLabelText(/Nombre del Club Rival/), { target: { value: 'Club Sur' } });
    fireEvent.change(screen.getByLabelText(/Dirección del local/), { target: { value: 'Calle 1' } });

    expect(onRivalNameChange).toHaveBeenCalledWith('Club Sur');
    expect(onLocationChange).toHaveBeenCalledWith('Calle 1');
  });

  it('los botones de localía avisan con true o false', async () => {
    const { onIsHomeChange } = renderModal();
    await screen.findByRole('dialog');

    fireEvent.click(screen.getByRole('button', { name: 'Jugamos Fuera' }));
    fireEvent.click(screen.getByRole('button', { name: 'Jugamos en Casa' }));

    expect(onIsHomeChange).toHaveBeenNthCalledWith(1, false);
    expect(onIsHomeChange).toHaveBeenNthCalledWith(2, true);
  });

  it('«Añadir al Calendario» avisa para guardar', async () => {
    const { onSave } = renderModal();
    await screen.findByRole('dialog');

    fireEvent.click(screen.getByRole('button', { name: 'Añadir al Calendario' }));

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['sin rival', { rivalName: '' }],
    ['sin fecha', { date: null }],
  ])('%s no se puede añadir', async (_label, props) => {
    renderModal(props);
    await screen.findByRole('dialog');

    expect(screen.getByRole('button', { name: 'Añadir al Calendario' })).toBeDisabled();
  });
});
