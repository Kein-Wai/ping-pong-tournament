import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { loadBaseData } from './baseData';
import { describeDatabase } from './safety';
import { clearDemoContent } from './demo/cleanup';
import { createEvents, createTeams, createTrainings } from './demo/clubLife';
import {
  createAnalysisMatches,
  createPersonalPlan,
  ensureExerciseCatalog,
} from './demo/ownerData';
import { NAMED_PLAYER_EMAILS, createNamedPlayers, createRandomPlayers } from './demo/players';
import { createRng } from './demo/random';
import { createDemoTournament } from './demo/tournamentEngine';
import { DEMO_TOURNAMENTS } from './demo/tournamentSpecs';

/**
 * SEED DEMO: refresca el club demo EN SU SITIO. No vacía la base: borra y regenera solo
 * el contenido del club demo (ver `demo/cleanup.ts`) y es seguro repetirlo, también en
 * producción. Necesita los datos base (`npm run seed:base`).
 *
 * El club, su admin y las dos cuentas con login propio conservan su id, así que las
 * sesiones abiertas siguen valiendo. Si la regeneración falla a medias, basta con repetir.
 */
// El tope por defecto (5 s) caduca al generar grupos contra una base remota: cada escritura
// de la transacción suma latencia y falla con "Transaction not found".
const prisma = new PrismaClient({ transactionOptions: { maxWait: 10_000, timeout: 120_000 } });

const DEMO_CLUB_NAME = '(DEMO) Club Tenis de Mesa Castellón';
const DEMO_ADMIN_EMAIL = 'admin@castellon.local';
// Contraseña de las cuentas demo, conocida a propósito. Solo se aplica al crear una cuenta;
// una cuenta existente conserva la suya.
const DEMO_PASSWORD = '112233cheung';

// Semilla fija: cada ejecución genera exactamente los mismos jugadores y resultados.
const DEMO_SEED = 20261029;

/** El club demo se actualiza si existe (conserva su id) y se crea si no. */
const ensureDemoClub = async () => {
  const data = { status: 'Aprobado' as const, city: 'Castellon de la Plana' };
  const existing = await prisma.club.findFirst({ where: { name: DEMO_CLUB_NAME } });
  if (existing) return prisma.club.update({ where: { id: existing.id }, data });
  return prisma.club.create({ data: { name: DEMO_CLUB_NAME, ...data } });
};

/**
 * Las cuentas con login propio se actualizan en su sitio; si una de ellas pertenece a otro
 * club, el seed se detiene en vez de arrastrarla al demo.
 */
const assertNamedAccountsFree = async (clubId: string) => {
  const elsewhere = await prisma.user.findMany({
    where: {
      email: { in: [...NAMED_PLAYER_EMAILS] },
      AND: [{ clubId: { not: null } }, { clubId: { not: clubId } }],
    },
    select: { email: true },
  });
  if (elsewhere.length > 0) {
    throw new Error(
      `Estas cuentas pertenecen a otro club y el seed demo no las mueve: ${elsewhere
        .map((user) => user.email)
        .join(', ')}.`,
    );
  }
};

async function main() {
  console.log(`🎯 Base de datos: ${describeDatabase(process.env.DATABASE_URL)}`);
  const { adminClubRoleId, playerRoleId, currentSeason } = await loadBaseData(prisma);
  const rng = createRng(DEMO_SEED);
  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);

  console.log('🏢 Preparando el club demo...');
  const club = await ensureDemoClub();
  await assertNamedAccountsFree(club.id);

  await prisma.user.upsert({
    where: { email: DEMO_ADMIN_EMAIL },
    update: { clubId: club.id, clubStatus: 'Aprobado', userTypeId: adminClubRoleId },
    create: {
      email: DEMO_ADMIN_EMAIL,
      name: 'Admin',
      surname: 'Castellón',
      userTypeId: adminClubRoleId,
      password: hashedPassword,
      clubId: club.id,
      clubStatus: 'Aprobado',
      authProvider: 'LOCAL',
      active: true,
    },
  });

  console.log('🧹 Borrando el contenido anterior del club demo...');
  await clearDemoContent(prisma, club.id, NAMED_PLAYER_EMAILS);

  console.log('👥 Generando jugadores demo (2 con login propio + 60 aleatorios)...');
  const playerContext = {
    prisma,
    rng,
    seasonId: currentSeason.id,
    clubId: club.id,
    playerRoleId,
    hashedPassword,
  };
  const [keinWai] = await createNamedPlayers(playerContext);
  await createRandomPlayers(playerContext);

  const clubContext = { prisma, rng, seasonId: currentSeason.id, clubId: club.id };

  console.log('\n📊 Generando análisis, catálogo de ejercicios y plan personal...');
  await createAnalysisMatches(clubContext, keinWai.id);
  const exercises = await ensureExerciseCatalog(prisma, club.id);
  await createPersonalPlan(clubContext, keinWai.id, exercises);

  // Los torneos se juegan por el mismo camino que la API: stats, ELO y tablas reales.
  console.log('\n🏆 Generando torneos en distintos estados...');
  for (const spec of DEMO_TOURNAMENTS) {
    await createDemoTournament(clubContext, spec);
  }

  console.log('\n📅 Generando entrenamientos grupales (sep – nov)...');
  await createTrainings(clubContext);

  console.log('\n🗓️ Generando calendario oficial...');
  await createEvents(clubContext, keinWai.id);

  console.log('\n🏓 Generando equipos y partidos...');
  await createTeams(clubContext);

  console.log('\n✅ Club demo actualizado.');
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
