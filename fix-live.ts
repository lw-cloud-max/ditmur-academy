import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const c = await prisma.class.findMany();
  console.log("Found classes:", c.length);
}

main().finally(() => prisma.$disconnect())
