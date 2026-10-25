import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useTrainingPlan } from './useTrainingPlan';
import { trainingsService, exercisesService } from '../api/services/trainings';

vi.mock('../api/services/trainings', () => ({
  trainingsService: {
    planById: vi.fn(),
    addExercise: vi.fn(),
    cloneSession: vi.fn(),
    deleteExercise: vi.fn(),
  },
  exercisesService: { list: vi.fn() },
}));

const mockedTrainings = vi.mocked(trainingsService);
const mockedExercises = vi.mocked(exercisesService);

const buildPlan = () => ({
  id: 'plan-1',
  playerId: 'jugador-1',
  weeks: 4,
  sessionsPerWeek: 3,
  status: 'Activo',
  startDate: '2026-01-01T00:00:00.000Z',
  sessions: [
    { id: 'sesion-1', date: '2026-01-05', exercises: [{ id: 'e1', completed: false }] },
    { id: 'sesion-2', date: '2026-01-07', exercises: [] },
  ],
});

describe('Hook useTrainingPlan (client/src/hooks/useTrainingPlan.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedTrainings.planById.mockResolvedValue(buildPlan() as never);
    mockedExercises.list.mockResolvedValue([] as never);
  });

  it('carga el plan y el catalogo de ejercicios', async () => {
    const { result } = renderHook(() => useTrainingPlan('plan-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockedTrainings.planById).toHaveBeenCalledWith('plan-1');
    expect(result.current.plan?.id).toBe('plan-1');
    expect(result.current.sessions).toHaveLength(2);
    expect(result.current.catalog).toEqual([]);
  });

  it('no carga nada si no hay plan', async () => {
    const { result } = renderHook(() => useTrainingPlan(undefined));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockedTrainings.planById).not.toHaveBeenCalled();
    expect(result.current.plan).toBeUndefined();
  });

  it('ofrece como origen de clonado solo las sesiones con ejercicios', async () => {
    const { result } = renderHook(() => useTrainingPlan('plan-1'));

    await waitFor(() => expect(result.current.availableSourceSessions.length).toBe(1));

    expect(result.current.availableSourceSessions[0]).toEqual({
      value: 'sesion-1',
      label: 'Sesión 1 (1 ejercicios)',
      count: 1,
    });
  });

  it('anade un ejercicio y recarga el plan', async () => {
    const { result } = renderHook(() => useTrainingPlan('plan-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.addExercise('sesion-1', { exerciseId: 'ej-1', sets: 3 });
    });

    expect(mockedTrainings.addExercise).toHaveBeenCalledWith('sesion-1', {
      exerciseId: 'ej-1',
      sets: 3,
    });
    // El plan se recarga tras la mutacion
    expect(mockedTrainings.planById).toHaveBeenCalledTimes(2);
  });

  it('clona los ejercicios de una sesion a otra', async () => {
    const { result } = renderHook(() => useTrainingPlan('plan-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.cloneSession('sesion-2', 'sesion-1');
    });

    expect(mockedTrainings.cloneSession).toHaveBeenCalledWith('sesion-2', 'sesion-1');
  });

  it('quita un ejercicio de la sesion', async () => {
    const { result } = renderHook(() => useTrainingPlan('plan-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.removeExercise('e1');
    });

    expect(mockedTrainings.deleteExercise).toHaveBeenCalledWith('e1');
  });

  it('no espera al catalogo para dar el plan por cargado', async () => {
    mockedExercises.list.mockReturnValue(new Promise(() => {}) as never);

    const { result } = renderHook(() => useTrainingPlan('plan-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.sessions).toHaveLength(2);
    expect(result.current.catalog).toEqual([]);
  });

  it('una recarga tras una accion no vuelve a marcar la carga', async () => {
    let release: (plan: unknown) => void = () => {};
    const { result } = renderHook(() => useTrainingPlan('plan-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    mockedTrainings.planById.mockImplementationOnce(
      () => new Promise((resolve) => (release = resolve)) as never,
    );

    let pending: Promise<boolean> = Promise.resolve(true);
    act(() => {
      pending = result.current.removeExercise('e1');
    });

    await waitFor(() => expect(mockedTrainings.planById).toHaveBeenCalledTimes(2));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.plan?.id).toBe('plan-1');

    await act(async () => {
      release(buildPlan());
      await pending;
    });
  });

  it.each([
    ['addExercise', () => mockedTrainings.addExercise, (r: ReturnType<typeof useTrainingPlan>) => r.addExercise('sesion-1', { exerciseId: 'ej-1' })],
    ['cloneSession', () => mockedTrainings.cloneSession, (r: ReturnType<typeof useTrainingPlan>) => r.cloneSession('sesion-2', 'sesion-1')],
    ['removeExercise', () => mockedTrainings.deleteExercise, (r: ReturnType<typeof useTrainingPlan>) => r.removeExercise('e1')],
  ])('%s devuelve true cuando la accion tiene exito', async (_name, _service, run) => {
    const { result } = renderHook(() => useTrainingPlan('plan-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let outcome: boolean | undefined;
    await act(async () => {
      outcome = await run(result.current);
    });

    expect(outcome).toBe(true);
  });

  it.each([
    ['addExercise', () => mockedTrainings.addExercise, (r: ReturnType<typeof useTrainingPlan>) => r.addExercise('sesion-1', { exerciseId: 'ej-1' })],
    ['cloneSession', () => mockedTrainings.cloneSession, (r: ReturnType<typeof useTrainingPlan>) => r.cloneSession('sesion-2', 'sesion-1')],
    ['removeExercise', () => mockedTrainings.deleteExercise, (r: ReturnType<typeof useTrainingPlan>) => r.removeExercise('e1')],
  ])('%s devuelve false, sin lanzar y sin recargar, cuando la API falla', async (_name, service, run) => {
    service().mockRejectedValue(new Error('400'));
    const { result } = renderHook(() => useTrainingPlan('plan-1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let outcome: boolean | undefined;
    await act(async () => {
      outcome = await run(result.current);
    });

    expect(outcome).toBe(false);
    expect(mockedTrainings.planById).toHaveBeenCalledTimes(1);
    expect(result.current.isSubmitting).toBe(false);
  });

  it('expone el error cuando la carga falla', async () => {
    mockedTrainings.planById.mockRejectedValue(new Error('No encontrado'));

    const { result } = renderHook(() => useTrainingPlan('plan-1'));

    await waitFor(() => expect(result.current.error).toBeDefined());

    expect(result.current.error?.message).toBe('No encontrado');
    expect(result.current.isLoading).toBe(false);
  });
});
