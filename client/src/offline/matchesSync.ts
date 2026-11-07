import axios from 'axios';
import { manualMatchesService } from '../api/services/manualMatches';
import { registerOutboxHandler } from './appSync';
import type { LocalStore } from './localStore';
import {
  buildSyncPayload,
  MATCH_OUTBOX_KIND,
  MATCHES_COLLECTION,
  type LocalMatch,
} from './localMatches';
import { enqueueOperation, OUTBOX_COLLECTION } from './outbox';
import { registerOutboxBehavior } from './outboxLabels';
import type { OutboxHandler } from './syncEngine';

/** Rechazos que el servidor da por definitivos para este documento: hay que decidir qué hacer con él. */
const REJECTION_STATUSES = [400, 403, 404, 409];

interface MatchHandlerDeps {
  service: { sync: typeof manualMatchesService.sync };
  newId: () => string;
}

const reasonOf = (error: unknown): string | null => {
  if (!axios.isAxiosError(error) || !error.response) return null;
  if (!REJECTION_STATUSES.includes(error.response.status)) return null;
  const message = (error.response.data as { error?: unknown } | undefined)?.error;
  return typeof message === 'string' ? message : 'El servidor rechazó el partido.';
};

/**
 * Envía un partido guardado en el móvil como un documento entero (ADR 0003). Si el servidor lo
 * rechaza (conflicto de versión, sin acceso, datos inválidos), la copia local se conserva intacta
 * marcada con el motivo, para que el usuario decida; no se mezclan puntos automáticamente.
 */
export const createMatchHandler =
  ({ service, newId }: MatchHandlerDeps): OutboxHandler =>
  async (rawPayload, _item, { store, userId }) => {
    const { matchId } = rawPayload as { matchId: string };
    const read = async () =>
      (await store.get<LocalMatch>(userId, MATCHES_COLLECTION, matchId))?.value ?? null;
    const write = (doc: LocalMatch) =>
      store.apply(userId, [{ type: 'put', collection: MATCHES_COLLECTION, id: matchId, value: doc }]);

    const doc = await read();
    if (!doc) return; // La copia se descartó antes de enviarla.

    const sentRevision = doc.revision;
    let response;
    try {
      response = await service.sync(matchId, buildSyncPayload(doc, doc.syncId ?? newId()));
    } catch (error) {
      const reason = reasonOf(error);
      if (reason) await write({ ...((await read()) ?? doc), conflict: reason });
      throw error;
    }

    // Si se tocó el partido mientras se enviaba, esos cambios (revisión mayor) siguen pendientes.
    const fresh = (await read()) ?? doc;
    await write({
      ...fresh,
      baseVersion: response.version,
      syncedRevision: sentRevision,
      conflict: null,
    });
  };

interface NewCopyDeps {
  newId: () => string;
  now: () => number;
}

/**
 * Convierte la copia local en conflicto en un partido nuevo e independiente (ids nuevos y sin
 * versión), lo encola y quita el envío rechazado. El partido original del servidor no se toca.
 */
export const saveMatchAsNew = async (
  { store, userId }: { store: LocalStore; userId: string },
  matchId: string,
  { newId, now }: NewCopyDeps,
): Promise<void> => {
  const original = (await store.get<LocalMatch>(userId, MATCHES_COLLECTION, matchId))?.value;
  if (!original) return;
  const id = newId();
  const copy: LocalMatch = {
    data: {
      ...original.data,
      id,
      points: original.data.points.map((point) => ({ ...point, id: newId() })),
    },
    baseVersion: null,
    revision: 1,
    syncedRevision: 0,
    syncId: newId(),
    conflict: null,
  };
  await store.apply(userId, [
    { type: 'remove', collection: OUTBOX_COLLECTION, id: `${MATCH_OUTBOX_KIND}:${matchId}` },
    { type: 'remove', collection: MATCHES_COLLECTION, id: matchId },
    { type: 'put', collection: MATCHES_COLLECTION, id, value: copy },
    enqueueOperation(
      {
        id: `${MATCH_OUTBOX_KIND}:${id}`,
        kind: MATCH_OUTBOX_KIND,
        payload: { matchId: id, opponent: copy.data.opponentName },
      },
      now(),
    ),
  ]);
};

/** Quita la copia local de un partido descartado, para que no se vuelva a encolar al arrancar. */
export const discardMatchCopy = (
  { store, userId }: { store: LocalStore; userId: string },
  matchId: string,
): Promise<void> =>
  store.apply(userId, [{ type: 'remove', collection: MATCHES_COLLECTION, id: matchId }]);

/** Conecta los partidos con la cola de envío y con la lista de pendientes. Se llama al arrancar. */
export const registerMatchSync = (): void => {
  const newId = () => crypto.randomUUID();
  registerOutboxHandler(MATCH_OUTBOX_KIND, createMatchHandler({ service: manualMatchesService, newId }));
  registerOutboxBehavior(MATCH_OUTBOX_KIND, {
    label: (item) => `Partido contra ${(item.payload as { opponent?: string }).opponent ?? 'rival'}`,
    actions: [
      {
        label: 'Guardar como partido nuevo',
        run: (item, context) =>
          saveMatchAsNew(context, (item.payload as { matchId: string }).matchId, {
            newId,
            now: Date.now,
          }),
      },
    ],
    onDiscard: (item, context) => discardMatchCopy(context, (item.payload as { matchId: string }).matchId),
  });
};
