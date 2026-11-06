import { Network } from '@capacitor/network';
import { useConnectivityStore } from '../store/connectivityStore';
import { isNativeApp } from '../utils/platform';

let initialStatus: Promise<void> = Promise.resolve();

/** Se resuelve cuando ya se ha leído el estado inicial de la red (o enseguida si no hay que leerlo). */
export const whenConnectivityKnown = (): Promise<void> => initialStatus;

const readInitialStatus = async (): Promise<void> => {
  try {
    useConnectivityStore.getState().setNetworkOnline((await Network.getStatus()).connected);
  } catch {
    // Sin poder leerla, se supone que hay red: es el estado de siempre y la primera petición lo desmiente.
  }
};

/**
 * Mantiene `networkOnline` al día con la red del móvil. Solo en las apps nativas: en el navegador
 * el modo sin conexión no existe y la red se da siempre por disponible. Devuelve la función que
 * deja de escuchar.
 */
export const startConnectivityMonitoring = async (): Promise<() => void> => {
  if (!isNativeApp()) return () => undefined;

  initialStatus = readInitialStatus();
  await initialStatus;

  const listener = await Network.addListener('networkStatusChange', (status) =>
    useConnectivityStore.getState().setNetworkOnline(status.connected),
  );
  return () => {
    void listener.remove();
  };
};
