import { describe, it, expect, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { loadBaseData } from './baseData';

const prismaWith = (
  roles: { id: string; name: string }[],
  season: { id: string; name: string } | null,
) =>
  ({
    userType: { findMany: vi.fn().mockResolvedValue(roles) },
    season: { findFirst: vi.fn().mockResolvedValue(season) },
  }) as unknown as PrismaClient;

const ROLES = [
  { id: 'r-super', name: 'SuperAdmin' },
  { id: 'r-admin', name: 'AdminClub' },
  { id: 'r-player', name: 'Player' },
];
const SEASON = { id: 's1', name: 'Temporada 2026/2027' };

describe('loadBaseData', () => {
  it('devuelve los roles de AdminClub y Player y la temporada vigente', async () => {
    const result = await loadBaseData(prismaWith(ROLES, SEASON));

    expect(result).toEqual({ adminClubRoleId: 'r-admin', playerRoleId: 'r-player', currentSeason: SEASON });
  });

  it('pide la temporada marcada como vigente', async () => {
    const prisma = prismaWith(ROLES, SEASON);

    await loadBaseData(prisma);

    expect(prisma.season.findFirst).toHaveBeenCalledWith({ where: { isCurrent: true } });
  });

  it('falla indicando el seed base si no hay temporada vigente', async () => {
    await expect(loadBaseData(prismaWith(ROLES, null))).rejects.toThrow(/seed:base/);
  });

  it('falla indicando el seed base si falta un rol', async () => {
    await expect(loadBaseData(prismaWith([ROLES[2]], SEASON))).rejects.toThrow(/seed:base/);
  });
});
