import { describe, it, expect, vi } from 'vitest';
import type { Prisma, PrismaClient } from '@prisma/client';
import { inTransaction } from './transaction';

describe('inTransaction', () => {
  it('con el cliente global abre una transacción y ejecuta el trabajo con su cliente', async () => {
    const tx = { marker: 'tx' } as unknown as Prisma.TransactionClient;
    const client = { $transaction: vi.fn(async (work) => work(tx)) } as unknown as PrismaClient;
    const work = vi.fn().mockResolvedValue('hecho');

    const result = await inTransaction(client, work);

    expect(client.$transaction).toHaveBeenCalledTimes(1);
    expect(work).toHaveBeenCalledWith(tx);
    expect(result).toBe('hecho');
  });

  it('con el cliente de una transacción se une a ella sin abrir otra', async () => {
    const tx = { marker: 'tx' } as unknown as Prisma.TransactionClient;
    const work = vi.fn().mockResolvedValue('hecho');

    const result = await inTransaction(tx, work);

    expect(work).toHaveBeenCalledWith(tx);
    expect(result).toBe('hecho');
  });

  it('propaga el error del trabajo para que la transacción haga rollback', async () => {
    const client = {
      $transaction: vi.fn(async (work) => work({})),
    } as unknown as PrismaClient;

    await expect(inTransaction(client, async () => Promise.reject(new Error('fallo')))).rejects.toThrow('fallo');
  });
});
