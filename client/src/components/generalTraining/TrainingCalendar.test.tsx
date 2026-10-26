import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import type { TrainingSession } from '../../types/generalTraining';
import { TrainingCalendar } from './TrainingCalendar';

const session = (overrides: Partial<TrainingSession>): TrainingSession => ({
  id: 't',
  date: new Date(2026, 9, 5, 12).toISOString(),
  scheduleId: 's1',
  attendances: [],
  ...overrides,
});

const PAST = session({
  id: 't1',
  schedule: { id: 's1', name: 'Clase', startTime: '17:00', endTime: '19:00', daysOfWeek: [1] },
});
const FUTURE = session({
  id: 't2',
  date: new Date(2026, 9, 20, 12).toISOString(),
  schedule: { id: 's1', name: 'Clase', startTime: '10:00', endTime: '11:00', daysOfWeek: [2] },
});
const OLD = session({ id: 't3', date: new Date(2026, 9, 9, 12).toISOString(), schedule: null });

const daysOf = (count: number) => Array.from({ length: count }, (_, i) => i + 1);

const renderCalendar = (props: Partial<React.ComponentProps<typeof TrainingCalendar>> = {}) => {
  const handlers = {
    onPrevMonth: vi.fn(),
    onNextMonth: vi.fn(),
    onDayClick: vi.fn(),
    onProgram: vi.fn(),
  };
  const view = renderWithProviders(
    <TrainingCalendar
      currentDate={new Date(2026, 9, 15)}
      blanks={3}
      days={daysOf(31)}
      trainings={[PAST, FUTURE, OLD]}
      getScheduleColor={() => 'blue'}
      canProgram
      {...handlers}
      {...props}
    />,
  );
  return { ...view, ...handlers };
};

describe('TrainingCalendar', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 15, 12));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('titula con el mes y el año en mayúsculas', () => {
    renderCalendar();

    expect(screen.getByRole('heading', { name: 'OCTUBRE DE 2026' })).toBeInTheDocument();
  });

  it('pinta las cabeceras desde el lunes y todos los días del mes', () => {
    renderCalendar();

    ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].forEach((day) => {
      expect(screen.getByText(day)).toBeInTheDocument();
    });
    expect(screen.getByText('31')).toBeInTheDocument();
    expect(screen.queryByText('32')).not.toBeInTheDocument();
  });

  it('cada sesión aparece en su día con la hora del horario o «Antiguo»', () => {
    renderCalendar();

    expect(screen.getByText('17:00', { selector: '.mantine-Badge-label' })).toBeInTheDocument();
    expect(screen.getByText('10:00', { selector: '.mantine-Badge-label' })).toBeInTheDocument();
    expect(screen.getByText('Antiguo')).toBeInTheDocument();
  });

  it('las sesiones pasadas se pintan suaves y las futuras rellenas', () => {
    renderCalendar();

    const past = screen.getByText('17:00', { selector: '.mantine-Badge-label' }).closest('.mantine-Badge-root');
    const future = screen.getByText('10:00', { selector: '.mantine-Badge-label' }).closest('.mantine-Badge-root');
    expect(past).toHaveAttribute('data-variant', 'light');
    expect(future).toHaveAttribute('data-variant', 'filled');
  });

  it('las flechas avisan para cambiar de mes', () => {
    const { container, onPrevMonth, onNextMonth } = renderCalendar();

    fireEvent.click(container.querySelector('.tabler-icon-chevron-left')?.closest('button') as HTMLElement);
    fireEvent.click(container.querySelector('.tabler-icon-chevron-right')?.closest('button') as HTMLElement);

    expect(onPrevMonth).toHaveBeenCalledTimes(1);
    expect(onNextMonth).toHaveBeenCalledTimes(1);
  });

  it('pinchar un día avisa con su número', () => {
    const { onDayClick } = renderCalendar();

    fireEvent.click(screen.getByText('5', { selector: 'p' }));

    expect(onDayClick).toHaveBeenCalledWith(5);
  });

  it('«Programar» avisa, y se bloquea si no se puede programar', () => {
    const { onProgram, unmount } = renderCalendar();
    fireEvent.click(screen.getByRole('button', { name: 'Programar' }));
    expect(onProgram).toHaveBeenCalledTimes(1);
    unmount();

    renderCalendar({ canProgram: false });
    expect(screen.getByRole('button', { name: 'Programar' })).toBeDisabled();
  });
});
