import bcrypt from 'bcryptjs';
import { PrismaClient, TypeUser } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('112233@Club', 10);
  await prisma.user.update({
    where: { email: 'admin@castellon.local' },
    data: { password: hashedPassword },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
