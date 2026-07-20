import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const c = await prisma.student.count();
  console.log("Students count:", c);
}
main();
