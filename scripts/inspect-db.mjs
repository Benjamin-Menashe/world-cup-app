import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const haaland = await prisma.player.findMany({
    where: { name: { contains: 'Haaland', mode: 'insensitive' } }
  });
  console.log('Haaland in DB:', haaland);

  const just = await prisma.player.findMany({
    where: { name: { contains: 'Just', mode: 'insensitive' } }
  });
  console.log('Just in DB:', just);

  await prisma.$disconnect();
}

main().catch(console.error);
