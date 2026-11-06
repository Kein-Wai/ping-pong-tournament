import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { resetAppLocalStore, setAppLocalStore } from '../../offline/appLocalStore';
import { createMemoryLocalStore } from '../../offline/memoryLocalStore';
import { enqueueOperation, listOutbox, updateOutboxItem } from '../../offline/outbox';
import { useSyncStore } from '../../store/syncStore';
import { loginAs, renderWithProviders } from '../../test/utils';
import { PendingItemsModal } from './PendingItemsModal';

const syncNow = vi.fn().mockResolvedValue(undefined);
const refresh = vi.fn().mockResolvedValue(undefined);
vi.mock('../../offline/appSync', () => ({ getAppSync: () => ({ syncNow, refresh }) }));

const setup = async () => {
  const store = createMemoryLocalStore();
  setAppLocalStore(store);
  loginAs({ id: 'u1' });
  await store.apply('u1', [
    enqueueOperation({ id: 'a', kind: 'Rutina', payload: 1 }, 1),
    enqueueOperation({ id: 'b', kind: 'Partido', payload: 2 }, 2),
  ]);
  await updateOutboxItem(store, 'u1', 'b', 'requiere-atencion', { reason: 'Conflicto de versión' });
  useSyncStore.setState({ pending: 1, needsAttention: 1 });
  return store;
};

describe('PendingItemsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetAppLocalStore();
  });

  it('lista los pendientes con su estado y el motivo de los que requieren atención', async () => {
    await setup();

    renderWithProviders(<PendingItemsModal opened onClose={() => {}} />);

    expect(await screen.findByText('Rutina')).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    expect(screen.getByText('Requiere atención')).toBeInTheDocument();
    expect(screen.getByText('Conflicto de versión')).toBeInTheDocument();
  });

  it('reintentar devuelve el elemento a la cola y lanza el envío', async () => {
    const store = await setup();
    renderWithProviders(<PendingItemsModal opened onClose={() => {}} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));

    await waitFor(() => expect(syncNow).toHaveBeenCalled());
    expect((await listOutbox(store, 'u1')).find((i) => i.id === 'b')).toMatchObject({
      status: 'pendiente',
      reason: null,
    });
  });

  it('descartar elimina el elemento', async () => {
    const store = await setup();
    renderWithProviders(<PendingItemsModal opened onClose={() => {}} />);

    await userEvent.click((await screen.findAllByRole('button', { name: 'Descartar' }))[0]);

    await waitFor(async () => expect((await listOutbox(store, 'u1')).map((i) => i.id)).toEqual(['b']));
    expect(refresh).toHaveBeenCalled();
  });

  it('sin pendientes lo dice', async () => {
    setAppLocalStore(createMemoryLocalStore());
    loginAs({ id: 'u1' });
    useSyncStore.setState({ pending: 0, needsAttention: 0 });

    renderWithProviders(<PendingItemsModal opened onClose={() => {}} />);

    expect(await screen.findByText('No hay nada pendiente.')).toBeInTheDocument();
  });
});
