import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../axios';
import { ENDPOINTS } from '../endpoints';
import { exercisesService, trainingsService } from './trainings';

// Se mockea el `api` de bajo nivel (la frontera del sistema): el servicio y el
// adaptador http se prueban de verdad. Los contratos salen de
// api/src/routes/training/* y api/src/schemas/{training,exercise}.ts.
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

describe('trainingsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('planes', () => {
    it('byPlayer pide los planes de un jugador', async () => {
      mockedApi.get.mockResolvedValue(envelope([{ id: 'plan1' }]));

      const result = await trainingsService.byPlayer('p1');

      expect(mockedApi.get).toHaveBeenCalledWith(ENDPOINTS.TRAININGS.BY_PLAYER('p1'), undefined);
      expect(result).toHaveLength(1);
    });

    it('planById pide el plan con sus sesiones por GET /trainings/:id', async () => {
      mockedApi.get.mockResolvedValue(envelope({ id: 'plan1', sessions: [] }));

      const result = await trainingsService.planById('plan1');

      expect(mockedApi.get).toHaveBeenCalledWith(ENDPOINTS.TRAININGS.PLAN_BY_ID('plan1'), undefined);
      expect(result.id).toBe('plan1');
    });

    it('createPlan envía el plan completo y devuelve el plan con sus sesiones', async () => {
      mockedApi.post.mockResolvedValue(envelope({ id: 'plan9', sessions: [{ id: 's1' }] }));
      const payload = {
        playerId: 'p1',
        strengths: 'Pegada de top',
        weaknesses: 'Saque',
        objectives: 'Subir de nivel',
        sessionsPerWeek: 3,
        weeks: 8,
        startDate: '2026-11-02T00:00:00.000Z',
      };

      const result = await trainingsService.createPlan(payload);

      expect(mockedApi.post).toHaveBeenCalledWith(ENDPOINTS.TRAININGS.BASE, payload, undefined);
      expect(result.id).toBe('plan9');
    });

    it('deletePlan borra el plan y no devuelve datos', async () => {
      mockedApi.delete.mockResolvedValue(onlyMessage('Plan de entrenamiento eliminado'));

      const result = await trainingsService.deletePlan('plan1');

      expect(mockedApi.delete).toHaveBeenCalledWith(ENDPOINTS.TRAININGS.PLAN_BY_ID('plan1'), undefined);
      expect(result).toBeUndefined();
    });
  });

  describe('sesiones y ejercicios', () => {
    it('sessionDetails pide la sesión con sus ejercicios', async () => {
      mockedApi.get.mockResolvedValue(envelope({ id: 's1', exercises: [] }));

      await trainingsService.sessionDetails('s1');

      expect(mockedApi.get).toHaveBeenCalledWith(ENDPOINTS.TRAININGS.SESSION_DETAILS('s1'), undefined);
    });

    it('addExercise añade el ejercicio con series, repeticiones y duración', async () => {
      mockedApi.post.mockResolvedValue(envelope({ id: 'se1' }));
      const payload = { exerciseId: 'e1', sets: 3, reps: 10, durationMinutes: 15 };

      const result = await trainingsService.addExercise('s1', payload);

      expect(mockedApi.post).toHaveBeenCalledWith(ENDPOINTS.TRAININGS.SESSIONS('s1'), payload, undefined);
      expect(result.id).toBe('se1');
    });

    it('updateExercise marca un ejercicio como completado', async () => {
      mockedApi.put.mockResolvedValue(envelope({ id: 'se1', completed: true }));

      await trainingsService.updateExercise('se1', { completed: true });

      expect(mockedApi.put).toHaveBeenCalledWith(
        ENDPOINTS.TRAININGS.UPDATE_EXERCISE('se1'),
        { completed: true },
        undefined,
      );
    });

    it('updateExercise guarda las notas', async () => {
      mockedApi.put.mockResolvedValue(envelope({ id: 'se1' }));

      await trainingsService.updateExercise('se1', { notes: 'Mejorar el efecto' });

      expect(mockedApi.put).toHaveBeenCalledWith(
        ENDPOINTS.TRAININGS.UPDATE_EXERCISE('se1'),
        { notes: 'Mejorar el efecto' },
        undefined,
      );
    });

    it('deleteExercise quita el ejercicio y no devuelve datos', async () => {
      mockedApi.delete.mockResolvedValue(onlyMessage('Ejercicio eliminado de la sesión'));

      const result = await trainingsService.deleteExercise('se1');

      expect(mockedApi.delete).toHaveBeenCalledWith(ENDPOINTS.TRAININGS.DELETE_EXERCISE('se1'), undefined);
      expect(result).toBeUndefined();
    });

    it('cloneSession copia los ejercicios entre sesiones y no devuelve datos', async () => {
      mockedApi.post.mockResolvedValue(onlyMessage('Ejercicios clonados con éxito'));

      const result = await trainingsService.cloneSession('destino', 'origen');

      expect(mockedApi.post).toHaveBeenCalledWith(
        ENDPOINTS.TRAININGS.CLONE_SESSION('destino', 'origen'),
        undefined,
        undefined,
      );
      expect(result).toBeUndefined();
    });

    it('propaga el error si la sesión ya tiene seis ejercicios', async () => {
      mockedApi.post.mockRejectedValue(new Error('400'));

      await expect(trainingsService.addExercise('s1', { exerciseId: 'e1' })).rejects.toThrow('400');
    });
  });

  it('no expone createSession ni upcoming: ninguna pantalla los usa', () => {
    expect(trainingsService).not.toHaveProperty('createSession');
    expect(trainingsService).not.toHaveProperty('upcoming');
  });
});

describe('exercisesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('list pide todo el catálogo cuando no hay categoría', async () => {
    mockedApi.get.mockResolvedValue(envelope([{ id: 'e1' }]));

    const result = await exercisesService.list();

    expect(mockedApi.get).toHaveBeenCalledWith(ENDPOINTS.EXERCISES.BASE, undefined);
    expect(result).toHaveLength(1);
  });

  it('list filtra por categoría con ?category=', async () => {
    mockedApi.get.mockResolvedValue(envelope([]));

    await exercisesService.list('Saques_Largos');

    expect(mockedApi.get).toHaveBeenCalledWith(ENDPOINTS.EXERCISES.BASE, {
      params: { category: 'Saques_Largos' },
    });
  });

  it('create envía nombre, descripción, categoría y código', async () => {
    mockedApi.post.mockResolvedValue(envelope({ id: 'e9' }));
    const payload = {
      name: 'Saque corto',
      description: 'Trabajo de saque corto con efecto',
      objective: 'Control',
      category: 'Saques_Largos' as const,
      code: 12,
    };

    const result = await exercisesService.create(payload);

    expect(mockedApi.post).toHaveBeenCalledWith(ENDPOINTS.EXERCISES.BASE, payload, undefined);
    expect(result.id).toBe('e9');
  });
});
