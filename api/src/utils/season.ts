import { PrismaClient } from '@prisma/client';

export const getCurrentSeason = async (prisma: PrismaClient) => {
  // 1. Calculamos cómo debería llamarse la temporada HOY
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0 = Enero, 7 = Agosto

  // Si estamos en Agosto (7) o más, la temporada empieza este año. Si estamos antes, empezó el año pasado.
  const startYear = currentMonth >= 7 ? currentYear : currentYear - 1;
  const endYear = startYear + 1;
  const seasonName = `Temporada ${startYear}/${endYear}`;

  // 2. Buscamos la temporada que actualmente está marcada como activa en BD
  let activeSeason = await prisma.season.findFirst({
    where: { isCurrent: true },
  });

  // 3. CASO NORMAL: La temporada activa es la correcta, la devolvemos inmediatamente
  if (activeSeason && activeSeason.name === seasonName) {
    return activeSeason;
  }

  // 4. CAMBIO DE TEMPORADA: Ha llegado el 1 de Agosto (o es la primera vez que arrancamos la app)
  // Desactivamos cualquier temporada que estuviera como actual
  await prisma.season.updateMany({
    where: { isCurrent: true },
    data: { isCurrent: false },
  });

  // Comprobamos si por algún casual la temporada ya existía pero estaba apagada
  let targetSeason = await prisma.season.findUnique({
    where: { name: seasonName },
  });

  if (targetSeason) {
    targetSeason = await prisma.season.update({
      where: { id: targetSeason.id },
      data: { isCurrent: true },
    });
    return targetSeason;
  }

  // 5. ¡CREACIÓN AUTOMÁTICA! Creamos la temporada desde cero
  // Fecha UTC exacta: 1 de Agosto a las 00:00:00 hasta el 31 de Julio a las 23:59:59
  const startDate = new Date(Date.UTC(startYear, 7, 1, 0, 0, 0));
  const endDate = new Date(Date.UTC(endYear, 6, 31, 23, 59, 59, 999));

  targetSeason = await prisma.season.create({
    data: {
      name: seasonName,
      startDate,
      endDate,
      isCurrent: true,
    },
  });

  console.log(`🎉 ¡Nueva temporada iniciada automáticamente: ${seasonName}!`);

  return targetSeason;
};
