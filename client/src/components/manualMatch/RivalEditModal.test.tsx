import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { chooseOption, optionsOf, renderWithProviders } from '../../test/utils';
import { RivalEditModal } from './RivalEditModal';

const renderModal = (props: Partial<React.ComponentProps<typeof RivalEditModal>> = {}) => {
  const handlers = {
    onClose: vi.fn(),
    onNameChange: vi.fn(),
    onHandChange: vi.fn(),
    onStyleChange: vi.fn(),
    onLevelChange: vi.fn(),
    onRubberForehandChange: vi.fn(),
    onRubberBackhandChange: vi.fn(),
    onSave: vi.fn(),
  };
  const view = renderWithProviders(
    <RivalEditModal
      opened
      name="Carlos"
      hand="Diestro"
      style="Ofensivo"
      level="Igual"
      rubberForehand="LISA"
      rubberBackhand={null}
      {...handlers}
      {...props}
    />,
  );
  return { ...view, ...handlers };
};

describe('RivalEditModal', () => {
  it('cerrado no pinta nada', () => {
    renderModal({ opened: false });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('abierto muestra los datos del rival', async () => {
    renderModal();

    expect(await screen.findByText('Actualizar Datos del Rival')).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre Real')).toHaveValue('Carlos');
    expect(screen.getByRole('combobox', { name: 'Mano' })).toHaveValue('Diestro');
    expect(screen.getByRole('combobox', { name: 'Estilo' })).toHaveValue('Ofensivo');
    expect(screen.getByRole('combobox', { name: 'Nivel' })).toHaveValue('Igual');
    expect(screen.getByRole('combobox', { name: 'Goma Derecha' })).toHaveValue('LISA');
    expect(screen.getByRole('combobox', { name: 'Goma Revés' })).toHaveValue('');
  });

  it('escribir el nombre avisa con el texto nuevo', async () => {
    const { onNameChange } = renderModal();
    await screen.findByRole('dialog');

    fireEvent.change(screen.getByLabelText('Nombre Real'), { target: { value: 'Carlos Ruiz' } });

    expect(onNameChange).toHaveBeenCalledWith('Carlos Ruiz');
  });

  it('ofrece las opciones de mano, estilo y nivel', async () => {
    renderModal();
    await screen.findByRole('dialog');

    expect(optionsOf(/^Mano$/)).toEqual(['Diestro', 'Zurdo']);
  });

  it('elegir mano, estilo y nivel avisa con la opción', async () => {
    const { onHandChange, onStyleChange, onLevelChange } = renderModal();
    await screen.findByRole('dialog');

    chooseOption(/^Mano$/, 'Zurdo');
    chooseOption(/^Estilo$/, 'Defensivo');
    chooseOption(/^Nivel$/, 'Mejor');

    expect(onHandChange).toHaveBeenCalledWith('Zurdo', expect.anything());
    expect(onStyleChange).toHaveBeenCalledWith('Defensivo', expect.anything());
    expect(onLevelChange).toHaveBeenCalledWith('Mejor', expect.anything());
  });

  it('ofrece los cinco tipos de goma', async () => {
    renderModal();
    await screen.findByRole('dialog');

    expect(optionsOf(/^Goma Derecha$/)).toEqual([
      'LISA',
      'PICOS_CORTOS',
      'PICOS_MEDIOS',
      'PICOS_LARGOS',
      'ANTISPIN',
    ]);
  });

  it('elegir la goma de derecha y de revés avisa con la opción', async () => {
    const { onRubberForehandChange, onRubberBackhandChange } = renderModal();
    await screen.findByRole('dialog');

    chooseOption(/^Goma Derecha$/, 'ANTISPIN');
    chooseOption(/^Goma Revés$/, 'PICOS_LARGOS');

    expect(onRubberForehandChange).toHaveBeenCalledWith('ANTISPIN', expect.anything());
    expect(onRubberBackhandChange).toHaveBeenCalledWith('PICOS_LARGOS', expect.anything());
  });

  it('«Guardar Cambios» avisa para guardar', async () => {
    const { onSave } = renderModal();
    await screen.findByRole('dialog');

    fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));

    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
