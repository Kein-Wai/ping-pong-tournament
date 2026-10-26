import type { GeneralTraining, GeneralTrainingSchedule } from './api';

/** Asistencia registrada en una sesión: quien consta con `attended: false` también está en la lista. */
export interface TrainingAttendance {
  playerId: string;
  attended: boolean;
}

/** Sesión de entrenamiento general tal como la pinta el calendario, con su horario, plantilla y asistencias. */
export interface TrainingSession extends GeneralTraining {
  schedule?: GeneralTrainingSchedule | null;
  /** Habilidades que entrena el bloque: `servicio: true`, etc. */
  template?: Record<string, unknown> | null;
  attendances: TrainingAttendance[];
}

/** Resumen de un bloque de sesiones (las que comparten plantilla y horario). */
export interface ProgramDetails {
  description: string | null | undefined;
  scheduleName: string | undefined;
  minDate: Date;
  maxDate: Date;
  sessionCount: number;
  activeSkills: { key: string; label: string }[];
}
