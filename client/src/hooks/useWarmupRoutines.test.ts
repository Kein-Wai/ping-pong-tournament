import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { warmupRoutinesService } from '../api/services/warmupRoutines';
import type { SavedWarmupRoutine } from '../types/warmupRoutine';
import { useWarmupRoutines } from './useWarmupRoutines';

vi.mock('../api/services/warmupRoutines', () => ({
  warmupRoutinesService: { list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}));

const service = vi.mocked(warmupRoutinesService);

const ITEMS = [{ exerciseKey: 'estiramientos' as const, durationSec: 60, restSec: 10 }];

const routine = (id: string, name: string, overrides: Partial<SavedWarmupRoutine> = {}): SavedWarmupRoutine => ({
  id,
  name,
  items: ITEMS,
  createdAt: '2026-10-27T10:00:00.000Z',
  updatedAt: '2026-10-27T10:00:00.000Z',
  ...overrides,
});

const TORNEO = routine('r1', 'Torneo');
const ENTRENO = routine('r2', 'Antes de entrenar');

describe('useWarmupRoutines', () => {
  const onSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    service.list.mockResolvedValue([TORNEO, ENTRENO]);
  });

  const cargado = async () => {
    const hook = renderHook(() => useWarmupRoutines({ onSelect }));
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
    return hook;
  };

  it('Debería cargar las rutinas guardadas al montar y poder crear más', async () => {
    const { result } = await cargado();

    expect(result.current.routines).toEqual([TORNEO, ENTRENO]);
    expect(result.current.canCreate).toBe(true);
  });

  it('Debería seleccionar la primera, que es la más reciente, y avisar para cargarla en el constructor', async () => {
    const { result } = await cargado();

    expect(result.current.selected).toEqual(TORNEO);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(TORNEO);
  });

  it('Debería no seleccionar nada ni avisar si el jugador aún no tiene rutinas', async () => {
    service.list.mockResolvedValue([]);

    const { result } = await cargado();

    expect(result.current.routines).toEqual([]);
    expect(result.current.selected).toBeNull();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('Debería dejar la lista vacía y dejar de cargar si la petición falla', async () => {
    service.list.mockRejectedValue(new Error('red caída'));

    const { result } = await cargado();

    expect(result.current.routines).toEqual([]);
  });

  it('Debería cambiar la rutina activa y avisar al elegir otra', async () => {
    const { result } = await cargado();
    onSelect.mockClear();

    act(() => result.current.select('r2'));

    expect(result.current.selected).toEqual(ENTRENO);
    expect(onSelect).toHaveBeenCalledWith(ENTRENO);
  });

  describe('saveAsNew', () => {
    const NUEVA = routine('r3', 'Nueva');

    it('Debería crear la rutina, ponerla la primera y dejarla activa sin recargar el constructor', async () => {
      service.create.mockResolvedValue(NUEVA);
      const { result } = await cargado();
      onSelect.mockClear();

      let guardada: SavedWarmupRoutine | null = null;
      await act(async () => {
        guardada = await result.current.saveAsNew('Nueva', ITEMS);
      });

      expect(service.create).toHaveBeenCalledWith({ name: 'Nueva', items: ITEMS });
      expect(guardada).toEqual(NUEVA);
      expect(result.current.routines.map((r) => r.id)).toEqual(['r3', 'r1', 'r2']);
      expect(result.current.selected).toEqual(NUEVA);
      // El constructor ya tiene esos ejercicios: recargarlos regeneraría sus identificadores para nada.
      expect(onSelect).not.toHaveBeenCalled();
    });

    it('Debería devolver null y dejar todo igual si el guardado falla', async () => {
      service.create.mockRejectedValue(new Error('409'));
      const { result } = await cargado();

      let guardada: SavedWarmupRoutine | null = NUEVA;
      await act(async () => {
        guardada = await result.current.saveAsNew('Nueva', ITEMS);
      });

      expect(guardada).toBeNull();
      expect(result.current.routines).toEqual([TORNEO, ENTRENO]);
      expect(result.current.isSaving).toBe(false);
    });

    it('Debería dejar de permitir crear al llegar a cinco rutinas', async () => {
      service.list.mockResolvedValue(['a', 'b', 'c', 'd', 'e'].map((id) => routine(id, `Rutina ${id}`)));

      const { result } = await cargado();

      expect(result.current.canCreate).toBe(false);
    });
  });

  describe('save', () => {
    const NUEVOS_EJERCICIOS = [{ exerciseKey: 'movilidad' as const, durationSec: 90, restSec: 5 }];

    it('Debería actualizar la rutina activa con los ejercicios actuales y subirla al principio', async () => {
      const actualizada = routine('r2', 'Antes de entrenar', { items: NUEVOS_EJERCICIOS });
      service.update.mockResolvedValue(actualizada);
      const { result } = await cargado();
      act(() => result.current.select('r2'));

      let guardada: SavedWarmupRoutine | null = null;
      await act(async () => {
        guardada = await result.current.save(NUEVOS_EJERCICIOS);
      });

      expect(service.update).toHaveBeenCalledWith('r2', { name: 'Antes de entrenar', items: NUEVOS_EJERCICIOS });
      expect(guardada).toEqual(actualizada);
      expect(result.current.routines).toEqual([actualizada, TORNEO]);
    });

    it('Debería no hacer nada si no hay una rutina activa', async () => {
      service.list.mockResolvedValue([]);
      const { result } = await cargado();

      let guardada: SavedWarmupRoutine | null = TORNEO;
      await act(async () => {
        guardada = await result.current.save(NUEVOS_EJERCICIOS);
      });

      expect(guardada).toBeNull();
      expect(service.update).not.toHaveBeenCalled();
    });
  });

  describe('rename', () => {
    it('Debería cambiar solo el nombre y conservar los ejercicios guardados, no los del constructor', async () => {
      const renombrada = routine('r1', 'Final de liga');
      service.update.mockResolvedValue(renombrada);
      const { result } = await cargado();

      await act(async () => {
        await result.current.rename('Final de liga');
      });

      expect(service.update).toHaveBeenCalledWith('r1', { name: 'Final de liga', items: TORNEO.items });
      expect(result.current.routines[0]).toEqual(renombrada);
    });
  });

  describe('remove', () => {
    it('Debería borrar la rutina activa, quitarla de la lista y dejar de tener una activa', async () => {
      service.remove.mockResolvedValue(undefined);
      const { result } = await cargado();

      let borrada = false;
      await act(async () => {
        borrada = await result.current.remove();
      });

      expect(service.remove).toHaveBeenCalledWith('r1');
      expect(borrada).toBe(true);
      expect(result.current.routines).toEqual([ENTRENO]);
      expect(result.current.selected).toBeNull();
    });

    it('Debería dejar todo igual si el borrado falla', async () => {
      service.remove.mockRejectedValue(new Error('404'));
      const { result } = await cargado();

      let borrada = true;
      await act(async () => {
        borrada = await result.current.remove();
      });

      expect(borrada).toBe(false);
      expect(result.current.routines).toEqual([TORNEO, ENTRENO]);
      expect(result.current.selected).toEqual(TORNEO);
    });

    it('Debería permitir crear de nuevo tras borrar con cinco guardadas', async () => {
      service.list.mockResolvedValue(['a', 'b', 'c', 'd', 'e'].map((id) => routine(id, `Rutina ${id}`)));
      service.remove.mockResolvedValue(undefined);
      const { result } = await cargado();
      expect(result.current.canCreate).toBe(false);

      await act(async () => {
        await result.current.remove();
      });

      expect(result.current.canCreate).toBe(true);
    });
  });
});
