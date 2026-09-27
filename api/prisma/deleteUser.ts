import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 👇 Pon aquí el correo de la cuenta que quieres fulminar
const EMAIL_A_BORRAR = 'keinwai@hotmail.com';

async function main() {
  console.log(`Buscando a ${EMAIL_A_BORRAR}...`);

  const user = await prisma.user.findUnique({
    where: { email: EMAIL_A_BORRAR },
  });

  if (!user) {
    console.log('❌ El usuario no existe o ya fue borrado.');
    return;
  }

  console.log(`✅ Usuario encontrado (ID: ${user.id}). Borrando su rastro...`);

  try {
    // Usamos una transacción para borrar todo el historial en orden antes de borrar al usuario
    await prisma.$transaction([
      prisma.stats.deleteMany({ where: { userId: user.id } }),
      prisma.playerSkills.deleteMany({ where: { userId: user.id } }),
      prisma.playerSkillUpdate.deleteMany({ where: { playerId: user.id } }),
      prisma.tournamentParticipant.deleteMany({ where: { playerId: user.id } }),
      prisma.tournamentClas.deleteMany({ where: { playerId: user.id } }),
      prisma.tournamentGroupClas.deleteMany({ where: { playerId: user.id } }),
      prisma.generalTrainingAttendance.deleteMany({ where: { playerId: user.id } }),
      prisma.eventReminder.deleteMany({ where: { userId: user.id } }),
      prisma.teamMatchAvailability.deleteMany({ where: { playerId: user.id } }),
      prisma.playerTraining.deleteMany({ where: { playerId: user.id } }),
      prisma.manualMatch.deleteMany({ where: { userId: user.id } }),

      // El golpe final:
      prisma.user.delete({ where: { id: user.id } }),
    ]);

    console.log(`✅ ¡Eliminado por completo con todas sus dependencias!`);
  } catch (error) {
    console.error(`❌ Error al borrar dependencias:`, error);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
