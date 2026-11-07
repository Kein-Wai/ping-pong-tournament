import { usersService } from '../api/services/users';
import { useAuthStore } from '../store/authStore';
import { selectIsOnline, useConnectivityStore } from '../store/connectivityStore';
import type { User } from '../types/api';
import { getAppLocalStore } from './appLocalStore';
import { PLAYERS_CACHE_COLLECTION, PLAYERS_CACHE_ID } from './clubPlayersCache';
import type { LocalStore } from './localStore';

interface Deps {
  list: () => Promise<User[]>;
  getStore: () => Promise<LocalStore | null>;
  getUserId: () => string | null;
  isOnline: () => boolean;
}

/**
 * Jugadores del club para el entrenador. En la app nativa se guardan en el móvil cada vez que se
 * descargan con conexión, para poder elegir a quién analizar sin red; en el navegador va directo
 * al servidor.
 */
export const createClubPlayersRepository = ({ list, getStore, getUserId, isOnline }: Deps) => ({
  list: async (): Promise<User[]> => {
    const store = await getStore();
    const userId = getUserId();
    if (!store || !userId) return list();

    if (isOnline()) {
      try {
        const players = await list();
        await store.apply(userId, [
          { type: 'put', collection: PLAYERS_CACHE_COLLECTION, id: PLAYERS_CACHE_ID, value: players },
        ]);
        return players;
      } catch {
        // Sin respuesta del servidor se usan los jugadores guardados.
      }
    }
    return (await store.get<User[]>(userId, PLAYERS_CACHE_COLLECTION, PLAYERS_CACHE_ID))?.value ?? [];
  },
});

export const clubPlayersRepository = createClubPlayersRepository({
  list: () => usersService.list(),
  getStore: getAppLocalStore,
  getUserId: () => useAuthStore.getState().user?.id ?? null,
  isOnline: () => selectIsOnline(useConnectivityStore.getState()),
});
