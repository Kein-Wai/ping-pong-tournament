import { describe, it, expect } from 'vitest';
import type { OutboxItem } from './outbox';
import { describeOutboxItem, registerOutboxLabel } from './outboxLabels';

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
