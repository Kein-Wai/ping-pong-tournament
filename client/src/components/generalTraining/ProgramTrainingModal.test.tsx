import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { chooseOption, renderWithProviders } from '../../test/utils';
import type { GeneralTrainingSchedule } from '../../types/api';
import { ProgramTrainingModal } from './ProgramTrainingModal';

const SCHEDULES: GeneralTrainingSchedule[] = [
  { id: 's1', name: 'Clase Adultos', startTime: '17:00', endTime: '19:00', daysOfWeek: [1] },
  { id: 's2', name: 'Clase Niños', startTime: '10:00', endTime: '11:30', daysOfWeek: [6] },
];
const START = new Date(2026, 9, 20);
const END = new Date(2026, 9, 22);

const renderModal = (props: Partial<React.ComponentProps<typeof ProgramTrainingModal>> = {}) => {
  const handlers = {
    onClose: vi.fn(),
    onDescriptionChange: vi.fn(),
    onDatesChange: vi.fn(),
    onScheduleChange: vi.fn(),
    onToggleSkill: vi.fn(),
    onSubmit: vi.fn(),
  };
  const view = renderWithProviders(
    <ProgramTrainingModal
      opened
      schedules={SCHEDULES}
      description="Semana de Saques"
      dates={[START, END]}
      scheduleId="s1"
      skills={{ servicio: true }}
      {...handlers}
      {...props}
    />,
  );
  return { ...view, ...handlers };
};

describe('ProgramTrainingModal', () => {
  it('cerrado no pinta nada', () => {
    renderModal({ opened: false });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('abierto muestra la descripción y el horario elegidos', async () => {
    renderModal();

    expect(await screen.findByText('Programar Fechas')).toBeInTheDocument();
    expect(screen.getByLabelText('Descripción (Opcional)')).toHaveValue('Semana de Saques');
    expect(screen.getByRole('combobox', { name: /Horario Base/ })).toHaveValue('Clase Adultos');
  });

  it('escribir la descripción avisa con el texto nuevo', async () => {
    const { onDescriptionChange } = renderModal();
    await screen.findByRole('dialog');

    fireEvent.change(screen.getByLabelText('Descripción (Opcional)'), { target: { value: 'Otra' } });

    expect(onDescriptionChange).toHaveBeenCalledWith('Otra');
  });

  it('elegir un horario avisa con su id', async () => {
    const { onScheduleChange } = renderModal();
    await screen.findByRole('dialog');

    chooseOption(/Horario Base/, 'Clase Niños');

    expect(onScheduleChange).toHaveBeenCalledWith('s2', expect.anything());
  });

  it('ofrece las doce habilidades con las elegidas marcadas', async () => {
    renderModal();
    await screen.findByRole('dialog');

    expect(screen.getAllByRole('checkbox')).toHaveLength(12);
    expect(screen.getByRole('checkbox', { name: 'Servicio' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Corte' })).not.toBeChecked();
  });

  it('marcar una habilidad avisa con su clave', async () => {
    const { onToggleSkill } = renderModal();
    await screen.findByRole('dialog');

    fireEvent.click(screen.getByRole('checkbox', { name: 'Corte' }));

    expect(onToggleSkill).toHaveBeenCalledWith('corte');
  });

  it('«Agendar Sesiones» avisa cuando hay rango de fechas y horario', async () => {
    const { onSubmit } = renderModal();
    await screen.findByRole('dialog');

    fireEvent.click(screen.getByRole('button', { name: 'Agendar Sesiones' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['sin fecha de inicio', { dates: [null, END] as [Date | null, Date | null] }],
    ['sin fecha de fin', { dates: [START, null] as [Date | null, Date | null] }],
    ['sin horario', { scheduleId: null }],
  ])('«Agendar Sesiones» está bloqueado %s', async (_name, props) => {
    renderModal(props);
    await screen.findByRole('dialog');

    expect(screen.getByRole('button', { name: 'Agendar Sesiones' })).toBeDisabled();
  });
});
