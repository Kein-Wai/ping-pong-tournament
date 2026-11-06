import { create } from 'zustand';

export const WORK_OFFLINE_KEY = 'pingpong_work_offline';

interface ConnectivityState {
  /** Lo que dice el móvil: hay o no red. */
  networkOnline: boolean;
  /** Interruptor «Trabajar offline»: el usuario pide no usar la red aunque la haya. */
  workOffline: boolean;
  setNetworkOnline: (online: boolean) => void;
  setWorkOffline: (workOffline: boolean) => void;
}

/** El almacenamiento puede estar bloqueado (ventana privada): sin él el interruptor dura solo la sesión. */
const readWorkOffline = (): boolean => {
  try {
    return localStorage.getItem(WORK_OFFLINE_KEY) === 'true';
  } catch {
    return false;
  }
};

const saveWorkOffline = (workOffline: boolean): void => {
  try {
    if (workOffline) localStorage.setItem(WORK_OFFLINE_KEY, 'true');
    else localStorage.removeItem(WORK_OFFLINE_KEY);
  } catch {
    // Sin almacenamiento el interruptor funciona igual, pero no se recordará al reabrir la app.
  }
};

export const useConnectivityStore = create<ConnectivityState>((set) => ({
  networkOnline: true,
  workOffline: readWorkOffline(),

  setNetworkOnline: (networkOnline) => set({ networkOnline }),

  setWorkOffline: (workOffline) => {
    saveWorkOffline(workOffline);
    set({ workOffline });
  },
}));

/** Se puede usar la red: la hay y el usuario no ha pedido trabajar offline. */
export const selectIsOnline = (state: Pick<ConnectivityState, 'networkOnline' | 'workOffline'>) =>
  state.networkOnline && !state.workOffline;
