/**
 * createApp.js — builds the Express app without starting a TCP server.
 *
 * Key: prisma.js is CJS and uses global.prisma as a singleton.
 * We must set global.prisma BEFORE any require() call loads prisma.js.
 * Since ESM imports are hoisted, we use a lazy loader pattern instead.
 */

import express from "express";
import cors    from "cors";
import { vi } from "vitest";
import { errorHandler } from "../../middleware/errorHandler.js";

// ── Helper to create a mock prisma model ──────────────────────────────────────
function mockModel() {
  return {
    findUnique:  vi.fn().mockResolvedValue(null),
    findMany:    vi.fn().mockResolvedValue([]),
    findFirst:   vi.fn().mockResolvedValue(null),
    create:      vi.fn().mockResolvedValue({}),
    update:      vi.fn().mockResolvedValue({}),
    updateMany:  vi.fn().mockResolvedValue({ count: 0 }),
    upsert:      vi.fn().mockResolvedValue({}),
    delete:      vi.fn().mockResolvedValue({}),
    count:       vi.fn().mockResolvedValue(0),
    aggregate:   vi.fn().mockResolvedValue({ _sum: { totalPrice: 0 } }),
    groupBy:     vi.fn().mockResolvedValue([]),
  };
}

// ── The shared mock prisma instance (exported so tests can configure it) ──────
export const mockPrisma = {
  user:             mockModel(),
  restaurant:       mockModel(),
  order:            mockModel(),
  menuItem:         mockModel(),
  featureToggle:    mockModel(),
  passwordResetOtp: mockModel(),
  activityLog:      mockModel(),
  supportTicket:    mockModel(),
  announcement:     mockModel(),
  $queryRaw:        vi.fn().mockResolvedValue([{ "?column?": 1 }]),
  $transaction:     vi.fn().mockResolvedValue([]),
  $disconnect:      vi.fn(),
};

// ── Inject mock into the CJS global BEFORE prisma.js singleton is read ────────
// prisma.js: const prisma = globalForPrisma.prisma ?? new PrismaClient(...)
// Setting global.prisma here ensures the singleton uses our mock.
//
// IMPORTANT: This must happen before any route/controller module that
// requires('../../lib/prisma') is loaded. Since ESM imports are hoisted,
// we need to ensure routes are loaded AFTER this assignment. Since this
// module is imported by test files (which use vi.mock for @prisma/client too),
// and Vitest processes setupFiles first, this executes early enough.
globalThis.prisma = mockPrisma;

// ── Route imports happen AFTER globalThis.prisma is set ───────────────────────
// Note: Dynamic imports cannot be used at top level in ESM without await,
// so we use createApp() as a factory that loads routes lazily via require().

// Load routes via Node's require so we control ordering
import { createRequire } from "module";
import { fileURLToPath } from "url";
import path from "path";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  // Load routes fresh each time (they use the global mock prisma)
  const authRoutes       = require("../../routes/auth.js");
  const menuRoutes       = require("../../routes/menu.js");
  const orderRoutes      = require("../../routes/order.js");
  const otpRoutes        = require("../../routes/otp.js");
  const superAdminRoutes = require("../../routes/superAdmin.js");
  const featuresRoutes   = require("../../routes/features.js");
  const restaurantRoutes = require("../../routes/restaurant.js");

  const app = express();

  const stubbedIo = { emit: () => {}, to: () => ({ emit: () => {} }) };
  app.set("io", stubbedIo);

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use("/api/auth",       authRoutes);
  app.use("/api/menu",       menuRoutes);
  app.use("/api/orders",     orderRoutes);
  app.use("/api/otp",        otpRoutes);
  app.use("/api/super",      superAdminRoutes);
  app.use("/api/features",   featuresRoutes);
  app.use("/api/restaurant", restaurantRoutes);

  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.use((_req, res) => res.status(404).json({ message: "Route not found" }));
  app.use((err, req, res, next) => errorHandler(err, req, res, next));

  return app;
}
