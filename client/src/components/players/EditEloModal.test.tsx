import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import { EditEloModal } from './EditEloModal';

const renderModal = (props: Partial<React.ComponentProps<typeof EditEloModal>> = {}) => {
  const handlers = { onClose: vi.fn(), onEloChange: vi.fn(), onSave: vi.fn() };
  const view = renderWithProviders(
    <EditEloModal opened playerName="Luis" elo={1200} {...handlers} {...props} />,
  );
  return { ...view, ...handlers };
};

describe('EditEloModal', () => {
  it('cerrado no pinta nada', () => {
    renderModal({ opened: false });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('abierto nombra al jugador y muestra su ELO actual', async () => {
    renderModal();

    expect(await screen.findByText('Ajustar Nivel ELO')).toBeInTheDocument();
    expect(screen.getByText(/puntos de clasificación de Luis\./)).toBeInTheDocument();
    expect(screen.getByLabelText('Puntuación ELO')).toHaveValue('1200');
  });

  it('cambiar el ELO avisa con el número nuevo', async () => {
    const { onEloChange } = renderModal();
    await screen.findByRole('dialog');

    fireEvent.change(screen.getByLabelText('Puntuación ELO'), { target: { value: '1300' } });

    expect(onEloChange).toHaveBeenCalledWith(1300);
  });

  it('«Guardar Cambios» avisa para guardar', async () => {
    const { onSave } = renderModal();
    await screen.findByRole('dialog');

    fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));

    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
