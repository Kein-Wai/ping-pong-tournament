import { describe, it, expect, vi } from 'vitest';
import { createMemoryLocalStore } from './memoryLocalStore';
import { enqueueOperation, listOutbox, type OutboxItem } from './outbox';
import {
  describeOutboxItem,
  discardAllWithCleanup,
  discardWithCleanup,
  outboxActionsFor,
  registerOutboxBehavior,
  registerOutboxLabel,
} from './outboxLabels';

const item = (kind: string, payload: unknown = null): OutboxItem => ({
  id: 'a',
  kind,
  payload,
  status: 'pendiente',
  createdAt: 0,
  attempts: 0,
  nextAttemptAt: 0,
  reason: null,
});

describe('describeOutboxItem', () => {
  it('usa el texto registrado para el tipo', () => {
    registerOutboxLabel('prueba-etiqueta', (i) => `Cosa ${String(i.payload)}`);

    expect(describeOutboxItem(item('prueba-etiqueta', 7))).toBe('Cosa 7');
  });

  it('sin etiqueta registrada muestra el nombre del tipo', () => {
    expect(describeOutboxItem(item('desconocido'))).toBe('desconocido');
  });
});

describe('comportamiento por tipo de pendiente', () => {
  const makeContext = async () => {
    const store = createMemoryLocalStore();
    await store.apply('u1', [
      enqueueOperation({ id: 'a', kind: 'con-limpieza', payload: 1 }, 1),
      enqueueOperation({ id: 'b', kind: 'sin-registrar', payload: 2 }, 2),
    ]);
    return { store, userId: 'u1' };
  };

  it('descartar avisa primero al tipo y luego elimina el pendiente', async () => {
    const onDiscard = vi.fn();
    registerOutboxBehavior('con-limpieza', { label: () => 'X', onDiscard });
    const context = await makeContext();
    const [first] = await listOutbox(context.store, 'u1');

    await discardWithCleanup(context, first);

    expect(onDiscard).toHaveBeenCalledWith(first, context);
    expect((await listOutbox(context.store, 'u1')).map((i) => i.id)).toEqual(['b']);
  });

  it('descartar todo limpia cada tipo y vacía la cola', async () => {
    const onDiscard = vi.fn();
    registerOutboxBehavior('con-limpieza', { label: () => 'X', onDiscard });
    const context = await makeContext();

    await discardAllWithCleanup(context);

    expect(onDiscard).toHaveBeenCalledTimes(1);
    expect(await listOutbox(context.store, 'u1')).toEqual([]);
  });

  it('ofrece las acciones registradas y ninguna si el tipo no las tiene', async () => {
    const run = vi.fn();
    registerOutboxBehavior('con-accion', { label: () => 'X', actions: [{ label: 'Hacer', run }] });

    expect(outboxActionsFor(item('con-accion')).map((a) => a.label)).toEqual(['Hacer']);
    expect(outboxActionsFor(item('otro-sin-nada'))).toEqual([]);
  });
});
