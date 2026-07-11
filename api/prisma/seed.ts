import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const types = [{ name: 'Admin' }, { name: 'Player' }];

  console.log('Sembrando tipos de usuario...');

  for (const type of types) {
    await prisma.userType.upsert({
      where: { name: type.name }, // <-- Ahora buscamos por nombre
      update: {},
      create: type, // <-- Al crear, Prisma autogenerará el UUID
    });
  }

  console.log('¡Base de datos sembrada con éxito!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
