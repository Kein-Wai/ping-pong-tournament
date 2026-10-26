import { SCHEDULE_COLORS } from '../constants/generalTrainings';
import { SKILL_FIELDS } from '../constants/skills';
import type { GeneralTrainingSchedule, User } from '../types/api';
import type { ProgramDetails, TrainingSession } from '../types/generalTraining';

/** Color de un horario según su posición en la lista; gris si no hay horario o ya no existe. */
export const getScheduleColor = (
  schedules: GeneralTrainingSchedule[],
  scheduleId?: string | null,
): string => {
  if (!scheduleId) return 'gray';
  const index = schedules.findIndex((s) => s.id === scheduleId);
  if (index === -1) return 'gray';
  return SCHEDULE_COLORS[index % SCHEDULE_COLORS.length];
};

/** Huecos previos al día 1 (la semana empieza en lunes) y los días del mes de `date`. */
export const getMonthGrid = (date: Date): { blanks: number; days: number[] } => {
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  let firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  if (firstDayOfMonth === 0) firstDayOfMonth = 7; // Ajuste para que la semana empiece en Lunes

  return {
    blanks: firstDayOfMonth - 1,
    days: Array.from({ length: daysInMonth }, (_, i) => i + 1),
  };
};

/** Día 1 del mes que está `delta` meses de `date`. */
export const shiftMonth = (date: Date, delta: number): Date =>
  new Date(date.getFullYear(), date.getMonth() + delta, 1);

/** Sesiones que caen en el mismo día natural que `day`. */
export const getSessionsOnDay = (sessions: TrainingSession[], day: Date): TrainingSession[] =>
  sessions.filter((t) => new Date(t.date).toDateString() === day.toDateString());

/**
 * Resumen del bloque al que pertenece `training`: las sesiones con su misma plantilla y
 * horario. Devuelve null si la lista no contiene ninguna.
 */
export const getProgramDetails = (
  trainings: TrainingSession[],
  training: TrainingSession,
): ProgramDetails | null => {
  const programTrainings = trainings.filter(
    (t) => t.templateId === training.templateId && t.scheduleId === training.scheduleId,
  );
  if (programTrainings.length === 0) return null;

  const dates = programTrainings.map((t) => new Date(t.date).getTime());
  const minDate = new Date(Math.min(...dates));
  const maxDate = new Date(Math.max(...dates));

  const activeSkills = SKILL_FIELDS.filter((s) => training.template?.[s.key] === true);

  return {
    description: training.description,
    scheduleName: training.schedule?.name,
    minDate,
    maxDate,
    sessionCount: programTrainings.length,
    activeSkills: [...activeSkills],
  };
};

/** Jugadores de la plantilla que constan como asistentes (`attended: true`) en la sesión. */
export const getAttendedPlayers = (training: TrainingSession, players: User[]): User[] => {
  const attendedIds =
    training.attendances?.filter((a) => a.attended).map((a) => a.playerId) || [];
  return players.filter((p) => attendedIds.includes(p.id));
};

/** Añade `item` a la lista si no está y lo quita si ya está, sin mutarla. */
export const toggleInList = <T>(list: T[], item: T): T[] =>
  list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
