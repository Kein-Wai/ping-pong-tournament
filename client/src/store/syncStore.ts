import { create } from 'zustand';

interface SyncState {
  /** Pendientes por enviar (incluye los que esperan un reintento). */
  pending: number;
  /** Pendientes que el servidor rechazó y esperan una decisión del usuario. */
  needsAttention: number;
  syncing: boolean;
  /** Partidos abiertos en pantalla; mientras haya alguno no se sincroniza. */
  openMatches: number;
  setCounts: (counts: { pending: number; needsAttention: number }) => void;
  setSyncing: (syncing: boolean) => void;
  /** Marca un partido como abierto y devuelve la función que lo libera (idempotente). */
  blockSync: () => () => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  pending: 0,
  needsAttention: 0,
  syncing: false,
  openMatches: 0,
  setCounts: ({ pending, needsAttention }) => set({ pending, needsAttention }),
  setSyncing: (syncing) => set({ syncing }),
  blockSync: () => {
    set((state) => ({ openMatches: state.openMatches + 1 }));
    let released = false;
    return () => {
      if (released) return;
      released = true;
      set((state) => ({ openMatches: state.openMatches - 1 }));
    };
  },
}));

export const selectIsSyncBlocked = (state: Pick<SyncState, 'openMatches'>) =>
  state.openMatches > 0;
