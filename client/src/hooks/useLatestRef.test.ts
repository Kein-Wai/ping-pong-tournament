import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useLatestRef } from './useLatestRef';

describe('useLatestRef', () => {
  it('empieza con el valor inicial', () => {
    const { result } = renderHook(() => useLatestRef('a'));

    expect(result.current.current).toBe('a');
  });

  it('guarda siempre el último valor, sin cambiar la referencia que se devuelve', () => {
    const { result, rerender } = renderHook(({ value }) => useLatestRef(value), {
      initialProps: { value: 'a' },
    });
    const first = result.current;

    rerender({ value: 'b' });

    expect(result.current).toBe(first);
    expect(result.current.current).toBe('b');
  });
});
