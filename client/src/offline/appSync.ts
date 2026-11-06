import { useSyncStore } from '../store/syncStore';
import { getAppLocalStore } from './appLocalStore';
import { createSyncController, type SyncController } from './syncController';
import { createSyncEngine, type OutboxHandler } from './syncEngine';

/** Manejadores por tipo de pendiente. Cada funcionalidad offline registra el suyo al cargarse. */
const handlers: Record<string, OutboxHandler> = {};

export const registerOutboxHandler = (kind: string, handler: OutboxHandler): void => {
  handlers[kind] = handler;
};

/** Tareas que cada funcionalidad quiere hacer al arrancar la sincronización de un usuario, antes del primer envío. */
const startupTasks: Array<(userId: string) => Promise<void>> = [];

export const registerStartupTask = (task: (userId: string) => Promise<void>): void => {
  startupTasks.push(task);
};

let active: { userId: string; controller: SyncController } | null = null;

/** Controlador de sincronización en marcha, o `null` si no hay sesión o no hay almacén local. */
export const getAppSync = (): SyncController | null => active?.controller ?? null;

/** Detiene la sincronización de la sesión actual (al cerrarla o cambiar de usuario). */
export const stopAppSync = (): void => {
  active?.controller.stop();
  active = null;
  // Los contadores son de la sesión que termina: otra cuenta no debe ver los suyos.
  useSyncStore.getState().setCounts({ pending: 0, needsAttention: 0 });
};

/**
 * Arranca la sincronización para un usuario: abre el almacén, crea el motor y lanza el primer envío.
 * Pedirla otra vez para el mismo usuario no hace nada; para otro, sustituye a la anterior.
 */
export const startAppSync = async (userId: string): Promise<void> => {
  if (active?.userId === userId) return;
  stopAppSync();
  const store = await getAppLocalStore();
  if (!store) return;
  const controller = createSyncController({
    store,
    engine: createSyncEngine({ store, handlers }),
    getUserId: () => userId,
  });
  active = { userId, controller };
  for (const task of startupTasks) {
    try {
      await task(userId);
    } catch (error) {
      console.error('Fallo una tarea de arranque de la sincronización.', error);
    }
  }
  controller.start();
};
