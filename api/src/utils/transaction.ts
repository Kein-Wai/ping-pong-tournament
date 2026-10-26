import type { Prisma, PrismaClient } from '@prisma/client';

/**
 * Ejecuta `work` de forma atómica: abre una transacción si recibe el cliente global
 * y se une a la que ya esté abierta si recibe el cliente de una transacción (Prisma
 * no admite transacciones anidadas). Así una función sirve igual de bien sola que
 * como parte de una operación mayor que decide dónde empieza y acaba el commit.
 */
export const inTransaction = <T>(
  client: PrismaClient | Prisma.TransactionClient,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> => ('$transaction' in client ? client.$transaction(work) : work(client));
