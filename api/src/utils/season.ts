import { Prisma, PrismaClient, Season } from '@prisma/client';

/**
 * Periodo de la temporada vigente. La temporada va del 1 de agosto al 31 de julio.
 */
export interface SeasonPeriod {
  name: string;
  startYear: number;
  endYear: number;
}

/**
 * Calcula el periodo de temporada vigente según la fecha actual.
 */
export const getCurrentSeasonPeriod = (now: Date = new Date()): SeasonPeriod => {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0 = Enero, 7 = Agosto
  const startYear = currentMonth >= 7 ? currentYear : currentYear - 1;
  const endYear = startYear + 1;

  return { name: `Temporada ${startYear}/${endYear}`, startYear, endYear };
};

/**
 * Resuelve la temporada vigente SIN escribir en la base de datos.
 *
 * Falla si la temporada no existe: su creacion es responsabilidad de
 * ensureCurrentSeason(), que se ejecuta una unica vez al arrancar la app.
 */
export const resolveCurrentSeason = async (prisma: Prisma.TransactionClient): Promise<Season> => {
  const { name } = getCurrentSeasonPeriod();

  const activeSeason = await prisma.season.findFirst({ where: { isCurrent: true } });
  if (activeSeason && activeSeason.name === name) {
    return activeSeason;
  }

  const targetSeason = await prisma.season.findUnique({ where: { name } });
  if (!targetSeason) {
    throw new Error(
      `La temporada ${name} no existe. La aplicacion no se ha inicializado correctamente.`,
    );
  }

  return targetSeason;
};

/**
 * Garantiza que exista y este marcada como actual la temporada vigente.
 * ESCRIBE en la base de datos: debe llamarse una sola vez, al arrancar.
 */
export const ensureCurrentSeason = async (prisma: PrismaClient): Promise<Season> => {
  const { name, startYear, endYear } = getCurrentSeasonPeriod();

  const activeSeason = await prisma.season.findFirst({ where: { isCurrent: true } });
  if (activeSeason && activeSeason.name === name) {
    return activeSeason;
  }

  // Cambio de temporada: desactivamos la anterior.
  await prisma.season.updateMany({ where: { isCurrent: true }, data: { isCurrent: false } });

  const existingSeason = await prisma.season.findUnique({ where: { name } });
  if (existingSeason) {
    return prisma.season.update({ where: { id: existingSeason.id }, data: { isCurrent: true } });
  }

  // Primera vez: creamos la temporada desde cero.
  const startDate = new Date(Date.UTC(startYear, 7, 1, 0, 0, 0));
  const endDate = new Date(Date.UTC(endYear, 6, 31, 23, 59, 59, 999));

  const createdSeason = await prisma.season.create({
    data: { name, startDate, endDate, isCurrent: true },
  });

  console.info(`🎉 ¡Nueva temporada iniciada automaticamente: ${name}`);

  return createdSeason;
};
