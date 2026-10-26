import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { api } from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';
import type { TrackedMatch } from '../types/manualMatch';
import { useRivalEdicion } from './useRivalEdicion';

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
  opponentHand: 'Diestro',
  opponentStyle: 'Ofensivo',
  opponentLevel: 'Igual',
  opponentRubberForehand: 'LISA',
  opponentRubberBackhand: null,
  status: 'Iniciado',
  setsToWin: 3,
  mySets: 0,
  opponentSets: 0,
} as TrackedMatch;

describe('useRivalEdicion', () => {
  const setMatch = vi.fn();
  const setup = (loaded: TrackedMatch | null = MATCH) =>
    renderHook(({ loaded }) => useRivalEdicion({ id: 'm1', match: MATCH, setMatch, loaded }), {
      initialProps: { loaded },
    });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.put).mockResolvedValue(envelope({}) as never);
  });

  it('antes de cargar el partido el formulario está vacío y cerrado', () => {
    const { result } = setup(null);

    expect(result.current.editRivalModal).toBe(false);
    expect(result.current.editOppName).toBe('');
    expect(result.current.editOppHand).toBeNull();
  });

  it('al cargar el partido rellena el formulario con los datos del rival', () => {
    const { result } = setup();

    expect(result.current.editOppName).toBe('Carlos');
    expect(result.current.editOppHand).toBe('Diestro');
    expect(result.current.editOppStyle).toBe('Ofensivo');
    expect(result.current.editOppLevel).toBe('Igual');
    expect(result.current.editOppRubberForehand).toBe('LISA');
    expect(result.current.editOppRubberBackhand).toBeNull();
  });

  it('un partido sin datos del rival deja los campos en null', () => {
    const { result } = setup({ ...MATCH, opponentHand: undefined, opponentStyle: '' as never });

    expect(result.current.editOppHand).toBeNull();
    expect(result.current.editOppStyle).toBeNull();
  });

  it('guardar envía todos los datos del rival, actualiza el partido y cierra el formulario', async () => {
    const { result } = setup();
    act(() => {
      result.current.setEditRivalModal(true);
      result.current.setEditOppName('Carlos Ruiz');
      result.current.setEditOppHand('Zurdo');
    });

    await act(async () => {
      await result.current.handleUpdateRival();
    });

    const payload = {
      opponentName: 'Carlos Ruiz',
      opponentHand: 'Zurdo',
      opponentStyle: 'Ofensivo',
      opponentLevel: 'Igual',
      opponentRubberForehand: 'LISA',
      opponentRubberBackhand: null,
    };
    expect(api.put).toHaveBeenCalledWith(ENDPOINTS.MANUAL_MATCHES.UPDATE('m1'), payload, undefined);
    expect(setMatch).toHaveBeenCalledWith({ ...MATCH, ...payload });
    expect(result.current.editRivalModal).toBe(false);
  });

  it('editar las gomas las envía al guardar', async () => {
    const { result } = setup();
    act(() => {
      result.current.setEditOppRubberForehand('PICOS_CORTOS');
      result.current.setEditOppRubberBackhand('ANTISPIN');
    });

    await act(async () => {
      await result.current.handleUpdateRival();
    });

    expect(api.put).toHaveBeenCalledWith(
      ENDPOINTS.MANUAL_MATCHES.UPDATE('m1'),
      expect.objectContaining({
        opponentRubberForehand: 'PICOS_CORTOS',
        opponentRubberBackhand: 'ANTISPIN',
      }),
      undefined,
    );
  });

  it('si falla deja el formulario abierto, no actualiza el partido y registra el error', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(api.put).mockRejectedValue(new Error('rechazado'));
    const { result } = setup();
    act(() => result.current.setEditRivalModal(true));

    await act(async () => {
      await result.current.handleUpdateRival();
    });

    expect(result.current.editRivalModal).toBe(true);
    expect(setMatch).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalled();
  });
});
