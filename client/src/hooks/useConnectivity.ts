import { useEffect } from 'react';
import { startConnectivityMonitoring } from '../offline/connectivityMonitor';
import { selectIsOnline, useConnectivityStore } from '../store/connectivityStore';
import { isNativeApp } from '../utils/platform';

/** Estado de la conexión para las pantallas: si se puede usar la red y el interruptor «Trabajar offline». */
export const useConnectivity = () => {
  const networkOnline = useConnectivityStore((state) => state.networkOnline);
  const workOffline = useConnectivityStore((state) => state.workOffline);
  const setWorkOffline = useConnectivityStore((state) => state.setWorkOffline);

  return {
    isNative: isNativeApp(),
    networkOnline,
    workOffline,
    isOnline: selectIsOnline({ networkOnline, workOffline }),
    setWorkOffline,
  };
};

/** Vigila la red del móvil mientras la app está montada. Se usa una sola vez, en la raíz de la app. */
export const useConnectivityMonitor = () => {
  useEffect(() => {
    let stopped = false;
    let stop: (() => void) | null = null;

    void startConnectivityMonitoring().then((stopMonitoring) => {
      // Si la app se desmontó mientras arrancaba, se para en cuanto se pueda.
      if (stopped) stopMonitoring();
      else stop = stopMonitoring;
    });

    return () => {
      stopped = true;
      stop?.();
    };
  }, []);
};
