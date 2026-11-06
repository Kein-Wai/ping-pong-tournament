import type { User } from '../store/authStore';
import { getAppLocalStore } from './appLocalStore';

const PROFILE_COLLECTION = 'perfil';
/** Cada usuario guarda un único perfil. */
const PROFILE_ID = 'actual';

/**
 * Id del usuario que firma el token. Se lee sin comprobar la firma ni la caducidad: sirve para
 * saber de quién es el perfil guardado, no para dar acceso a nada.
 */
export const userIdFromToken = (token: string): string | null => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload?.id === 'string' ? payload.id : null;
  } catch {
    return null;
  }
};

/** Guarda el perfil en el móvil para poder arrancar sin conexión. En el navegador no hace nada. */
export const cacheProfile = async (user: User): Promise<void> => {
  const store = await getAppLocalStore();
  if (!store) return;
  try {
    await store.apply(user.id, [
      { type: 'put', collection: PROFILE_COLLECTION, id: PROFILE_ID, value: user },
    ]);
  } catch (error) {
    // No poder guardarlo no debe romper la sesión: solo se pierde el arranque sin conexión.
    console.error('No se pudo guardar el perfil en el móvil.', error);
  }
};

/** Perfil guardado del usuario al que pertenece el token, o `null` si no hay. */
export const loadCachedProfile = async (token: string): Promise<User | null> => {
  const userId = userIdFromToken(token);
  const store = await getAppLocalStore();
  if (!userId || !store) return null;
  return (await store.get<User>(userId, PROFILE_COLLECTION, PROFILE_ID))?.value ?? null;
};

interface UserStore {
  subscribe: (
    listener: (state: { user: User | null }, previous: { user: User | null }) => void,
  ) => () => void;
}

/**
 * Guarda el perfil cada vez que el usuario del store cambia. Cuando pasa a `null` (cerrar sesión o
 * arrancar) no borra nada: sin eso, abrir la app sin red perdería el perfil antes de poder leerlo.
 * Devuelve la función que deja de guardar.
 */
export const startProfileCaching = (authStore: UserStore): (() => void) =>
  authStore.subscribe(({ user }, { user: previous }) => {
    // El store avisa de cualquier cambio (token, etc.): solo se escribe cuando cambia el perfil.
    if (user && user !== previous) void cacheProfile(user);
  });
