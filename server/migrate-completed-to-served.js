/**
 * One-time migration: rename COMPLETED → SERVED in the OrderStatus enum.
 * Run BEFORE prisma db push.
 * Steps:
 *  1. Add SERVED to the enum (raw SQL)
 *  2. Update all COMPLETED rows to SERVED
 *  3. prisma db push will then drop COMPLETED safely
 */
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  console.log('Step 1: Adding SERVED to the enum (raw SQL)...');
  await prisma.$executeRawUnsafe(`ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'SERVED';`);
  console.log('  Done.');

  console.log('Step 2: Updating COMPLETED rows to SERVED...');
  const result = await prisma.$executeRaw`UPDATE "Order" SET status = 'SERVED' WHERE status = 'COMPLETED'`;
  console.log(`  Updated ${result} row(s).`);

  console.log('Migration complete. Now run: npx prisma db push');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
