#!/usr/bin/env node
/**
 * run-migration.js — Apply the Central Admin schema migration
 *
 * Run this from your Mac Terminal:
 *   cd /Users/aashishnepal/Documents/smart-order/server
 *   node scripts/run-migration.js
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Applying Central Admin schema migration...\n');

  const run = async (label, sql) => {
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log(`  ✅ ${label}`);
    } catch (e) {
      const msg = e.message?.split('\n')[0] || e.message;
      console.log(`  ⚠️  ${label}: ${msg}`);
    }
  };

  await run('CENTRAL_ADMIN enum value',
    `ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'CENTRAL_ADMIN'`);

  await run('ownerEmail column on Restaurant',
    `ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "ownerEmail" TEXT`);

  await run('RestaurantOwner table', `
    CREATE TABLE IF NOT EXISTS "RestaurantOwner" (
      "id"           TEXT NOT NULL,
      "userId"       TEXT NOT NULL,
      "restaurantId" TEXT NOT NULL,
      "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "RestaurantOwner_pkey" PRIMARY KEY ("id")
    )`);

  await run('Unique constraint (userId, restaurantId)',
    `CREATE UNIQUE INDEX IF NOT EXISTS "RestaurantOwner_userId_restaurantId_key" ON "RestaurantOwner"("userId","restaurantId")`);

  await run('Index on userId',
    `CREATE INDEX IF NOT EXISTS "RestaurantOwner_userId_idx" ON "RestaurantOwner"("userId")`);

  await run('Index on restaurantId',
    `CREATE INDEX IF NOT EXISTS "RestaurantOwner_restaurantId_idx" ON "RestaurantOwner"("restaurantId")`);

  await run('FK: userId → User.id', `
    ALTER TABLE "RestaurantOwner"
      ADD CONSTRAINT "RestaurantOwner_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`);

  await run('FK: restaurantId → Restaurant.id', `
    ALTER TABLE "RestaurantOwner"
      ADD CONSTRAINT "RestaurantOwner_restaurantId_fkey"
      FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE`);

  await run('Backfill existing OWNER/ADMIN users into RestaurantOwner', `
    INSERT INTO "RestaurantOwner" ("id","userId","restaurantId","createdAt")
    SELECT gen_random_uuid()::text, u."id", u."restaurantId", NOW()
    FROM "User" u
    WHERE u."role" IN ('OWNER','ADMIN')
      AND u."restaurantId" IS NOT NULL
    ON CONFLICT ("userId","restaurantId") DO NOTHING`);

  console.log('\n🎉 Migration complete! Restart your server: npm run dev\n');
}

main()
  .catch(e => { console.error('\n❌ Migration failed:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
