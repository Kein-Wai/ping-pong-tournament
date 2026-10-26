import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { GeneralTrainingSchedule } from '../types/api';
import type { TrainingSession } from '../types/generalTraining';
import { useEntrenamientoCalendario } from './useEntrenamientoCalendario';

const ADULTOS: GeneralTrainingSchedule = {
  id: 's1',
  name: 'Clase Adultos',
  startTime: '17:00',
  endTime: '19:00',
  daysOfWeek: [1, 3],
};
const NINOS: GeneralTrainingSchedule = { ...ADULTOS, id: 's2', name: 'Clase Niños' };

const session = (overrides: Partial<TrainingSession>): TrainingSession => ({
  id: 't',
  date: new Date(2026, 9, 5, 12).toISOString(),
  scheduleId: 's1',
  templateId: 'tpl1',
  attendances: [],
  ...overrides,
});

const T1 = session({ id: 't1', date: new Date(2026, 9, 5, 12).toISOString() });
const T2 = session({ id: 't2', date: new Date(2026, 9, 7, 12).toISOString(), description: 'Bloque' });
const T3 = session({ id: 't3', date: new Date(2026, 9, 5, 18).toISOString(), scheduleId: 's2' });

describe('useEntrenamientoCalendario', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 15, 12));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const setup = () =>
    renderHook(() =>
      useEntrenamientoCalendario({ trainings: [T1, T2, T3], schedules: [ADULTOS, NINOS] }),
    );

  it('arranca en el mes actual con su rejilla', () => {
    const { result } = setup();

    expect(result.current.currentDate).toEqual(new Date(2026, 9, 15, 12));
    expect(result.current.blanks).toBe(3);
    expect(result.current.days).toHaveLength(31);
  });

  it('cambia de mes hacia delante y hacia atrás', () => {
    const { result } = setup();

    act(() => result.current.nextMonth());
    expect(result.current.currentDate).toEqual(new Date(2026, 10, 1));
    expect(result.current.days).toHaveLength(30);

    act(() => result.current.prevMonth());
    act(() => result.current.prevMonth());
    expect(result.current.currentDate).toEqual(new Date(2026, 8, 1));
  });

  it('colorea cada horario según su posición', () => {
    const { result } = setup();

    expect(result.current.getScheduleColor('s1')).toBe('blue');
    expect(result.current.getScheduleColor('s2')).toBe('teal');
    expect(result.current.getScheduleColor(null)).toBe('gray');
  });

  describe('día', () => {
    it('pinchar un día abre el modal con la fecha y las sesiones de ese día', () => {
      const { result } = setup();

      act(() => result.current.handleDayClick(5));

      expect(result.current.dayModalOpen).toBe(true);
      expect(result.current.selectedDateForModal).toEqual(new Date(2026, 9, 5));
      expect(result.current.selectedDayTrainings.map((t) => t.id)).toEqual(['t1', 't3']);
    });

    it('un día sin sesiones abre el modal con la lista vacía', () => {
      const { result } = setup();

      act(() => result.current.handleDayClick(2));

      expect(result.current.dayModalOpen).toBe(true);
      expect(result.current.selectedDayTrainings).toEqual([]);
    });

    it('cerrar el modal del día lo oculta', () => {
      const { result } = setup();
      act(() => result.current.handleDayClick(5));

      act(() => result.current.setDayModalOpen(false));

      expect(result.current.dayModalOpen).toBe(false);
    });
  });

  describe('detalles del programa', () => {
    it('abre el modal con el resumen del bloque de la sesión', () => {
      const { result } = setup();

      act(() => result.current.handleViewProgram(T1));

      expect(result.current.programModalOpen).toBe(true);
      expect(result.current.programDetails).toMatchObject({
        scheduleName: undefined,
        sessionCount: 2,
        minDate: new Date(T1.date),
        maxDate: new Date(T2.date),
      });
    });

    it('si el bloque no está en la lista no abre nada', () => {
      const { result } = setup();

      act(() => result.current.handleViewProgram(session({ id: 'x', templateId: 'otro' })));

      expect(result.current.programModalOpen).toBe(false);
      expect(result.current.programDetails).toBeNull();
    });
  });
});
