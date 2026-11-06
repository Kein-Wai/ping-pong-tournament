import { Network } from '@capacitor/network';
import { useConnectivityStore } from '../store/connectivityStore';
import { isNativeApp } from '../utils/platform';

let initialStatus: Promise<void> = Promise.resolve();

/** Se resuelve cuando ya se ha leído el estado inicial de la red (o enseguida si no hay que leerlo). */
export const whenConnectivityKnown = (): Promise<void> => initialStatus;

const refreshStatus = async (): Promise<void> => {
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
 *
 * El plugin de red es la fuente principal, pero en iOS no siempre avisa al activar el modo avión,
 * así que también se atienden los eventos `online`/`offline` del WebView y se relee el estado al
 * volver a la app. Con cualquiera de las señales basta para enterarse.
 */
export const startConnectivityMonitoring = async (): Promise<() => void> => {
  if (!isNativeApp()) return () => undefined;

  initialStatus = refreshStatus();
  await initialStatus;

  const setOffline = () => useConnectivityStore.getState().setNetworkOnline(false);
  const onVisible = () => {
    if (document.visibilityState !== 'hidden') void refreshStatus();
  };
  window.addEventListener('offline', setOffline);
  window.addEventListener('online', refreshStatus);
  document.addEventListener('visibilitychange', onVisible);

  let listener: { remove: () => Promise<void> } | null = null;
  try {
    listener = await Network.addListener('networkStatusChange', (status) =>
      useConnectivityStore.getState().setNetworkOnline(status.connected),
    );
  } catch (error) {
    console.error('El plugin de red no está disponible; se usan solo los eventos del WebView.', error);
  }

  return () => {
    window.removeEventListener('offline', setOffline);
    window.removeEventListener('online', refreshStatus);
    document.removeEventListener('visibilitychange', onVisible);
    void listener?.remove();
  };
};
