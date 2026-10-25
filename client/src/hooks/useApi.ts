import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Hook generico para cargar datos de la API.
 *
 * Unifica el patron que estaba repetido en 30 paginas: `useState` para los
 * datos, otro para el estado de carga, otro para el error, y un `useEffect`
 * que dispara la peticion. Aqui todo eso vive detras de una interface
 * pequena, de modo que el componente solo decide QUE quiere cargar.
 *
 * La funcion `fetcher` se guarda en un ref para que cambiar su identidad no
 * dispare la peticion otra vez: el efecto depende solo de `deps`.
 */

/** Estado de una carga de datos. */
export interface UseApiResult<T> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | undefined;
  /** Recarga los datos usando la misma funcion de carga, sin volver a marcar `isLoading`. */
  refetch: () => Promise<void>;
  /** Permite fijar el valor manualmente (por ejemplo tras una mutacion). */
  setData: (value: T | undefined) => void;
}

/** Opciones del hook. */
export interface UseApiOptions {
  /** No se dispara la carga mientras sea false. */
  enabled?: boolean;
}

/**
 * Carga datos de la API y expone data, isLoading y error.
 *
 * @param fetcher Funcion que devuelve la promesa con los datos.
 * @param deps Dependencias que, al cambiar, provocan una recarga.
 */
export const useApi = <T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList = [],
  options: UseApiOptions = {},
): UseApiResult<T> => {
  const { enabled = true } = options;

  const [data, setData] = useState<T | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<Error | undefined>(undefined);

  // Latest ref: guarda la ultima version del fetcher sin que el efecto tenga
  // que depender de su identidad. Se actualiza en un efecto, nunca durante el
  // render (lo prohibe la regla de react-hooks v7).
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // `showLoading` distingue la carga inicial (o por cambio de deps) de una recarga:
  // en una recarga se conservan los datos y no vuelve el cargador.
  const load = useCallback(async (showLoading: boolean) => {
    if (showLoading) setIsLoading(true);
    setError(undefined);

    try {
      const result = await fetcherRef.current();
      if (mountedRef.current) setData(result);
    } catch (caught) {
      if (mountedRef.current) {
        setError(caught instanceof Error ? caught : new Error(String(caught)));
      }
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    void load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, load, ...deps]);

  const refetch = useCallback(() => load(false), [load]);

  return { data, isLoading, error, refetch, setData };
};

export default useApi;
