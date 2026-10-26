import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, within } from '@testing-library/react';
import { chooseOption, renderWithProviders } from '../../test/utils';
import { EditTeamModal } from './EditTeamModal';

const renderModal = (props: Partial<React.ComponentProps<typeof EditTeamModal>> = {}) => {
  const handlers = {
    onClose: vi.fn(),
    onNameChange: vi.fn(),
    onCategoryChange: vi.fn(),
    onLevelChange: vi.fn(),
    onSave: vi.fn(),
  };
  const view = renderWithProviders(
    <EditTeamModal
      opened
      name="Equipo A"
      category="1ª Autonómica"
      level="Intermedio"
      saving={false}
      {...handlers}
      {...props}
    />,
  );
  return { ...view, ...handlers };
};

describe('EditTeamModal', () => {
  it('cerrado no pinta nada', () => {
    renderModal({ opened: false });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('abierto muestra el título y los valores actuales', async () => {
    renderModal();

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Editar Información del Equipo')).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/Nombre del Equipo/)).toHaveValue('Equipo A');
    expect(within(dialog).getByRole('combobox', { name: /Categoría de Liga/ })).toHaveValue('1ª Autonómica');
    expect(within(dialog).getByRole('combobox', { name: /Nivel Base Inicial/ })).toHaveValue('Intermedio');
  });

  it('escribir el nombre avisa con el texto nuevo', async () => {
    const { onNameChange } = renderModal();
    await screen.findByRole('dialog');

    fireEvent.change(screen.getByLabelText(/Nombre del Equipo/), { target: { value: 'Equipo B' } });

    expect(onNameChange).toHaveBeenCalledWith('Equipo B');
  });

  it('elegir categoría y nivel avisa con la opción elegida', async () => {
    const { onCategoryChange, onLevelChange } = renderModal();
    await screen.findByRole('dialog');

    chooseOption(/Categoría de Liga/, 'Superdivisión');
    chooseOption(/Nivel Base Inicial/, 'Avanzado');

    expect(onCategoryChange).toHaveBeenCalledWith('Superdivisión', expect.anything());
    expect(onLevelChange).toHaveBeenCalledWith('Avanzado', expect.anything());
  });

  it('«Guardar Cambios» avisa para guardar', async () => {
    const { onSave } = renderModal();
    await screen.findByRole('dialog');

    fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['sin nombre', { name: '' }],
    ['sin categoría', { category: null }],
    ['sin nivel', { level: '' }],
  ])('%s no se puede guardar', async (_label, props) => {
    renderModal(props);
    await screen.findByRole('dialog');

    expect(screen.getByRole('button', { name: 'Guardar Cambios' })).toBeDisabled();
  });
});
