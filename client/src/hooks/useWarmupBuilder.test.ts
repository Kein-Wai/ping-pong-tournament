import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWarmupBuilder } from './useWarmupBuilder';

describe('useWarmupBuilder', () => {
  it('Debería empezar vacío, sin tiempo y con opción de añadir', () => {
    const { result } = renderHook(() => useWarmupBuilder());

    expect(result.current.entries).toEqual([]);
    expect(result.current.items).toEqual([]);
    expect(result.current.totalSec).toBe(0);
    expect(result.current.canAdd).toBe(true);
  });

  it('Debería añadir ejercicios con identificadores distintos aunque se repitan', () => {
    const { result } = renderHook(() => useWarmupBuilder());

    act(() => result.current.add('estiramientos'));
    act(() => result.current.add('estiramientos'));

    const [primero, segundo] = result.current.entries;
    expect(result.current.entries).toHaveLength(2);
    expect(primero.exerciseKey).toBe('estiramientos');
    expect(primero.id).not.toBe(segundo.id);
    expect(result.current.items).toEqual([
      { exerciseKey: 'estiramientos', durationSec: 60, restSec: 10 },
      { exerciseKey: 'estiramientos', durationSec: 60, restSec: 10 },
    ]);
  });

  it('Debería recalcular el tiempo total al cambiar duraciones y descansos', () => {
    const { result } = renderHook(() => useWarmupBuilder());
    act(() => result.current.add('movilidad'));
    const { id } = result.current.entries[0];
    expect(result.current.totalSec).toBe(5 + 10 + 60);

    act(() => result.current.changeDuration(id, 120));
    act(() => result.current.changeRest(id, 20));

    expect(result.current.totalSec).toBe(5 + 20 + 120);
  });

  it('Debería reordenar y quitar ejercicios', () => {
    const { result } = renderHook(() => useWarmupBuilder());
    act(() => result.current.add('estiramientos'));
    act(() => result.current.add('movilidad'));
    act(() => result.current.add('drill-libre'));
    const [a, b, c] = result.current.entries.map((entry) => entry.id);

    act(() => result.current.move(c, 'up'));
    expect(result.current.entries.map((entry) => entry.id)).toEqual([a, c, b]);

    act(() => result.current.remove(a));
    expect(result.current.entries.map((entry) => entry.id)).toEqual([c, b]);
  });

  it('Debería dejar de permitir añadir al llegar a 20 ejercicios', () => {
    const { result } = renderHook(() => useWarmupBuilder());

    for (let i = 0; i < 20; i += 1) act(() => result.current.add('movilidad'));

    expect(result.current.entries).toHaveLength(20);
    expect(result.current.canAdd).toBe(false);

    act(() => result.current.add('movilidad'));
    expect(result.current.entries).toHaveLength(20);
  });
});
