import { PrismaClient, TypeUser } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { BYE_USER_ID, TBD_USER_ID } from '../../src/constants';
import { assertWipeConfirmed, describeDatabase, requireEnv } from './safety';

/**
 * SEED BASE: vacía la base de datos ENTERA y deja solo lo imprescindible (roles,
 * temporada vigente, SuperAdmin y usuarios del sistema). Es para formatear del todo;
 * para refrescar el club demo en producción usa `seed:demo`, que no borra nada ajeno.
 *
 *   SEED_CONFIRM_WIPE=yes SEED_SUPERADMIN_PASSWORD=... npm run seed:base
 */
const prisma = new PrismaClient();

const SUPERADMIN_EMAIL = 'keinwaisuperadmin@hotmail.com';

/**
 * Vacía todas las tablas menos el historial de migraciones. Se lee la lista de la
 * base en vez de enumerarla a mano: así una tabla nueva no se queda sin borrar y
 * rompe el seed con una clave foránea. Los nombres salen del catálogo de Postgres,
 * no de una entrada de usuario.
 */
const wipeDatabase = async () => {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length === 0) return;

  const list = tables.map(({ tablename }) => `"${tablename.replaceAll('"', '""')}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
};

async function main() {
  // Se comprueba todo lo necesario ANTES de borrar: no se vacía la base para fallar después.
  assertWipeConfirmed(process.env);
  const superAdminPassword = requireEnv(process.env, 'SEED_SUPERADMIN_PASSWORD');

  console.log(`🎯 Base de datos: ${describeDatabase(process.env.DATABASE_URL)}`);
  console.log('🧹 Vaciando la base de datos entera...');
  await wipeDatabase();

  console.log('🌱 Creando datos base...');
  await prisma.userType.createMany({
    data: [
      { name: TypeUser.SuperAdmin },
      { name: TypeUser.AdminClub },
      { name: TypeUser.Player },
    ],
  });
  const playerRole = await prisma.userType.findUniqueOrThrow({ where: { name: TypeUser.Player } });
  const superAdminRole = await prisma.userType.findUniqueOrThrow({
    where: { name: TypeUser.SuperAdmin },
  });

  await prisma.season.create({
    data: {
      name: 'Temporada 2026/2027',
      startDate: new Date('2026-08-01T00:00:00Z'),
      endDate: new Date('2027-07-31T23:59:59Z'),
      isCurrent: true,
    },
  });

  await prisma.user.create({
    data: {
      email: SUPERADMIN_EMAIL,
      name: 'Kein-Wai',
      surname: 'Cheung',
      nickname: 'SuperAdmin',
      userTypeId: superAdminRole.id,
      password: await bcrypt.hash(superAdminPassword, 10),
      authProvider: 'LOCAL',
      active: true,
    },
  });

  // Usuarios del sistema que usan los cuadros de torneo (EXENTO y Por determinar).
  await prisma.user.createMany({
    data: [
      {
        id: BYE_USER_ID,
        email: 'exento@torneo.local',
        name: 'EXENTO',
        surname: '(Pasa de ronda)',
        userTypeId: playerRole.id,
        active: true,
      },
      {
        id: TBD_USER_ID,
        email: 'tbd@torneo.local',
        name: 'Por',
        surname: 'Determinar',
        userTypeId: playerRole.id,
        active: true,
      },
    ],
  });

  console.log('✅ Seed base listo. Siguiente: `npm run seed:demo` y/o `npm run seed:ctm`.');
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
