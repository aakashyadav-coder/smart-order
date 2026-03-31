/**
 * Prisma client singleton — import this everywhere instead of new PrismaClient().
 * A single connection pool shared across all modules prevents exhausting
 * the database connection limit (default: 10 connections per pool × 8 modules = 80).
 */
const { PrismaClient } = require("@prisma/client");

const globalForPrisma = global;

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;
