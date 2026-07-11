import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const types = [
    { id: 1, name: 'Admin' },
    { id: 2, name: 'Player' },
  ];

  console.log('Sembrando tipos de usuario...');

  for (const type of types) {
    await prisma.userType.upsert({
      where: { id: type.id },
      update: {},
      create: type,
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
