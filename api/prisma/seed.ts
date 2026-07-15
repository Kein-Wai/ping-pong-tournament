import { PrismaClient } from '@prisma/client';
import { BYE_USER_ID, TBD_USER_ID } from '../src/constants';

const prisma = new PrismaClient();

async function main() {
  const types = [{ name: 'Admin' }, { name: 'Player' }];
  console.log('Sembrando tipos de usuario...');
  let savedTypes = [];

  for (const type of types) {
    savedTypes.push(
      await prisma.userType.upsert({
        where: { name: type.name }, // <-- Ahora buscamos por nombre
        update: {},
        create: type, // <-- Al crear, Prisma autogenerará el UUID
      }),
    );
  }
  console.log(savedTypes[1]);

  const byeUser = await prisma.user.upsert({
    where: { id: BYE_USER_ID },
    update: {}, // Si ya existe, no lo tocamos
    create: {
      id: BYE_USER_ID,
      email: 'exento@torneo.local', // Un email que nunca existirá en la vida real
      name: 'EXENTO',
      surname: '(Pasa de ronda)',
      // Según tu esquema de autenticación anterior, puede que necesites estos:
      userTypeId: savedTypes[1].id,
      // password: 'no-se-puede-loguear-123!',
      // ELO 0 es perfecto para que no ensucie tus estadísticas reales
    },
  });

  const tbdUser = await prisma.user.upsert({
    where: { id: TBD_USER_ID },
    update: {},
    create: {
      id: TBD_USER_ID,
      email: 'tbd@torneo.local',
      name: 'Por',
      surname: 'Determinar',
      userTypeId: savedTypes[1].id,
    },
  });

  console.log('👻 Jugador Fantasma (BYE) asegurado en la base de datos:', byeUser.id);
  console.log('Jugador TBD asegurado en la base de datos:', tbdUser.id);

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
