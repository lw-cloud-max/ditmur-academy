import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const defaultClasses = [
    { name: 'Preparatory', level: 'Pre-Primary' },
    { name: 'Reception', level: 'Pre-Primary' },
    { name: 'Nursery 1', level: 'Pre-Primary' },
    { name: 'Nursery 2', level: 'Pre-Primary' },
    { name: 'KG', level: 'Pre-Primary' },
    { name: 'Year 1', level: 'Primary' },
    { name: 'Year 2', level: 'Primary' },
    { name: 'Year 3', level: 'Primary' },
    { name: 'Year 4', level: 'Primary' },
    { name: 'Year 5', level: 'Primary' },
    { name: 'JSS 1', level: 'Junior Secondary' },
    { name: 'JSS 2', level: 'Junior Secondary' },
    { name: 'JSS 3', level: 'Junior Secondary' },
    { name: 'SSS 1', level: 'Senior Secondary' },
    { name: 'SSS 2', level: 'Senior Secondary' },
    { name: 'SSS 3', level: 'Senior Secondary' },
  ];

  for (const c of defaultClasses) {
    await prisma.class.upsert({
      where: { name: c.name },
      update: {},
      create: { name: c.name, level: c.level },
    });
  }
  console.log("Default classes seeded!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
