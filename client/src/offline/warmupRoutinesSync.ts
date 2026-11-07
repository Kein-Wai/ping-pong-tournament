import axios from 'axios';
import { notifications } from '@mantine/notifications';
import { warmupRoutinesService } from '../api/services/warmupRoutines';
import type { SavedWarmupRoutine } from '../types/warmupRoutine';
import { registerOutboxHandler } from './appSync';
import { registerOutboxLabel } from './outboxLabels';
import type { OutboxHandler } from './syncEngine';
import {
  ROUTINE_OUTBOX_KIND,
  ROUTINES_COLLECTION,
  type LocalRoutine,
  type RoutineOutboxPayload,
} from './warmupRoutinesRepository';

const MAX_NAME_LENGTH = 40;
// Cuántas veces se prueba un nombre distinto antes de dejar que decida el usuario.
const MAX_RENAME_ATTEMPTS = 3;

interface HandlerDeps {
  service: Pick<typeof warmupRoutinesService, 'create' | 'update' | 'remove'>;
  notify: (message: string) => void;
}

const responseOf = (error: unknown) => (axios.isAxiosError(error) ? error.response : undefined);

const isDuplicateName = (error: unknown): boolean => {
  const response = responseOf(error);
  const message = (response?.data as { error?: unknown } | undefined)?.error;
  return response?.status === 409 && typeof message === 'string' && /nombre/i.test(message);
};

const withSuffix = (name: string, n: number) => {
  const suffix = ` (${n})`;
  return `${name.slice(0, MAX_NAME_LENGTH - suffix.length)}${suffix}`;
};

/**
 * Manejador de los pendientes de rutinas de calentamiento: crea, actualiza o borra la rutina en
 * el servidor. Si el nombre ya existe la guarda como «Nombre (2)» y avisa; si el servidor la
 * rechaza (p. ej. por el tope de 5), la deja en el móvil marcada «No se pudo sincronizar».
 */
export const createWarmupRoutineHandler =
  ({ service, notify }: HandlerDeps): OutboxHandler =>
  async (rawPayload, _item, { store, userId }) => {
    const payload = rawPayload as RoutineOutboxPayload;

    if (payload.op === 'delete') {
      try {
        await service.remove(payload.serverId);
      } catch (error) {
        // Si ya no existe en el servidor, el borrado está hecho.
        if (responseOf(error)?.status !== 404) throw error;
      }
      return;
    }

    const read = async () =>
      (await store.get<LocalRoutine>(userId, ROUTINES_COLLECTION, payload.routineId))?.value;
    const write = (routine: LocalRoutine) =>
      store.apply(userId, [
        { type: 'put', collection: ROUTINES_COLLECTION, id: routine.id, value: routine },
      ]);

    const routine = await read();
    if (!routine) return; // La borraron del móvil antes de enviarla.

    const send = (name: string): Promise<SavedWarmupRoutine> =>
      routine.serverId
        ? service.update(routine.serverId, { name, items: routine.items })
        : service.create({ name, items: routine.items });

    let name = routine.name;
    let saved: SavedWarmupRoutine | null = null;
    try {
      for (let attempt = 1; saved === null; attempt++) {
        try {
          saved = await send(name);
        } catch (error) {
          if (!isDuplicateName(error) || attempt > MAX_RENAME_ATTEMPTS) throw error;
          name = withSuffix(routine.name, attempt + 1);
        }
      }
    } catch (error) {
      const response = responseOf(error);
      if (response && [400, 403, 404, 409].includes(response.status)) {
        const reason = (response.data as { error?: unknown } | undefined)?.error;
        const fresh = (await read()) ?? routine;
        await write({
          ...fresh,
          syncError: `No se pudo sincronizar: ${typeof reason === 'string' ? reason : 'el servidor la rechazó.'}`,
        });
      }
      throw error;
    }

    // Se relee: si el usuario la editó mientras se enviaba, esa edición va en un nuevo envío y no se pisa.
    const fresh = (await read()) ?? routine;
    const renamed = name !== routine.name && fresh.name === routine.name;
    await write({
      ...fresh,
      serverId: saved.id,
      name: renamed ? name : fresh.name,
      syncError: null,
    });
    if (renamed) {
      notify(`Ya tenías una rutina «${routine.name}». Esta se ha guardado como «${name}».`);
    }
  };

/** Conecta el manejador de rutinas con la cola de envío. Se llama una vez al arrancar la app. */
export const registerWarmupRoutineHandler = (): void => {
  registerOutboxLabel(ROUTINE_OUTBOX_KIND, (item) =>
    (item.payload as RoutineOutboxPayload).op === 'delete'
      ? 'Borrar rutina de calentamiento'
      : 'Rutina de calentamiento',
  );
  registerOutboxHandler(
    ROUTINE_OUTBOX_KIND,
    createWarmupRoutineHandler({
      service: warmupRoutinesService,
      notify: (message) =>
        notifications.show({ title: 'Rutina renombrada', message, color: 'blue' }),
    }),
  );};
