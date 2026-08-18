import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

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

  const adminPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@ditmur.com' },
    update: {
      name: 'System Admin',
      password: adminPassword,
      role: 'ADMIN',
    },
    create: {
      email: 'admin@ditmur.com',
      name: 'System Admin',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  const jss1 = await prisma.class.findUnique({ where: { name: 'JSS 1' } });
  if (jss1) {
    const parent = await prisma.parent.upsert({
      where: { id: 'demo-parent-1' },
      update: {
        fullName: 'Demo Parent',
        email: 'parent@ditmur.com',
        phone: '08030000001',
        password: await bcrypt.hash('parent123', 10),
      },
      create: {
        id: 'demo-parent-1',
        fullName: 'Demo Parent',
        email: 'parent@ditmur.com',
        phone: '08030000001',
        password: await bcrypt.hash('parent123', 10),
      },
    });

    await prisma.student.upsert({
      where: { id: 'DIT/STU/001' },
      update: {
        firstName: 'Demo',
        lastName: 'Student',
        dob: new Date('2012-01-15'),
        gender: 'MALE',
        classId: jss1.id,
        parentId: parent.id,
        password: await bcrypt.hash('student123', 10),
      },
      create: {
        id: 'DIT/STU/001',
        firstName: 'Demo',
        lastName: 'Student',
        dob: new Date('2012-01-15'),
        gender: 'MALE',
        classId: jss1.id,
        parentId: parent.id,
        password: await bcrypt.hash('student123', 10),
      },
    });
  }

  console.log('Default classes and login accounts seeded!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
