import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import type { TrainingSession } from '../../types/generalTraining';
import { DaySessionsModal } from './DaySessionsModal';

const SCHEDULE = { id: 's1', name: 'Clase Adultos', startTime: '17:00', endTime: '19:00', daysOfWeek: [1] };

const PAST_WITH_LIST: TrainingSession = {
  id: 't1',
  date: '2026-10-05T17:00:00.000Z',
  description: 'Semana de Saques',
  scheduleId: 's1',
  schedule: SCHEDULE,
  attendances: [
    { playerId: 'p1', attended: true },
    { playerId: 'p2', attended: false },
  ],
};
const PAST_EMPTY: TrainingSession = { ...PAST_WITH_LIST, id: 't2', attendances: [] };
const FUTURE: TrainingSession = {
  ...PAST_EMPTY,
  id: 't3',
  date: '2026-10-20T10:00:00.000Z',
  description: '',
};
const OLD: TrainingSession = {
  ...PAST_EMPTY,
  id: 't4',
  scheduleId: null,
  schedule: null,
};

const renderModal = (props: Partial<React.ComponentProps<typeof DaySessionsModal>> = {}) => {
  const handlers = {
    onClose: vi.fn(),
    onViewProgram: vi.fn(),
    onViewAttendees: vi.fn(),
    onAttendance: vi.fn(),
  };
  const view = renderWithProviders(
    <DaySessionsModal
      opened
      date={new Date(2026, 9, 5)}
      sessions={[PAST_WITH_LIST]}
      getScheduleColor={() => 'blue'}
      {...handlers}
      {...props}
    />,
  );
  return { ...view, ...handlers };
};

describe('DaySessionsModal', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('cerrado no pinta nada', () => {
    renderModal({ opened: false });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('titula con la fecha del día', async () => {
    renderModal();

    expect(await screen.findByText('Sesiones del 5/10/2026')).toBeInTheDocument();
  });

  it('sin sesiones avisa de que no hay entrenamientos', async () => {
    renderModal({ sessions: [] });

    expect(await screen.findByText('No hay entrenamientos este día.')).toBeInTheDocument();
  });

  it('una sesión pasada con lista ofrece ver asistentes y editar la lista', async () => {
    renderModal();

    expect(await screen.findByText('Semana de Saques')).toBeInTheDocument();
    expect(screen.getByText('Clase Adultos (17:00 - 19:00)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver Asistentes (2)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar Lista' })).toBeInTheDocument();
  });

  it('una sesión pasada sin lista ofrece pasar lista', async () => {
    renderModal({ sessions: [PAST_EMPTY] });
    await screen.findByRole('dialog');

    expect(screen.getByRole('button', { name: 'Pasar Lista' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ver Asistentes/ })).not.toBeInTheDocument();
  });

  it('una sesión futura usa el texto por defecto y ofrece ver inscritos', async () => {
    renderModal({ sessions: [FUTURE] });

    expect(await screen.findByText('Entrenamiento Grupal')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver Inscritos' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ver Asistentes/ })).not.toBeInTheDocument();
  });

  it('una sesión de un horario borrado se marca como antigua y no permite pasar lista', async () => {
    renderModal({ sessions: [OLD] });

    expect(await screen.findByText('Horario Antiguo')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pasar Lista' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ver Inscritos' })).not.toBeInTheDocument();
  });

  it('los botones avisan con la sesión', async () => {
    const { container, onViewProgram, onViewAttendees, onAttendance } = renderModal();
    await screen.findByRole('dialog');

    fireEvent.click(screen.getByRole('button', { name: 'Ver Asistentes (2)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Editar Lista' }));
    fireEvent.click(
      document.querySelector('.tabler-icon-info-circle')?.closest('button') as HTMLElement,
    );

    expect(onViewAttendees).toHaveBeenCalledWith(PAST_WITH_LIST);
    expect(onAttendance).toHaveBeenCalledWith(PAST_WITH_LIST);
    expect(onViewProgram).toHaveBeenCalledWith(PAST_WITH_LIST);
    expect(container).toBeDefined();
  });
});
