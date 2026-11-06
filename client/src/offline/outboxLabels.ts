import type { OutboxItem } from './outbox';

type Describe = (item: OutboxItem) => string;

const labels: Record<string, Describe> = {};

/** Cada funcionalidad registra cómo se llama su tipo de pendiente en la lista que ve el usuario. */
export const registerOutboxLabel = (kind: string, describe: Describe): void => {
  labels[kind] = describe;
};

/** Texto para el usuario de un pendiente; si el tipo no está registrado, su nombre técnico. */
export const describeOutboxItem = (item: OutboxItem): string => labels[item.kind]?.(item) ?? item.kind;
