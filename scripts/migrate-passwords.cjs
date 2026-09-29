// One-time, idempotent migration. Run with the production DATABASE_URL after
// prisma db push. No passwords or hashes are logged. Defaults become NULL and
// need a super-admin-issued reset. Custom plaintext values become bcrypt.
require('dotenv').config({ path: '.env.local', quiet: true });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { randomBytes } = require('node:crypto');
const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');
const demo = new Set(['student123', 'parent123', 'admin123', 'ditmur2026']);
const hashed = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

async function migrate(label, model) {
  let disabled = 0, upgraded = 0, unchanged = 0;
  const rows = await model.findMany({ select: { id: true, password: true } });
  for (const row of rows) {
    if (!row.password || hashed.test(row.password)) { unchanged++; continue; }
    if (demo.has(row.password.toLowerCase())) {
      disabled++;
      if (apply) await model.update({ where: { id: row.id }, data: { password: null, mustChangePassword: true, sessionVersion: { increment: 1 } } });
    } else {
      upgraded++;
      if (apply) await model.update({ where: { id: row.id }, data: {
        password: await bcrypt.hash(row.password, 12), mustChangePassword: true, sessionVersion: { increment: 1 }
      } });
    }
  }
  console.log(`${label}: ${disabled} demo passwords to disable, ${upgraded} custom passwords to hash, ${unchanged} already safe/unset. ${apply ? 'Applied' : 'DRY RUN'}.`);
}
async function migrateLegacyUsers() {
  let disabled = 0, upgraded = 0, unchanged = 0;
  const users = await prisma.user.findMany({ select: { id: true, password: true } });
  for (const user of users) {
    if (hashed.test(user.password)) { unchanged++; continue; }
    const isDemo = demo.has(user.password.toLowerCase());
    if (isDemo) disabled++; else upgraded++;
    // The legacy User table is no longer used to sign in. Its password column
    // is required, so replace published defaults with unguessable hashes.
    if (apply) await prisma.user.update({ where: { id: user.id }, data: {
      password: await bcrypt.hash(isDemo ? randomBytes(18).toString('base64url') : user.password, 12)
    } });
  }
  console.log(`Legacy Users: ${disabled} demo passwords disabled, ${upgraded} custom passwords hashed, ${unchanged} already hashed. ${apply ? 'Applied' : 'DRY RUN'}.`);
}
async function main() {
  if (!process.env.DATABASE_URL) throw Error('DATABASE_URL is required. No changes made.');
  await migrate('Students', prisma.student);
  await migrate('Parents', prisma.parent);
  await migrateLegacyUsers();
  if (!apply) console.log('No data changed. Run again with --apply after checking the counts and preparing password resets.');
}
main().catch(error => { console.error('Migration failed:', error.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
