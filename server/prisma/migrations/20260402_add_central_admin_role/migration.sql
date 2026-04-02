-- Migration: add_central_admin_role
-- Adds CENTRAL_ADMIN role, RestaurantOwner join table, and ownerEmail to Restaurant

-- 1. Add CENTRAL_ADMIN to the Role enum
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'CENTRAL_ADMIN';

-- 2. Add ownerEmail column to Restaurant
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "ownerEmail" TEXT;

-- 3. Create RestaurantOwner join table
CREATE TABLE IF NOT EXISTS "RestaurantOwner" (
    "id"           TEXT NOT NULL,
    "userId"       TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RestaurantOwner_pkey" PRIMARY KEY ("id")
);

-- 4. Unique constraint and indexes
CREATE UNIQUE INDEX IF NOT EXISTS "RestaurantOwner_userId_restaurantId_key"
    ON "RestaurantOwner"("userId", "restaurantId");

CREATE INDEX IF NOT EXISTS "RestaurantOwner_userId_idx"
    ON "RestaurantOwner"("userId");

CREATE INDEX IF NOT EXISTS "RestaurantOwner_restaurantId_idx"
    ON "RestaurantOwner"("restaurantId");

-- 5. Foreign keys
ALTER TABLE "RestaurantOwner"
    ADD CONSTRAINT "RestaurantOwner_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RestaurantOwner"
    ADD CONSTRAINT "RestaurantOwner_restaurantId_fkey"
    FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 6. Backfill: create RestaurantOwner rows for existing OWNER/ADMIN users
INSERT INTO "RestaurantOwner" ("id", "userId", "restaurantId", "createdAt")
SELECT
    gen_random_uuid()::text,
    u."id",
    u."restaurantId",
    NOW()
FROM "User" u
WHERE u."role" IN ('OWNER', 'ADMIN')
  AND u."restaurantId" IS NOT NULL
ON CONFLICT ("userId", "restaurantId") DO NOTHING;
