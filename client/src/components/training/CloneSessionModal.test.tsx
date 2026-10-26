import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { chooseOption, optionsOf, renderWithProviders } from '../../test/utils';
import { CloneSessionModal, type CloneSessionModalProps } from './CloneSessionModal';

const SOURCES = [
  { value: 's1', label: 'Sesión 1 (2 ejercicios)', count: 2 },
  { value: 's3', label: 'Sesión 3 (6 ejercicios)', count: 6 },
];

const renderModal = (overrides: Partial<CloneSessionModalProps> = {}) => {
  const props: CloneSessionModalProps = {
    opened: true,
    onClose: vi.fn(),
    targetSession: { id: 's2', number: 2 },
    sourceSessions: SOURCES,
    onSubmit: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
  const view = renderWithProviders(<CloneSessionModal {...props} />);
  return { ...view, props };
};

const copy = () => screen.getByRole('button', { name: 'Copiar Ejercicios' });

describe('CloneSessionModal', () => {
  it('titula el modal con la sesion de destino', () => {
    renderModal();

    expect(screen.getByText('Clonar Ejercicios a Sesión 2')).toBeInTheDocument();
  });

  it('ofrece como origen las sesiones recibidas', () => {
    renderModal();

    expect(optionsOf(/Sesión Origen/)).toEqual(['Sesión 1 (2 ejercicios)', 'Sesión 3 (6 ejercicios)']);
  });

  it('no ofrece la sesion de destino como origen de si misma', () => {
    renderModal({ targetSession: { id: 's1', number: 1 } });

    expect(optionsOf(/Sesión Origen/)).toEqual(['Sesión 3 (6 ejercicios)']);
  });

  it('el boton queda desactivado hasta elegir una sesion de origen', () => {
    renderModal();
    expect(copy()).toBeDisabled();

    chooseOption(/Sesión Origen/, 'Sesión 1 (2 ejercicios)');

    expect(copy()).toBeEnabled();
  });

  it('envia la sesion elegida y se cierra cuando la accion tiene exito', async () => {
    const { props } = renderModal();
    chooseOption(/Sesión Origen/, 'Sesión 3 (6 ejercicios)');

    fireEvent.click(copy());

    await waitFor(() => expect(props.onSubmit).toHaveBeenCalledWith('s3'));
    await waitFor(() => expect(props.onClose).toHaveBeenCalledTimes(1));
  });

  it('no se cierra cuando la accion falla', async () => {
    const { props } = renderModal({ onSubmit: vi.fn().mockResolvedValue(false) });
    chooseOption(/Sesión Origen/, 'Sesión 1 (2 ejercicios)');

    fireEvent.click(copy());

    await waitFor(() => expect(props.onSubmit).toHaveBeenCalled());
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it('al cerrarse sin enviar olvida la sesion elegida', () => {
    const { rerender, props } = renderModal();
    chooseOption(/Sesión Origen/, 'Sesión 1 (2 ejercicios)');
    expect(copy()).toBeEnabled();

    rerender(<CloneSessionModal {...props} opened={false} />);
    rerender(<CloneSessionModal {...props} opened />);

    expect(copy()).toBeDisabled();
  });
});
