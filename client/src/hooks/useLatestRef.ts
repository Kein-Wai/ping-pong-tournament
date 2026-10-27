import { useEffect, useRef } from 'react';

/**
 * Referencia estable que siempre apunta al último valor recibido. Sirve para que un intervalo o un
 * bucle de animación llame a funciones del padre sin reiniciarse cada vez que el padre las recrea.
 */
export function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}
