import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import { EndMatchModal } from './EndMatchModal';

const renderModal = (props: Partial<React.ComponentProps<typeof EndMatchModal>> = {}) => {
  const handlers = { onClose: vi.fn(), onNotesChange: vi.fn(), onSave: vi.fn() };
  const view = renderWithProviders(
    <EndMatchModal opened mySets={3} oppSets={1} notes="Buen partido" {...handlers} {...props} />,
  );
  return { ...view, ...handlers };
};

describe('EndMatchModal', () => {
  it('cerrado no pinta nada', () => {
    renderModal({ opened: false });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('abierto da el resultado final de sets', async () => {
    renderModal();

    expect(await screen.findByText('¡Partido Finalizado!')).toBeInTheDocument();
    expect(screen.getByText('Resultado Final: 3 - 1')).toBeInTheDocument();
  });

  it('muestra las conclusiones y avisa de cada cambio', async () => {
    const { onNotesChange } = renderModal();
    await screen.findByRole('dialog');
    const notes = screen.getByLabelText('Conclusiones rápidas');
    expect(notes).toHaveValue('Buen partido');

    fireEvent.change(notes, { target: { value: 'Me costó el saque' } });

    expect(onNotesChange).toHaveBeenCalledWith('Me costó el saque');
  });

  it('«Guardar Conclusiones y Cerrar» avisa para guardar', async () => {
    const { onSave } = renderModal();
    await screen.findByRole('dialog');

    fireEvent.click(screen.getByRole('button', { name: 'Guardar Conclusiones y Cerrar' }));

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('no tiene botón de cierre y cerrar con Escape avisa a la pantalla', async () => {
    const { onClose } = renderModal();
    const dialog = await screen.findByRole('dialog');
    expect(document.querySelector('.mantine-Modal-close')).toBeNull();

    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
