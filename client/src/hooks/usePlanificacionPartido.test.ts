import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { api } from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';
import type { TrackedMatch } from '../types/manualMatch';
import { usePlanificacionPartido } from './usePlanificacionPartido';

// Se mockea el `api` de bajo nivel (la frontera del sistema) y no los servicios,
// para que estos tests sigan valiendo cuando el acceso a datos cambie de capa.
vi.mock('../api/axios', () => ({
  api: {
    put: vi.fn(),
  },
}));

const envelope = <T>(data: T) => ({ data: { success: true, data } });

const MATCH = {
  id: 'm1',
  opponentName: 'Carlos',
  status: 'Programado',
  setsToWin: 3,
  mySets: 0,
  opponentSets: 0,
  planningNotes: null,
} as TrackedMatch;

describe('usePlanificacionPartido', () => {
  const setMatch = vi.fn();
  const onSaved = vi.fn();
  const setup = (loaded: TrackedMatch | null = MATCH) =>
    renderHook(
      ({ loaded }) =>
        usePlanificacionPartido({ id: 'm1', match: MATCH, setMatch, loaded, onSaved }),
      { initialProps: { loaded } },
    );

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.put).mockResolvedValue(envelope({}) as never);
  });

  it('sin notas guardadas los campos están vacíos y el tipo de análisis es rápido', () => {
    const { result } = setup();

    expect(result.current.planMyServe).toBe('');
    expect(result.current.planTheirServe).toBe('');
    expect(result.current.planStrategy).toBe('');
    expect(result.current.startAnalysisType).toBe('Rapido');
  });

  it('carga las notas guardadas en JSON en cada campo', () => {
    const { result } = setup({
      ...MATCH,
      planningNotes: JSON.stringify({ myServe: 'a', theirServe: 'b', strategy: 'c' }),
    });

    expect(result.current.planMyServe).toBe('a');
    expect(result.current.planTheirServe).toBe('b');
    expect(result.current.planStrategy).toBe('c');
  });

  it('unas notas en texto libre van enteras a la estrategia', () => {
    const { result } = setup({ ...MATCH, planningNotes: 'Notas antiguas' });

    expect(result.current.planStrategy).toBe('Notas antiguas');
    expect(result.current.planMyServe).toBe('');
  });

  it('arranca con el tipo de análisis que ya tuviera el partido', () => {
    const { result } = setup({ ...MATCH, analysisType: 'Extenso' });

    expect(result.current.startAnalysisType).toBe('Extenso');
  });

  describe('guardar notas', () => {
    it('las envía como JSON, actualiza el partido y avisa de que se guardó', async () => {
      const { result } = setup();
      act(() => {
        result.current.setPlanMyServe('Saque largo');
        result.current.setPlanTheirServe('Bloquear');
        result.current.setPlanStrategy('Ritmo alto');
      });
      const planningNotes = JSON.stringify({
        myServe: 'Saque largo',
        theirServe: 'Bloquear',
        strategy: 'Ritmo alto',
      });

      await act(async () => {
        await result.current.handleSavePlan();
      });

      expect(api.put).toHaveBeenCalledWith(
        ENDPOINTS.MANUAL_MATCHES.UPDATE('m1'),
        { planningNotes },
        undefined,
      );
      expect(setMatch).toHaveBeenCalledWith({ ...MATCH, planningNotes });
      expect(onSaved).toHaveBeenCalledTimes(1);
      expect(result.current.savingPlan).toBe(false);
    });

    it('si falla no avisa, registra el error y deja de guardar', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(api.put).mockRejectedValue(new Error('rechazado'));
      const { result } = setup();

      await act(async () => {
        await result.current.handleSavePlan();
      });

      expect(onSaved).not.toHaveBeenCalled();
      expect(consoleError).toHaveBeenCalled();
      expect(result.current.savingPlan).toBe(false);
    });
  });

  describe('empezar el partido', () => {
    it('lo marca iniciado con el tipo de análisis elegido', async () => {
      const { result } = setup();
      act(() => result.current.setStartAnalysisType('Extenso'));

      await act(async () => {
        await result.current.handleStartMatchNow();
      });

      expect(api.put).toHaveBeenCalledWith(
        ENDPOINTS.MANUAL_MATCHES.UPDATE('m1'),
        { status: 'Iniciado', analysisType: 'Extenso' },
        undefined,
      );
      expect(setMatch).toHaveBeenCalledWith({
        ...MATCH,
        status: 'Iniciado',
        analysisType: 'Extenso',
      });
    });

    it('si falla no cambia el partido y registra el error', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(api.put).mockRejectedValue(new Error('rechazado'));
      const { result } = setup();

      await act(async () => {
        await result.current.handleStartMatchNow();
      });

      expect(setMatch).not.toHaveBeenCalled();
      expect(consoleError).toHaveBeenCalled();
    });
  });
});
