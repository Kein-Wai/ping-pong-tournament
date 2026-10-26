import { describe, it, expect, vi } from 'vitest';
import { resolveCurrentSeason, ensureCurrentSeason, getCurrentSeasonPeriod } from './season';

const buildPrisma = () => ({
  season: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    updateMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
});

describe('Temporadas (api/src/utils/season.ts)', () => {
  describe('getCurrentSeasonPeriod', () => {
    it('la temporada va de agosto a julio', () => {
      expect(getCurrentSeasonPeriod(new Date(2026, 9, 20)).name).toBe('Temporada 2026/2027');
      expect(getCurrentSeasonPeriod(new Date(2026, 7, 1)).name).toBe('Temporada 2026/2027');
    });

    it('antes de agosto pertenece a la temporada que empezo el ano pasado', () => {
      expect(getCurrentSeasonPeriod(new Date(2026, 2, 15)).name).toBe('Temporada 2025/2026');
      expect(getCurrentSeasonPeriod(new Date(2026, 6, 31)).name).toBe('Temporada 2025/2026');
    });
  });

  describe('resolveCurrentSeason (solo lectura)', () => {
    it('devuelve la temporada activa sin escribir en la base de datos', async () => {
      const prisma = buildPrisma();
      const { name } = getCurrentSeasonPeriod();
      prisma.season.findFirst.mockResolvedValue({ id: 's-1', name, isCurrent: true });

      const season = await resolveCurrentSeason(prisma as never);

      expect(season).toEqual({ id: 's-1', name, isCurrent: true });
      expect(prisma.season.updateMany).not.toHaveBeenCalled();
      expect(prisma.season.create).not.toHaveBeenCalled();
      expect(prisma.season.update).not.toHaveBeenCalled();
    });

    it('devuelve la temporada por nombre si la activa es de otra epoca', async () => {
      const prisma = buildPrisma();
      const { name } = getCurrentSeasonPeriod();
      prisma.season.findFirst.mockResolvedValue({ id: 's-old', name: 'Temporada 2020/2021' });
      prisma.season.findUnique.mockResolvedValue({ id: 's-new', name });

      const season = await resolveCurrentSeason(prisma as never);

      expect(season).toEqual({ id: 's-new', name });
      expect(prisma.season.updateMany).not.toHaveBeenCalled();
    });

    it('lanza un error claro si la temporada no existe', async () => {
      const prisma = buildPrisma();
      prisma.season.findFirst.mockResolvedValue(null);
      prisma.season.findUnique.mockResolvedValue(null);

      await expect(resolveCurrentSeason(prisma as never)).rejects.toThrow(/no existe/);
    });
  });

  describe('ensureCurrentSeason (escribe)', () => {
    it('crea la temporada vigente si no existe', async () => {
      const prisma = buildPrisma();
      const { name } = getCurrentSeasonPeriod();
      prisma.season.findFirst.mockResolvedValue(null);
      prisma.season.findUnique.mockResolvedValue(null);
      prisma.season.create.mockResolvedValue({ id: 's-new', name });

      const season = await ensureCurrentSeason(prisma as never);

      expect(season).toEqual({ id: 's-new', name });
      expect(prisma.season.create).toHaveBeenCalledOnce();
      expect(prisma.season.create.mock.calls[0][0].data.isCurrent).toBe(true);
    });

    it('en el cambio de temporada desactiva la anterior y activa la nueva', async () => {
      const prisma = buildPrisma();
      const { name } = getCurrentSeasonPeriod();
      prisma.season.findFirst.mockResolvedValue({ id: 's-old', name: 'Temporada 2020/2021' });
      prisma.season.findUnique.mockResolvedValue({ id: 's-new', name });
      prisma.season.update.mockResolvedValue({ id: 's-new', name, isCurrent: true });

      const season = await ensureCurrentSeason(prisma as never);

      expect(season).toEqual({ id: 's-new', name, isCurrent: true });
      expect(prisma.season.updateMany).toHaveBeenCalledWith({
        where: { isCurrent: true },
        data: { isCurrent: false },
      });
      expect(prisma.season.update).toHaveBeenCalledWith({
        where: { id: 's-new' },
        data: { isCurrent: true },
      });
    });

    it('no escribe nada si la temporada vigente ya esta activa', async () => {
      const prisma = buildPrisma();
      const { name } = getCurrentSeasonPeriod();
      prisma.season.findFirst.mockResolvedValue({ id: 's-1', name, isCurrent: true });

      await ensureCurrentSeason(prisma as never);

      expect(prisma.season.updateMany).not.toHaveBeenCalled();
      expect(prisma.season.create).not.toHaveBeenCalled();
    });
  });
});