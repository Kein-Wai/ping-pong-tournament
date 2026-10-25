import { describe, it, expect } from 'vitest';
import type { GeneralTrainingSchedule, User } from '../types/api';
import type { TrainingSession } from '../types/generalTraining';
import {
  getAttendedPlayers,
  getMonthGrid,
  getProgramDetails,
  getScheduleColor,
  getSessionsOnDay,
  shiftMonth,
  toggleInList,
} from './general-trainings';

const schedule = (id: string): GeneralTrainingSchedule => ({
  id,
  name: `Clase ${id}`,
  startTime: '17:00',
  endTime: '19:00',
  daysOfWeek: [1],
});

const session = (overrides: Partial<TrainingSession> = {}): TrainingSession => ({
  id: 't',
  date: '2026-10-05T17:00:00.000Z',
  scheduleId: 's1',
  templateId: 'tpl1',
  attendances: [],
  ...overrides,
});

describe('getScheduleColor', () => {
  const schedules = Array.from({ length: 11 }, (_, i) => schedule(`s${i}`));

  it('asigna un color por posición del horario', () => {
    expect(getScheduleColor(schedules, 's0')).toBe('blue');
    expect(getScheduleColor(schedules, 's1')).toBe('teal');
    expect(getScheduleColor(schedules, 's9')).toBe('indigo');
  });

  it('da la vuelta a la paleta cuando hay más de diez horarios', () => {
    expect(getScheduleColor(schedules, 's10')).toBe('blue');
  });

  it('sin horario o con un horario borrado es gris', () => {
    expect(getScheduleColor(schedules, null)).toBe('gray');
    expect(getScheduleColor(schedules, undefined)).toBe('gray');
    expect(getScheduleColor(schedules, 'borrado')).toBe('gray');
  });
});

describe('getMonthGrid', () => {
  it('octubre de 2026 empieza en jueves: tres huecos y 31 días', () => {
    const grid = getMonthGrid(new Date(2026, 9, 15));

    expect(grid.blanks).toBe(3);
    expect(grid.days).toHaveLength(31);
    expect(grid.days[0]).toBe(1);
    expect(grid.days[30]).toBe(31);
  });

  it('un mes que empieza en domingo deja seis huecos para que la semana arranque en lunes', () => {
    const grid = getMonthGrid(new Date(2026, 10, 3));

    expect(grid.blanks).toBe(6);
    expect(grid.days).toHaveLength(30);
  });

  it('un mes que empieza en lunes no deja huecos', () => {
    const grid = getMonthGrid(new Date(2026, 5, 20));

    expect(grid.blanks).toBe(0);
    expect(grid.days).toHaveLength(30);
  });

  it('febrero de 2026 tiene 28 días', () => {
    expect(getMonthGrid(new Date(2026, 1, 10)).days).toHaveLength(28);
  });
});

describe('shiftMonth', () => {
  it('avanza y retrocede de mes dejando el día 1', () => {
    expect(shiftMonth(new Date(2026, 9, 31), 1)).toEqual(new Date(2026, 10, 1));
    expect(shiftMonth(new Date(2026, 9, 31), -1)).toEqual(new Date(2026, 8, 1));
  });

  it('cruza el cambio de año', () => {
    expect(shiftMonth(new Date(2026, 11, 15), 1)).toEqual(new Date(2027, 0, 1));
    expect(shiftMonth(new Date(2026, 0, 15), -1)).toEqual(new Date(2025, 11, 1));
  });
});

describe('getSessionsOnDay', () => {
  const sessions = [
    session({ id: 'a', date: new Date(2026, 9, 5, 9).toISOString() }),
    session({ id: 'b', date: new Date(2026, 9, 5, 20).toISOString() }),
    session({ id: 'c', date: new Date(2026, 9, 6, 9).toISOString() }),
  ];

  it('devuelve las sesiones de ese día, sea cual sea la hora', () => {
    expect(getSessionsOnDay(sessions, new Date(2026, 9, 5)).map((s) => s.id)).toEqual(['a', 'b']);
  });

  it('un día sin sesiones devuelve una lista vacía', () => {
    expect(getSessionsOnDay(sessions, new Date(2026, 9, 7))).toEqual([]);
  });
});

describe('getProgramDetails', () => {
  const first = session({
    id: 't1',
    date: '2026-10-05T17:00:00.000Z',
    description: 'Semana de Saques',
    schedule: schedule('s1'),
    template: { servicio: true, recepcion: true, corte: false },
  });
  const second = { ...first, id: 't2', date: '2026-10-07T17:00:00.000Z' };
  const other = session({ id: 't3', templateId: 'tpl2', date: '2026-10-20T17:00:00.000Z' });
  const sameTemplateOtherSchedule = session({ id: 't4', scheduleId: 's2' });

  it('resume el bloque: las sesiones con la misma plantilla y horario', () => {
    const details = getProgramDetails([first, second, other, sameTemplateOtherSchedule], first);

    expect(details).toEqual({
      description: 'Semana de Saques',
      scheduleName: 'Clase s1',
      minDate: new Date('2026-10-05T17:00:00.000Z'),
      maxDate: new Date('2026-10-07T17:00:00.000Z'),
      sessionCount: 2,
      activeSkills: [
        { key: 'servicio', label: 'Servicio' },
        { key: 'recepcion', label: 'Recepción' },
      ],
    });
  });

  it('las habilidades salen en el orden de la ficha del jugador y solo las marcadas a true', () => {
    const details = getProgramDetails([first], first);

    expect(details?.activeSkills.map((s) => s.key)).toEqual(['servicio', 'recepcion']);
  });

  it('una sesión sin plantilla ni horario no tiene habilidades ni nombre de horario', () => {
    const lone = session({ id: 'x', template: null, schedule: null });

    const details = getProgramDetails([lone], lone);

    expect(details?.activeSkills).toEqual([]);
    expect(details?.scheduleName).toBeUndefined();
    expect(details?.sessionCount).toBe(1);
  });

  it('sin ninguna sesión del bloque en la lista devuelve null', () => {
    expect(getProgramDetails([other], first)).toBeNull();
  });
});

describe('getAttendedPlayers', () => {
  const players = [
    { id: 'p1', name: 'Ana' },
    { id: 'p2', name: 'Luis' },
    { id: 'p3', name: 'Marta' },
  ] as User[];

  it('devuelve solo a quienes constan con attended true', () => {
    const training = session({
      attendances: [
        { playerId: 'p1', attended: true },
        { playerId: 'p2', attended: false },
      ],
    });

    expect(getAttendedPlayers(training, players).map((p) => p.id)).toEqual(['p1']);
  });

  it('ignora a los asistentes que ya no están en la plantilla', () => {
    const training = session({ attendances: [{ playerId: 'fuera', attended: true }] });

    expect(getAttendedPlayers(training, players)).toEqual([]);
  });
});

describe('toggleInList', () => {
  it('añade el elemento si no está', () => {
    expect(toggleInList([1, 2], 3)).toEqual([1, 2, 3]);
  });

  it('lo quita si ya está', () => {
    expect(toggleInList(['a', 'b'], 'a')).toEqual(['b']);
  });

  it('no modifica la lista original', () => {
    const list = [1];
    toggleInList(list, 2);

    expect(list).toEqual([1]);
  });
});
