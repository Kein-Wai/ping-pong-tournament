import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { chooseOption, optionsOf, renderWithProviders } from '../../test/utils';
import type { Exercise } from '../../types/api';
import { AddExerciseModal, type AddExerciseModalProps } from './AddExerciseModal';

const CATALOG = [
  { id: 'x1', code: 5, name: 'Drive cruzado', category: 'Control_CT' },
  { id: 'x2', code: null, name: 'Bloqueo corto', category: 'Bloqueo_Contraataque' },
] as unknown as Exercise[];

const renderModal = (overrides: Partial<AddExerciseModalProps> = {}) => {
  const props: AddExerciseModalProps = {
    opened: true,
    onClose: vi.fn(),
    catalog: CATALOG,
    onSubmit: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
  const view = renderWithProviders(<AddExerciseModal {...props} />);
  return { ...view, props };
};

const submit = () => screen.getByRole('button', { name: 'Añadir a la Sesión' });

describe('AddExerciseModal', () => {
  it('ofrece los ejercicios del catalogo con su codigo cuando lo tienen', () => {
    renderModal();

    expect(optionsOf(/Selecciona un ejercicio/)).toEqual(['[5] Drive cruzado', 'Bloqueo corto']);
  });

  it('el filtro de categoria limita los ejercicios que se ofrecen', () => {
    renderModal();

    chooseOption(/Filtrar por Categoría/, 'Bloqueos y Contraataque');

    expect(optionsOf(/Selecciona un ejercicio/)).toEqual(['Bloqueo corto']);
  });

  it('el boton queda desactivado hasta elegir un ejercicio', () => {
    renderModal();
    expect(submit()).toBeDisabled();

    chooseOption(/Selecciona un ejercicio/, 'Bloqueo corto');

    expect(submit()).toBeEnabled();
  });

  it('envia el ejercicio con series, repeticiones y duracion como numeros y se cierra', async () => {
    const { props } = renderModal();
    chooseOption(/Selecciona un ejercicio/, '[5] Drive cruzado');
    fireEvent.change(screen.getByLabelText('Series'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Repeticiones'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText(/Duración/), { target: { value: '15' } });

    fireEvent.click(submit());

    await waitFor(() =>
      expect(props.onSubmit).toHaveBeenCalledWith({
        exerciseId: 'x1',
        sets: 3,
        reps: 10,
        durationMinutes: 15,
      }),
    );
    await waitFor(() => expect(props.onClose).toHaveBeenCalledTimes(1));
  });

  it('omite los campos opcionales que se dejan vacios', async () => {
    const { props } = renderModal();
    chooseOption(/Selecciona un ejercicio/, 'Bloqueo corto');

    fireEvent.click(submit());

    await waitFor(() =>
      expect(props.onSubmit).toHaveBeenCalledWith({
        exerciseId: 'x2',
        sets: undefined,
        reps: undefined,
        durationMinutes: undefined,
      }),
    );
  });

  it('no se cierra cuando la accion falla', async () => {
    const { props } = renderModal({ onSubmit: vi.fn().mockResolvedValue(false) });
    chooseOption(/Selecciona un ejercicio/, 'Bloqueo corto');

    fireEvent.click(submit());

    await waitFor(() => expect(props.onSubmit).toHaveBeenCalled());
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it('al cerrarse olvida el ejercicio y los valores del anterior', () => {
    const { rerender, props } = renderModal();
    chooseOption(/Selecciona un ejercicio/, 'Bloqueo corto');
    fireEvent.change(screen.getByLabelText('Series'), { target: { value: '4' } });

    rerender(<AddExerciseModal {...props} opened={false} />);
    rerender(<AddExerciseModal {...props} opened />);

    expect(submit()).toBeDisabled();
    expect(screen.getByLabelText('Series')).toHaveValue('');
  });
});
