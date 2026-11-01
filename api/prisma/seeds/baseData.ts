import type { PrismaClient } from '@prisma/client';

export interface BaseData {
  adminClubRoleId: string;
  playerRoleId: string;
  currentSeason: { id: string; name: string };
}

/**
 * Lo que el seed base deja creado y los demás seeds dan por hecho: roles y temporada
 * vigente. Si falta, el error dice qué hacer en vez de fallar más tarde con un
 * `undefined` dentro de un `create`.
 */
export const loadBaseData = async (prisma: PrismaClient): Promise<BaseData> => {
  const [roles, currentSeason] = await Promise.all([
    prisma.userType.findMany({ where: { name: { in: ['AdminClub', 'Player'] } } }),
    prisma.season.findFirst({ where: { isCurrent: true } }),
  ]);
  const adminClubRoleId = roles.find((role) => role.name === 'AdminClub')?.id;
  const playerRoleId = roles.find((role) => role.name === 'Player')?.id;

  if (!adminClubRoleId || !playerRoleId || !currentSeason) {
    throw new Error(
      'Faltan los datos base (roles o temporada vigente). Ejecuta primero `npm run seed:base`.',
    );
  }
  return { adminClubRoleId, playerRoleId, currentSeason };
};
