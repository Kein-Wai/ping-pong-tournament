import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../axios';
import { ENDPOINTS } from '../endpoints';
import { generalTrainingsService } from './generalTrainings';

// Se mockea el `api` de bajo nivel (la frontera del sistema): el servicio y el
// adaptador http se prueban de verdad. Los contratos salen de
// api/src/routes/general-training.ts y api/src/schemas/generalTraining.ts.
vi.mock('../axios', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedApi = vi.mocked(api);

const envelope = <T>(data: T) => ({ data: { success: true, data } });
const onlyMessage = (message: string) => ({ data: { success: true, message } });

describe('generalTrainingsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('consultas', () => {
    it('list pide los entrenamientos con horario, plantilla y asistencias', async () => {
      mockedApi.get.mockResolvedValue(envelope([{ id: 't1' }]));

      const result = await generalTrainingsService.list();

      expect(mockedApi.get).toHaveBeenCalledWith(ENDPOINTS.GENERAL_TRAININGS.BASE, undefined);
      expect(result).toHaveLength(1);
    });

    it('schedules pide los horarios fijos del club', async () => {
      mockedApi.get.mockResolvedValue(envelope([{ id: 's1' }]));

      await generalTrainingsService.schedules();

      expect(mockedApi.get).toHaveBeenCalledWith(ENDPOINTS.GENERAL_TRAININGS.SCHEDULES, undefined);
    });

    it('propaga el error de la API', async () => {
      mockedApi.get.mockRejectedValue(new Error('500'));

      await expect(generalTrainingsService.list()).rejects.toThrow('500');
    });
  });

  describe('horarios fijos', () => {
    const schedule = {
      name: 'Clase Adultos',
      startTime: '17:00',
      endTime: '19:00',
      daysOfWeek: [1, 3],
    };

    it('createSchedule crea el horario y lo devuelve', async () => {
      mockedApi.post.mockResolvedValue(envelope({ id: 's9', ...schedule }));

      const result = await generalTrainingsService.createSchedule(schedule);

      expect(mockedApi.post).toHaveBeenCalledWith(
        ENDPOINTS.GENERAL_TRAININGS.SCHEDULES,
        schedule,
        undefined,
      );
      expect(result.id).toBe('s9');
    });

    it('updateSchedule edita el horario por PUT /schedules/:id', async () => {
      mockedApi.put.mockResolvedValue(envelope({ id: 's1', ...schedule }));

      await generalTrainingsService.updateSchedule('s1', schedule);

      expect(mockedApi.put).toHaveBeenCalledWith(
        ENDPOINTS.GENERAL_TRAININGS.SCHEDULE_BY_ID('s1'),
        schedule,
        undefined,
      );
    });

    it('deleteSchedule borra el horario y no devuelve datos', async () => {
      mockedApi.delete.mockResolvedValue(onlyMessage('Horario eliminado'));

      const result = await generalTrainingsService.deleteSchedule('s1');

      expect(mockedApi.delete).toHaveBeenCalledWith(
        ENDPOINTS.GENERAL_TRAININGS.SCHEDULE_BY_ID('s1'),
        undefined,
      );
      expect(result).toBeUndefined();
    });
  });

  describe('programación', () => {
    it('create programa las sesiones del rango y no devuelve datos, solo un mensaje', async () => {
      mockedApi.post.mockResolvedValue(onlyMessage('Se han programado 6 sesiones.'));
      const payload = {
        description: 'Semana de saques',
        startDate: '2026-10-20T00:00:00.000Z',
        endDate: '2026-10-30T00:00:00.000Z',
        scheduleId: 's1',
        skillsToTrain: { servicio: true, recepcion: true },
      };

      const result = await generalTrainingsService.create(payload);

      expect(mockedApi.post).toHaveBeenCalledWith(
        ENDPOINTS.GENERAL_TRAININGS.BASE,
        payload,
        undefined,
      );
      expect(result).toBeUndefined();
    });

    it('bulkAttendance sincroniza la asistencia por PUT y no devuelve datos', async () => {
      mockedApi.put.mockResolvedValue(onlyMessage('Asistencia sincronizada correctamente'));

      const result = await generalTrainingsService.bulkAttendance('t1', { playerIds: ['p1', 'p2'] });

      expect(mockedApi.put).toHaveBeenCalledWith(
        ENDPOINTS.GENERAL_TRAININGS.BULK_ATTENDANCE('t1'),
        { playerIds: ['p1', 'p2'] },
        undefined,
      );
      expect(mockedApi.post).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });
  });
});
