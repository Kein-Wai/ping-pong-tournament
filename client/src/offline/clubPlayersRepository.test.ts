import { describe, it, expect, vi } from 'vitest';
import type { User } from '../types/api';
import { createClubPlayersRepository } from './clubPlayersRepository';
import { createMemoryLocalStore } from './memoryLocalStore';

const PLAYERS = [{ id: 'p1', name: 'Eva' }] as User[];

const setup = (options: { native?: boolean; online?: boolean } = {}) => {
  const store = createMemoryLocalStore();
  const list = vi.fn().mockResolvedValue(PLAYERS);
  const network = { online: options.online ?? true };
  const repository = createClubPlayersRepository({
    list,
    getStore: async () => (options.native === false ? null : store),
    getUserId: () => 'coach',
    isOnline: () => network.online,
  });
  return { repository, list, network };
};

describe('clubPlayersRepository', () => {
  it('con red devuelve los jugadores del servidor y los guarda', async () => {
    const { repository, list, network } = setup();

    expect(await repository.list()).toEqual(PLAYERS);
    network.online = false;
    list.mockClear();

    expect(await repository.list()).toEqual(PLAYERS);
    expect(list).not.toHaveBeenCalled();
  });

  it('sin red ni copia guardada devuelve una lista vacía', async () => {
    const { repository } = setup({ online: false });

    expect(await repository.list()).toEqual([]);
  });

  it('si el servidor falla con red, usa la copia guardada', async () => {
    const { repository, list } = setup();
    await repository.list();
    list.mockRejectedValue(new Error('Network Error'));

    expect(await repository.list()).toEqual(PLAYERS);
  });

  it('en el navegador va directo al servidor', async () => {
    const { repository, list } = setup({ native: false });

    await repository.list();

    expect(list).toHaveBeenCalledTimes(1);
  });
});
