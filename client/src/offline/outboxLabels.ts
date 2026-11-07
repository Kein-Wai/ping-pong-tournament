import type { LocalStore } from './localStore';
import { discardOutboxItem, listOutbox, type OutboxItem } from './outbox';

export interface OutboxContext {
  store: LocalStore;
  userId: string;
}

/** Acción extra que la lista de pendientes ofrece para un tipo (p. ej. «Guardar como partido nuevo»). */
export interface OutboxAction {
  label: string;
  /** Solo se ofrece para los pendientes en estos estados (por defecto, los que requieren atención). */
  run: (item: OutboxItem, context: OutboxContext) => Promise<void>;
}

/** Lo que cada funcionalidad cuenta de su tipo de pendiente a la lista que ve el usuario. */
export interface OutboxKindBehavior {
  label: (item: OutboxItem) => string;
  /** Acciones disponibles cuando el pendiente requiere atención. */
  actions?: OutboxAction[];
  /** Limpieza de los datos locales cuando el usuario descarta el pendiente. */
  onDiscard?: (item: OutboxItem, context: OutboxContext) => Promise<void>;
}

const kinds: Record<string, OutboxKindBehavior> = {};

export const registerOutboxBehavior = (kind: string, behavior: OutboxKindBehavior): void => {
  kinds[kind] = behavior;
};

/** Solo el nombre que se muestra; atajo de `registerOutboxBehavior`. */
export const registerOutboxLabel = (kind: string, label: OutboxKindBehavior['label']): void =>
  registerOutboxBehavior(kind, { ...kinds[kind], label });

/** Texto para el usuario de un pendiente; si el tipo no está registrado, su nombre técnico. */
export const describeOutboxItem = (item: OutboxItem): string =>
  kinds[item.kind]?.label(item) ?? item.kind;

export const outboxActionsFor = (item: OutboxItem): OutboxAction[] =>
  kinds[item.kind]?.actions ?? [];

/**
 * Descarta un pendiente avisando antes a su tipo, para que deje coherentes sus datos locales:
 * sin eso, una copia local sin enviar volvería a encolarse sola en el siguiente arranque.
 */
export const discardWithCleanup = async (
  context: OutboxContext,
  item: OutboxItem,
): Promise<void> => {
  await kinds[item.kind]?.onDiscard?.(item, context);
  await discardOutboxItem(context.store, context.userId, item.id);
};

export const discardAllWithCleanup = async (context: OutboxContext): Promise<void> => {
  for (const item of await listOutbox(context.store, context.userId)) {
    await discardWithCleanup(context, item);
  }
};
