import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Rango de edades deseadas
const MIN_AGE = 8;
const MAX_AGE = 70;

// Para que los números cuadren en relación al año actual (2026)
const CURRENT_YEAR = new Date().getFullYear();

const getRandomBirthDate = () => {
  // Calculamos una edad aleatoria entre 8 y 70
  const randomAge = Math.floor(Math.random() * (MAX_AGE - MIN_AGE + 1)) + MIN_AGE;

  // Calculamos el año de nacimiento
  const birthYear = CURRENT_YEAR - randomAge;

  // Mes y día aleatorios
  const randomMonth = Math.floor(Math.random() * 12); // 0 a 11
  const randomDay = Math.floor(Math.random() * 28) + 1; // 1 a 28 (para evitar problemas con febrero)

  return new Date(Date.UTC(birthYear, randomMonth, randomDay));
};

async function main() {
  console.log('🔄 Buscando el Club "Club Tenis de Mesa Castellón"...');

  const club = await prisma.club.findFirst({
    where: { name: 'Club Tenis de Mesa Castellón' },
  });

  if (!club) {
    console.error('❌ No se ha encontrado el club especificado.');
    process.exit(1);
  }

  console.log(`✅ Club encontrado: ${club.id}. Buscando jugadores sin edad...`);

  // Buscamos a los jugadores del club que tengan birthDate en nulo
  const players = await prisma.user.findMany({
    where: {
      clubId: club.id,
      birthDate: null,
      userType: { name: 'Player' }, // Nos aseguramos de no tocar a los admins
    },
  });

  if (players.length === 0) {
    console.log('✨ Todos los jugadores de este club ya tienen una fecha de nacimiento asignada.');
    return;
  }

  console.log(`⏳ Se van a actualizar ${players.length} jugadores...`);

  // Usamos una transacción para actualizar a todos los jugadores de golpe de forma segura
  let count = 0;
  await prisma.$transaction(
    players.map((player) => {
      count++;
      return prisma.user.update({
        where: { id: player.id },
        data: { birthDate: getRandomBirthDate() },
      });
    }),
  );

  console.log(
    `🎉 ¡Éxito! Se han asignado fechas de nacimiento aleatorias (8-70 años) a ${count} jugadores.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
