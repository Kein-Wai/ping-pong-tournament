import type { LocalStore } from './localStore';
import { isNativeApp } from '../utils/platform';

let instance: Promise<LocalStore | null> | null = null;

const open = async (): Promise<LocalStore | null> => {
  if (!isNativeApp()) return null;
  try {
    // Carga diferida: el plugin de SQLite y sus dependencias web no deben engordar el bundle del navegador.
    const { openLocalStore } = await import('./openLocalStore');
    return await openLocalStore();
  } catch (error) {
    console.error('No se pudo abrir la base local; el modo sin conexión no está disponible.', error);
    // La próxima petición lo intenta de nuevo en vez de quedarse sin almacén hasta reiniciar.
    instance = null;
    return null;
  }
};

/**
 * Almacén local único de la app: se abre la primera vez que se pide y se comparte después.
 * Devuelve `null` en el navegador, donde no hay modo sin conexión, o si la base no se pudo abrir.
 */
export const getAppLocalStore = (): Promise<LocalStore | null> => (instance ??= open());

/** Fija el almacén que usará la app (`null` = sin almacén). Sirve para los tests. */
export const setAppLocalStore = (store: LocalStore | null): void => {
  instance = Promise.resolve(store);
};

/** Olvida el almacén abierto, de modo que la próxima petición lo abra otra vez. */
export const resetAppLocalStore = (): void => {
  instance = null;
};
